/**
 * Unit tests for LWW conflict resolution
 * Phase 6.4: Conflict Resolution Tests
 */

import {
  shouldUpdate,
  logConflict,
  resolveNoteConflict,
  resolveRelationConflict,
  resolveReflectionConflict,
  getConflictLogs,
  clearOldConflictLogs,
} from './conflict';
import { getDatabase, closeDatabase } from '../database/connection';
import { initializeSchema, dropAllTables } from '../database/schema';
import type { Note, Relation, Reflection } from '../../types';

describe('Conflict Resolution - shouldUpdate()', () => {
  describe('Rule 1: updated_at comparison', () => {
    it('should return true when remote.updated_at > local.updated_at', () => {
      const local = { updated_at: '2025-01-10T10:00:00.000Z', id: 'A' };
      const remote = { updated_at: '2025-01-10T11:00:00.000Z', id: 'B' };

      expect(shouldUpdate(local, remote)).toBe(true);
    });

    it('should return false when remote.updated_at < local.updated_at', () => {
      const local = { updated_at: '2025-01-10T11:00:00.000Z', id: 'A' };
      const remote = { updated_at: '2025-01-10T10:00:00.000Z', id: 'B' };

      expect(shouldUpdate(local, remote)).toBe(false);
    });
  });

  describe('Rule 2: server_timestamp comparison (when updated_at equal)', () => {
    it('should return true when remote.server_timestamp > local.server_timestamp', () => {
      const local = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:01.000Z',
        id: 'A',
      };
      const remote = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:02.000Z',
        id: 'B',
      };

      expect(shouldUpdate(local, remote)).toBe(true);
    });

    it('should return false when remote.server_timestamp < local.server_timestamp', () => {
      const local = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:02.000Z',
        id: 'A',
      };
      const remote = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:01.000Z',
        id: 'B',
      };

      expect(shouldUpdate(local, remote)).toBe(false);
    });

    it('should use updated_at as fallback when server_timestamp missing', () => {
      const local = {
        updated_at: '2025-01-10T10:00:00.000Z',
        id: 'A',
      };
      const remote = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:01.000Z',
        id: 'B',
      };

      expect(shouldUpdate(local, remote)).toBe(true);
    });
  });

  describe('Rule 3: entity_id lexicographic comparison (when all timestamps equal)', () => {
    it('should return true when remote.id > local.id', () => {
      const local = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:00.000Z',
        id: 'A',
      };
      const remote = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:00.000Z',
        id: 'B',
      };

      expect(shouldUpdate(local, remote)).toBe(true);
    });

    it('should return false when remote.id < local.id', () => {
      const local = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:00.000Z',
        id: 'B',
      };
      const remote = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:00.000Z',
        id: 'A',
      };

      expect(shouldUpdate(local, remote)).toBe(false);
    });

    it('should handle Reflection entities with date field', () => {
      const local = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:00.000Z',
        date: '2025-01-10',
      };
      const remote = {
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:00.000Z',
        date: '2025-01-11',
      };

      expect(shouldUpdate(local, remote)).toBe(true);
    });
  });
});

