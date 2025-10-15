/**
 * Unit tests for Pull sync
 * Phase 6.3: Pull Sync Tests
 */

import { pullChanges, pullSingleBatch } from './pull';
import { getDatabase, closeDatabase } from '../database/connection';
import { initializeSchema, dropAllTables } from '../database/schema';
import { apiClient } from '../api/client';
import type { SyncPullResponse, Delta } from '../../types/sync';
import type { Note, Relation, Reflection } from '../../types';

// Mock API client
jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock device ID
jest.mock('../../utils/device', () => ({
  getDeviceId: jest.fn().mockResolvedValue('test-device-001'),
}));

describe('Pull Sync', () => {
  beforeEach(async () => {
    await dropAllTables();
    await initializeSchema();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('pullSingleBatch()', () => {
    it('should pull and apply upsert delta for new note', async () => {
      const remoteNote: Note = {
        id: 'note-1',
        body: 'Remote note',
        importance: 2,
        created_at: '2025-01-10T10:00:00.000Z',
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:01.000Z',
      };

      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'upsert',
            data: remoteNote,
            updated_at: remoteNote.updated_at,
            server_timestamp: remoteNote.server_timestamp!,
          },
        ],
        new_checkpoint: 'checkpoint-001',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);
      expect(result.conflicts_count).toBe(0);

      // Verify note inserted
      const db = await getDatabase();
      const note = await db.getFirstAsync<Note>(`SELECT * FROM notes WHERE id = ?`, [
        'note-1',
      ]);

      expect(note).toMatchObject({
        id: 'note-1',
        body: 'Remote note',
        importance: 2,
      });

      // Verify checkpoint saved
      const checkpoint = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM sync_state WHERE key = 'checkpoint'`
      );
      expect(checkpoint?.value).toBe('checkpoint-001');
    });

    it('should handle conflict with remote wins (newer remote)', async () => {
      const db = await getDatabase();

      // Insert local note
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['note-1', 'Local note', 1, '2025-01-10T09:00:00.000Z', '2025-01-10T10:00:00.000Z']
      );

      // Remote note with newer timestamp
      const remoteNote: Note = {
        id: 'note-1',
        body: 'Remote note (newer)',
        importance: 3,
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T11:00:00.000Z',
        server_timestamp: '2025-01-10T11:00:01.000Z',
      };

      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'upsert',
            data: remoteNote,
            updated_at: remoteNote.updated_at,
            server_timestamp: remoteNote.server_timestamp!,
          },
        ],
        new_checkpoint: 'checkpoint-002',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);
      expect(result.conflicts_count).toBe(1); // Conflict occurred

      // Verify remote note wins
      const note = await db.getFirstAsync<Note>(`SELECT * FROM notes WHERE id = ?`, [
        'note-1',
      ]);

      expect(note?.body).toBe('Remote note (newer)');
      expect(note?.importance).toBe(3);
    });

    it('should handle conflict with local wins (newer local)', async () => {
      const db = await getDatabase();

      // Insert local note with newer timestamp
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['note-1', 'Local note (newer)', 3, '2025-01-10T09:00:00.000Z', '2025-01-10T11:00:00.000Z']
      );

      // Remote note with older timestamp
      const remoteNote: Note = {
        id: 'note-1',
        body: 'Remote note',
        importance: 1,
        created_at: '2025-01-10T09:00:00.000Z',
        updated_at: '2025-01-10T10:00:00.000Z',
        server_timestamp: '2025-01-10T10:00:01.000Z',
      };

      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'upsert',
            data: remoteNote,
            updated_at: remoteNote.updated_at,
            server_timestamp: remoteNote.server_timestamp!,
          },
        ],
        new_checkpoint: 'checkpoint-003',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);
      expect(result.conflicts_count).toBe(1); // Conflict occurred

      // Verify local note wins (no update)
      const note = await db.getFirstAsync<Note>(`SELECT * FROM notes WHERE id = ?`, [
        'note-1',
      ]);

      expect(note?.body).toBe('Local note (newer)');
      expect(note?.importance).toBe(3);
    });

    it('should apply delete delta for note (soft delete)', async () => {
      const db = await getDatabase();

      // Insert local note
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['note-1', 'Local note', 2, '2025-01-10T09:00:00.000Z', '2025-01-10T10:00:00.000Z']
      );

      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'delete',
            updated_at: '2025-01-10T11:00:00.000Z',
            server_timestamp: '2025-01-10T11:00:01.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-004',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);

      // Verify note soft deleted
      const note = await db.getFirstAsync<Note>(`SELECT * FROM notes WHERE id = ?`, [
        'note-1',
      ]);

      expect(note?.deleted_at).toBeTruthy();
    });

    it('should pull and apply relation delta', async () => {
      const db = await getDatabase();

      // Insert two notes for relation
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
        [
          'note-A',
          'Note A',
          2,
          '2025-01-10T09:00:00.000Z',
          '2025-01-10T09:00:00.000Z',
          'note-B',
          'Note B',
          2,
          '2025-01-10T09:00:00.000Z',
          '2025-01-10T09:00:00.000Z',
        ]
      );

      const remoteRelation: Relation = {
        id: 'rel-1',
        from_note_id: 'note-A',
        to_note_id: 'note-B',
        relation_type: 'related',
        source: 'ai',
        created_at: '2025-01-10T10:00:00.000Z',
      };

      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'relation',
            entity_id: 'rel-1',
            operation: 'upsert',
            data: remoteRelation,
            updated_at: remoteRelation.created_at,
            server_timestamp: '2025-01-10T10:00:01.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-005',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);

      // Verify relation inserted
      const relation = await db.getFirstAsync<Relation>(
        `SELECT * FROM relations WHERE id = ?`,
        ['rel-1']
      );

      expect(relation).toMatchObject({
        id: 'rel-1',
        from_note_id: 'note-A',
        to_note_id: 'note-B',
        relation_type: 'related',
      });
    });

    it('should pull and apply reflection delta', async () => {
      const remoteReflection: Reflection = {
        date: '2025-01-10',
        content: 'Today was productive',
        created_at: '2025-01-10T23:00:00.000Z',
        updated_at: '2025-01-10T23:00:00.000Z',
      };

      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'reflection',
            entity_id: '2025-01-10',
            operation: 'upsert',
            data: remoteReflection,
            updated_at: remoteReflection.updated_at,
            server_timestamp: '2025-01-10T23:00:01.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-006',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);

      // Verify reflection inserted
      const db = await getDatabase();
      const reflection = await db.getFirstAsync<Reflection>(
        `SELECT * FROM reflections WHERE date = ?`,
        ['2025-01-10']
      );

      expect(reflection).toMatchObject({
        date: '2025-01-10',
        content: 'Today was productive',
      });
    });

    it('should handle multiple changes in single batch', async () => {
      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'upsert',
            data: {
              id: 'note-1',
              body: 'Note 1',
              importance: 1,
              created_at: '2025-01-10T10:00:00.000Z',
              updated_at: '2025-01-10T10:00:00.000Z',
            },
            updated_at: '2025-01-10T10:00:00.000Z',
            server_timestamp: '2025-01-10T10:00:01.000Z',
          },
          {
            entity_type: 'note',
            entity_id: 'note-2',
            operation: 'upsert',
            data: {
              id: 'note-2',
              body: 'Note 2',
              importance: 2,
              created_at: '2025-01-10T10:00:00.000Z',
              updated_at: '2025-01-10T10:00:00.000Z',
            },
            updated_at: '2025-01-10T10:00:00.000Z',
            server_timestamp: '2025-01-10T10:00:02.000Z',
          },
          {
            entity_type: 'reflection',
            entity_id: '2025-01-10',
            operation: 'upsert',
            data: {
              date: '2025-01-10',
              content: 'Reflection',
              created_at: '2025-01-10T23:00:00.000Z',
              updated_at: '2025-01-10T23:00:00.000Z',
            },
            updated_at: '2025-01-10T23:00:00.000Z',
            server_timestamp: '2025-01-10T23:00:01.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-007',
        total_changes: 3,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(3);

      // Verify all entities inserted
      const db = await getDatabase();
      const note1 = await db.getFirstAsync(`SELECT * FROM notes WHERE id = ?`, ['note-1']);
      const note2 = await db.getFirstAsync(`SELECT * FROM notes WHERE id = ?`, ['note-2']);
      const reflection = await db.getFirstAsync(
        `SELECT * FROM reflections WHERE date = ?`,
        ['2025-01-10']
      );

      expect(note1).toBeTruthy();
      expect(note2).toBeTruthy();
      expect(reflection).toBeTruthy();
    });

    it('should handle empty changes', async () => {
      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [],
        new_checkpoint: 'checkpoint-008',
        total_changes: 0,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullSingleBatch();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(0);
      expect(result.conflicts_count).toBe(0);

      // Verify checkpoint still updated
      const db = await getDatabase();
      const checkpoint = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM sync_state WHERE key = 'checkpoint'`
      );
      expect(checkpoint?.value).toBe('checkpoint-008');
    });

    it('should return error on API failure', async () => {
      mockedApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await pullSingleBatch();

      expect(result.success).toBe(false);
      expect(result.pulled_count).toBe(0);
      expect(result.error).toBe('Network error');
    });
  });

  describe('pullChanges() - Recursive', () => {
    it('should recursively pull multiple batches when has_more is true', async () => {
      // First batch
      const batch1: SyncPullResponse = {
        has_more: true,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'upsert',
            data: {
              id: 'note-1',
              body: 'Note 1',
              importance: 1,
              created_at: '2025-01-10T10:00:00.000Z',
              updated_at: '2025-01-10T10:00:00.000Z',
            },
            updated_at: '2025-01-10T10:00:00.000Z',
            server_timestamp: '2025-01-10T10:00:01.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-batch1',
        total_changes: 2,
      };

      // Second batch
      const batch2: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-2',
            operation: 'upsert',
            data: {
              id: 'note-2',
              body: 'Note 2',
              importance: 2,
              created_at: '2025-01-10T10:00:00.000Z',
              updated_at: '2025-01-10T10:00:00.000Z',
            },
            updated_at: '2025-01-10T10:00:00.000Z',
            server_timestamp: '2025-01-10T10:00:02.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-batch2',
        total_changes: 2,
      };

      mockedApiClient.post
        .mockResolvedValueOnce({ data: batch1 })
        .mockResolvedValueOnce({ data: batch2 });

      const result = await pullChanges();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(2); // 1 from batch1 + 1 from batch2
      expect(result.new_checkpoint).toBe('checkpoint-batch2');

      // Verify both notes inserted
      const db = await getDatabase();
      const note1 = await db.getFirstAsync(`SELECT * FROM notes WHERE id = ?`, ['note-1']);
      const note2 = await db.getFirstAsync(`SELECT * FROM notes WHERE id = ?`, ['note-2']);

      expect(note1).toBeTruthy();
      expect(note2).toBeTruthy();

      // Verify final checkpoint
      const checkpoint = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM sync_state WHERE key = 'checkpoint'`
      );
      expect(checkpoint?.value).toBe('checkpoint-batch2');
    });

    it('should stop recursion when has_more is false', async () => {
      const pullResponse: SyncPullResponse = {
        has_more: false,
        changes: [
          {
            entity_type: 'note',
            entity_id: 'note-1',
            operation: 'upsert',
            data: {
              id: 'note-1',
              body: 'Note 1',
              importance: 1,
              created_at: '2025-01-10T10:00:00.000Z',
              updated_at: '2025-01-10T10:00:00.000Z',
            },
            updated_at: '2025-01-10T10:00:00.000Z',
            server_timestamp: '2025-01-10T10:00:01.000Z',
          },
        ],
        new_checkpoint: 'checkpoint-009',
        total_changes: 1,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: pullResponse });

      const result = await pullChanges();

      expect(result.success).toBe(true);
      expect(result.pulled_count).toBe(1);
      expect(mockedApiClient.post).toHaveBeenCalledTimes(1); // Only one call
    });
  });
});