describe('Conflict Resolution - Database Operations', () => {
  beforeEach(async () => {
    const db = await getDatabase();
    await dropAllTables(db);
    await initializeSchema(db);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('logConflict()', () => {
    it('should log conflict to conflict_log table', async () => {
      const localData = { id: '1', body: 'Local note', updated_at: '2025-01-10T10:00:00.000Z' };
      const remoteData = { id: '1', body: 'Remote note', updated_at: '2025-01-10T11:00:00.000Z' };

      await logConflict('note', '1', localData, remoteData, 'remote_wins');

      const db = await getDatabase();
      const result = await db.getAllAsync(
        `SELECT * FROM conflict_log WHERE entity_id = ?`,
        ['1']
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        entity_type: 'note',
        entity_id: '1',
        resolution: 'remote_wins',
      });
      expect(JSON.parse(result[0].local_data as string)).toEqual(localData);
      expect(JSON.parse(result[0].remote_data as string)).toEqual(remoteData);
    });

    it('should handle multiple conflict logs', async () => {
      await logConflict('note', '1', { id: '1' }, { id: '1' }, 'remote_wins');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure time difference
      await logConflict('note', '2', { id: '2' }, { id: '2' }, 'local_wins');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await logConflict('relation', '3', { id: '3' }, { id: '3' }, 'remote_wins');

      const logs = await getConflictLogs(10);

      expect(logs).toHaveLength(3);
      expect(logs.map((l) => l.entity_id)).toEqual(['3', '2', '1']); // DESC order
    });
  });

  describe('resolveNoteConflict()', () => {
    it('should resolve conflict with remote wins', async () => {
      const local: Note = {
        id: '1',
        body: 'Local note',
        importance: 2,
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T10:00:00.000Z',
      };

      const remote: Note = {
        id: '1',
        body: 'Remote note',
        importance: 3,
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T11:00:00.000Z',
      };

      const result = await resolveNoteConflict(local, remote);

      expect(result.shouldUpdate).toBe(true);
      expect(result.note).toEqual(remote);

      const logs = await getConflictLogs(1);
      expect(logs[0].resolution).toBe('remote_wins');
    });

    it('should resolve conflict with local wins', async () => {
      const local: Note = {
        id: '1',
        body: 'Local note',
        importance: 2,
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T11:00:00.000Z',
      };

      const remote: Note = {
        id: '1',
        body: 'Remote note',
        importance: 3,
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T10:00:00.000Z',
      };

      const result = await resolveNoteConflict(local, remote);

      expect(result.shouldUpdate).toBe(false);
      expect(result.note).toEqual(local);

      const logs = await getConflictLogs(1);
      expect(logs[0].resolution).toBe('local_wins');
    });
  });

  describe('resolveRelationConflict()', () => {
    it('should resolve conflict with remote wins', async () => {
      const local: Relation = {
        id: '1',
        from_note_id: 'A',
        to_note_id: 'B',
        relation_type: 'related',
        source: 'manual',
        created_at: '2025-01-10T10:00:00.000Z',
      };

      const remote: Relation = {
        id: '1',
        from_note_id: 'A',
        to_note_id: 'B',
        relation_type: 'similar',
        source: 'ai',
        created_at: '2025-01-10T11:00:00.000Z',
      };

      const result = await resolveRelationConflict(local, remote);

      expect(result.shouldUpdate).toBe(true);
      expect(result.relation).toEqual(remote);

      const logs = await getConflictLogs(1);
      expect(logs[0].resolution).toBe('remote_wins');
    });

    it('should resolve conflict with local wins', async () => {
      const local: Relation = {
        id: '1',
        from_note_id: 'A',
        to_note_id: 'B',
        relation_type: 'related',
        source: 'manual',
        created_at: '2025-01-10T11:00:00.000Z',
      };

      const remote: Relation = {
        id: '1',
        from_note_id: 'A',
        to_note_id: 'B',
        relation_type: 'similar',
        source: 'ai',
        created_at: '2025-01-10T10:00:00.000Z',
      };

      const result = await resolveRelationConflict(local, remote);

      expect(result.shouldUpdate).toBe(false);
      expect(result.relation).toEqual(local);

      const logs = await getConflictLogs(1);
      expect(logs[0].resolution).toBe('local_wins');
    });
  });

  describe('resolveReflectionConflict()', () => {
    it('should resolve conflict with remote wins', async () => {
      const local: Reflection = {
        date: '2025-01-10',
        content: 'Local reflection',
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T10:00:00.000Z',
      };

      const remote: Reflection = {
        date: '2025-01-10',
        content: 'Remote reflection',
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T11:00:00.000Z',
      };

      const result = await resolveReflectionConflict(local, remote);

      expect(result.shouldUpdate).toBe(true);
      expect(result.reflection).toEqual(remote);

      const logs = await getConflictLogs(1);
      expect(logs[0].resolution).toBe('remote_wins');
    });

    it('should resolve conflict with local wins', async () => {
      const local: Reflection = {
        date: '2025-01-10',
        content: 'Local reflection',
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T11:00:00.000Z',
      };

      const remote: Reflection = {
        date: '2025-01-10',
        content: 'Remote reflection',
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T10:00:00.000Z',
      };

      const result = await resolveReflectionConflict(local, remote);

      expect(result.shouldUpdate).toBe(false);
      expect(result.reflection).toEqual(local);

      const logs = await getConflictLogs(1);
      expect(logs[0].resolution).toBe('local_wins');
    });
  });

  describe('getConflictLogs()', () => {
    it('should retrieve conflict logs in DESC order', async () => {
      await logConflict('note', '1', { id: '1' }, { id: '1' }, 'remote_wins');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure time difference
      await logConflict('note', '2', { id: '2' }, { id: '2' }, 'local_wins');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await logConflict('note', '3', { id: '3' }, { id: '3' }, 'remote_wins');

      const logs = await getConflictLogs(2);

      expect(logs).toHaveLength(2);
      expect(logs[0].entity_id).toBe('3');
      expect(logs[1].entity_id).toBe('2');
    });

    it('should limit results', async () => {
      for (let i = 1; i <= 10; i++) {
        await logConflict('note', `${i}`, { id: `${i}` }, { id: `${i}` }, 'remote_wins');
      }

      const logs = await getConflictLogs(5);

      expect(logs).toHaveLength(5);
    });
  });

  describe('clearOldConflictLogs()', () => {
    it('should delete old conflict logs', async () => {
      // Create old conflict log (31 days old)
      const db = await getDatabase();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldISO = oldDate.toISOString();

      await db.runAsync(
        `INSERT INTO conflict_log (entity_type, entity_id, local_data, remote_data, resolution, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['note', '1', '{}', '{}', 'remote_wins', oldISO]
      );

      // Create recent conflict log
      await logConflict('note', '2', { id: '2' }, { id: '2' }, 'local_wins');

      const deletedCount = await clearOldConflictLogs(30);

      expect(deletedCount).toBe(1);

      const remainingLogs = await getConflictLogs(10);
      expect(remainingLogs).toHaveLength(1);
      expect(remainingLogs[0].entity_id).toBe('2');
    });

    it('should not delete recent conflict logs', async () => {
      await logConflict('note', '1', { id: '1' }, { id: '1' }, 'remote_wins');
      await logConflict('note', '2', { id: '2' }, { id: '2' }, 'local_wins');

      const deletedCount = await clearOldConflictLogs(30);

      expect(deletedCount).toBe(0);

      const logs = await getConflictLogs(10);
      expect(logs).toHaveLength(2);
    });
  });
});
