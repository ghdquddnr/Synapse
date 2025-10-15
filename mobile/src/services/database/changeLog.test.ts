/**
 * Tests for Change Log Database Operations
 */

import {
  logChange,
  getUnsyncedChanges,
  getUnsyncedChangesBatch,
  markAsSynced,
  incrementRetryCount,
  getQueueSize,
  getQueueStatus,
  getFailedEntries,
  cleanupOldEntries,
  clearAllEntries,
  resetRetryCount,
  getChangeLogStats,
} from './changeLog';
import { DatabaseManager, getDatabase } from './connection';
import { initializeSchema } from './schema';
import { DatabaseError } from '@/types/database';
import {
  SYNC_BATCH_MAX_SIZE,
  SYNC_BATCH_MAX_BYTES,
  SYNC_MAX_RETRY_COUNT,
  SYNC_QUEUE_WARNING_SIZE,
  SYNC_QUEUE_MAX_SIZE,
} from '@/constants/database';

describe('Change Log Database Operations', () => {
  beforeEach(async () => {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.resetDatabase();
    const db = await dbManager.getDatabase();
    await initializeSchema(db);
  });

  afterAll(async () => {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.closeDatabase();
  });

  describe('logChange', () => {
    it('should log a change entry', async () => {
      const id = await logChange('note', 'note-123', 'insert', {
        body: 'Test note',
        importance: 2,
      });

      expect(id).toBeGreaterThan(0);

      const changes = await getUnsyncedChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        entity_type: 'note',
        entity_id: 'note-123',
        operation: 'insert',
        priority: 2,
        retry_count: 0,
      });
    });

    it('should set correct priority for different entity types', async () => {
      await logChange('reflection', 'ref-1', 'insert', { content: 'Reflection' });
      await logChange('note', 'note-1', 'insert', { body: 'Note' });
      await logChange('search_history', 'sh-1', 'insert', { query: 'test' });

      const changes = await getUnsyncedChanges(10);

      // Should be ordered by priority desc
      expect(changes[0].entity_type).toBe('reflection');
      expect(changes[0].priority).toBe(3);
      expect(changes[1].entity_type).toBe('note');
      expect(changes[1].priority).toBe(2);
      expect(changes[2].entity_type).toBe('search_history');
      expect(changes[2].priority).toBe(1);
    });

    it('should reject empty entity type', async () => {
      await expect(logChange('', 'note-123', 'insert', {})).rejects.toThrow(DatabaseError);
      await expect(logChange('   ', 'note-123', 'insert', {})).rejects.toThrow(
        DatabaseError
      );
    });

    it('should reject empty entity ID', async () => {
      await expect(logChange('note', '', 'insert', {})).rejects.toThrow(DatabaseError);
      await expect(logChange('note', '   ', 'insert', {})).rejects.toThrow(DatabaseError);
    });

    it('should reject invalid operation', async () => {
      await expect(
        logChange('note', 'note-123', 'invalid' as any, {})
      ).rejects.toThrow(DatabaseError);
    });

    it('should store payload as JSON', async () => {
      const payload = {
        body: 'Test note',
        importance: 2,
        tags: ['test', 'example'],
      };

      await logChange('note', 'note-123', 'insert', payload);

      const changes = await getUnsyncedChanges();
      const storedPayload =
        typeof changes[0].payload === 'string'
          ? JSON.parse(changes[0].payload)
          : changes[0].payload;

      expect(storedPayload).toEqual(payload);
    });

    it('should reject when queue is full', async () => {
      // Mock queue size by directly inserting entries
      const db = await getDatabase();

      for (let i = 0; i < SYNC_QUEUE_MAX_SIZE; i++) {
        await db.runAsync(
          `INSERT INTO change_log (entity_type, entity_id, operation, payload, priority, created_at, synced_at, retry_count, last_error)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL)`,
          ['note', `note-${i}`, 'insert', '{}', 2, new Date().toISOString()]
        );
      }

      await expect(logChange('note', 'new-note', 'insert', {})).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('getUnsyncedChanges', () => {
    beforeEach(async () => {
      // Create test changes with different priorities
      await logChange('reflection', 'ref-1', 'insert', { content: 'High priority' });
      await logChange('note', 'note-1', 'insert', { body: 'Medium priority' });
      await logChange('note', 'note-2', 'update', { body: 'Medium priority 2' });
      await logChange('search_history', 'sh-1', 'insert', { query: 'Low priority' });
    });

    it('should return unsynced changes ordered by priority', async () => {
      const changes = await getUnsyncedChanges();

      expect(changes).toHaveLength(4);
      expect(changes[0].entity_type).toBe('reflection');
      expect(changes[0].priority).toBe(3);
      expect(changes[1].entity_type).toBe('note');
      expect(changes[1].priority).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const changes = await getUnsyncedChanges(2);

      expect(changes).toHaveLength(2);
    });

    it('should exclude synced entries', async () => {
      const allChanges = await getUnsyncedChanges();
      const firstId = allChanges[0].id;

      await markAsSynced([firstId]);

      const unsyncedChanges = await getUnsyncedChanges();
      expect(unsyncedChanges).toHaveLength(3);
      expect(unsyncedChanges.find((c) => c.id === firstId)).toBeUndefined();
    });

    it('should exclude entries that exceeded retry limit', async () => {
      const allChanges = await getUnsyncedChanges();
      const firstId = allChanges[0].id;

      // Increment retry count beyond limit
      for (let i = 0; i < SYNC_MAX_RETRY_COUNT; i++) {
        await incrementRetryCount(firstId, `Error ${i + 1}`);
      }

      const unsyncedChanges = await getUnsyncedChanges();
      expect(unsyncedChanges).toHaveLength(3);
      expect(unsyncedChanges.find((c) => c.id === firstId)).toBeUndefined();
    });

    it('should reject non-positive limit', async () => {
      await expect(getUnsyncedChanges(0)).rejects.toThrow(DatabaseError);
      await expect(getUnsyncedChanges(-1)).rejects.toThrow(DatabaseError);
    });

    it('should reject limit exceeding max batch size', async () => {
      await expect(getUnsyncedChanges(SYNC_BATCH_MAX_SIZE + 1)).rejects.toThrow(
        DatabaseError
      );
    });

    it('should return empty array when no unsynced changes', async () => {
      await clearAllEntries();

      const changes = await getUnsyncedChanges();
      expect(changes).toHaveLength(0);
    });
  });

  describe('getUnsyncedChangesBatch', () => {
    beforeEach(async () => {
      // Create changes with varying payload sizes
      await logChange('note', 'note-1', 'insert', { body: 'A'.repeat(100) });
      await logChange('note', 'note-2', 'insert', { body: 'B'.repeat(100) });
      await logChange('note', 'note-3', 'insert', { body: 'C'.repeat(100) });
      await logChange('note', 'note-4', 'insert', { body: 'D'.repeat(100) });
      await logChange('note', 'note-5', 'insert', { body: 'E'.repeat(100) });
    });

    it('should respect count limit', async () => {
      const batch = await getUnsyncedChangesBatch(3, SYNC_BATCH_MAX_BYTES);

      expect(batch.length).toBeLessThanOrEqual(3);
    });

    it('should respect size limit', async () => {
      const batch = await getUnsyncedChangesBatch(10, 500);

      // Should return fewer entries due to size constraint
      expect(batch.length).toBeLessThan(5);
    });

    it('should return at least one entry if size allows', async () => {
      const batch = await getUnsyncedChangesBatch(10, 300);

      expect(batch.length).toBeGreaterThan(0);
    });

    it('should reject non-positive parameters', async () => {
      await expect(getUnsyncedChangesBatch(0, 1000)).rejects.toThrow(DatabaseError);
      await expect(getUnsyncedChangesBatch(10, 0)).rejects.toThrow(DatabaseError);
      await expect(getUnsyncedChangesBatch(-1, 1000)).rejects.toThrow(DatabaseError);
      await expect(getUnsyncedChangesBatch(10, -1)).rejects.toThrow(DatabaseError);
    });
  });

  describe('markAsSynced', () => {
    beforeEach(async () => {
      await logChange('note', 'note-1', 'insert', { body: 'Note 1' });
      await logChange('note', 'note-2', 'insert', { body: 'Note 2' });
      await logChange('note', 'note-3', 'insert', { body: 'Note 3' });
    });

    it('should mark entries as synced', async () => {
      const changes = await getUnsyncedChanges();
      const ids = changes.slice(0, 2).map((c) => c.id);

      await markAsSynced(ids);

      const unsynced = await getUnsyncedChanges();
      expect(unsynced).toHaveLength(1);
    });

    it('should set synced_at timestamp', async () => {
      const changes = await getUnsyncedChanges();
      const id = changes[0].id;

      await markAsSynced([id]);

      const db = await getDatabase();
      const result = await db.getFirstAsync<{ synced_at: string }>(
        'SELECT synced_at FROM change_log WHERE id = ?',
        [id]
      );

      expect(result?.synced_at).toBeTruthy();
    });

    it('should handle empty array gracefully', async () => {
      await expect(markAsSynced([])).resolves.not.toThrow();
    });

    it('should reject invalid IDs', async () => {
      await expect(markAsSynced([0])).rejects.toThrow(DatabaseError);
      await expect(markAsSynced([-1])).rejects.toThrow(DatabaseError);
      await expect(markAsSynced([1.5])).rejects.toThrow(DatabaseError);
    });

    it('should throw error if no entries were updated', async () => {
      await expect(markAsSynced([999999])).rejects.toThrow(DatabaseError);
    });
  });

  describe('incrementRetryCount', () => {
    let changeId: number;

    beforeEach(async () => {
      changeId = await logChange('note', 'note-1', 'insert', { body: 'Test' });
    });

    it('should increment retry count', async () => {
      await incrementRetryCount(changeId, 'Network error');

      const changes = await getUnsyncedChanges();
      expect(changes[0].retry_count).toBe(1);
    });

    it('should store error message', async () => {
      const errorMsg = 'Network timeout';
      await incrementRetryCount(changeId, errorMsg);

      const changes = await getUnsyncedChanges();
      expect(changes[0].last_error).toBe(errorMsg);
    });

    it('should allow multiple increments', async () => {
      await incrementRetryCount(changeId, 'Error 1');
      await incrementRetryCount(changeId, 'Error 2');
      await incrementRetryCount(changeId, 'Error 3');

      const changes = await getUnsyncedChanges();
      expect(changes[0].retry_count).toBe(3);
      expect(changes[0].last_error).toBe('Error 3');
    });

    it('should reject invalid ID', async () => {
      await expect(incrementRetryCount(0, 'Error')).rejects.toThrow(DatabaseError);
      await expect(incrementRetryCount(-1, 'Error')).rejects.toThrow(DatabaseError);
      await expect(incrementRetryCount(1.5, 'Error')).rejects.toThrow(DatabaseError);
    });

    it('should reject empty error message', async () => {
      await expect(incrementRetryCount(changeId, '')).rejects.toThrow(DatabaseError);
      await expect(incrementRetryCount(changeId, '   ')).rejects.toThrow(DatabaseError);
    });

    it('should throw error for non-existent ID', async () => {
      await expect(incrementRetryCount(999999, 'Error')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', async () => {
      const size = await getQueueSize();
      expect(size).toBe(0);
    });

    it('should return correct queue size', async () => {
      await logChange('note', 'note-1', 'insert', {});
      await logChange('note', 'note-2', 'insert', {});
      await logChange('note', 'note-3', 'insert', {});

      const size = await getQueueSize();
      expect(size).toBe(3);
    });

    it('should exclude synced entries', async () => {
      const id1 = await logChange('note', 'note-1', 'insert', {});
      await logChange('note', 'note-2', 'insert', {});

      await markAsSynced([id1]);

      const size = await getQueueSize();
      expect(size).toBe(1);
    });

    it('should include failed entries', async () => {
      const id = await logChange('note', 'note-1', 'insert', {});

      for (let i = 0; i < SYNC_MAX_RETRY_COUNT; i++) {
        await incrementRetryCount(id, 'Error');
      }

      const size = await getQueueSize();
      expect(size).toBe(1);
    });
  });

  describe('getQueueStatus', () => {
    it('should return no warning for small queue', async () => {
      await logChange('note', 'note-1', 'insert', {});

      const status = await getQueueStatus();

      expect(status.size).toBe(1);
      expect(status.warning).toBe(false);
      expect(status.full).toBe(false);
      expect(status.message).toBeNull();
    });

    it('should return warning when approaching limit', async () => {
      const db = await getDatabase();

      for (let i = 0; i < SYNC_QUEUE_WARNING_SIZE; i++) {
        await db.runAsync(
          `INSERT INTO change_log (entity_type, entity_id, operation, payload, priority, created_at, synced_at, retry_count, last_error)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL)`,
          ['note', `note-${i}`, 'insert', '{}', 2, new Date().toISOString()]
        );
      }

      const status = await getQueueStatus();

      expect(status.warning).toBe(true);
      expect(status.full).toBe(false);
      expect(status.message).toContain('full');
    });

    it('should return full status at limit', async () => {
      const db = await getDatabase();

      for (let i = 0; i < SYNC_QUEUE_MAX_SIZE; i++) {
        await db.runAsync(
          `INSERT INTO change_log (entity_type, entity_id, operation, payload, priority, created_at, synced_at, retry_count, last_error)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL)`,
          ['note', `note-${i}`, 'insert', '{}', 2, new Date().toISOString()]
        );
      }

      const status = await getQueueStatus();

      expect(status.full).toBe(true);
      expect(status.message).toContain('read-only');
    });
  });

  describe('getFailedEntries', () => {
    it('should return empty array when no failed entries', async () => {
      await logChange('note', 'note-1', 'insert', {});

      const failed = await getFailedEntries();
      expect(failed).toHaveLength(0);
    });

    it('should return entries that exceeded retry limit', async () => {
      const id1 = await logChange('note', 'note-1', 'insert', {});
      await logChange('note', 'note-2', 'insert', {});

      for (let i = 0; i < SYNC_MAX_RETRY_COUNT; i++) {
        await incrementRetryCount(id1, `Error ${i + 1}`);
      }

      const failed = await getFailedEntries();
      expect(failed).toHaveLength(1);
      expect(failed[0].id).toBe(id1);
    });

    it('should order by created_at desc', async () => {
      const id1 = await logChange('note', 'note-1', 'insert', {});
      await new Promise((resolve) => setTimeout(resolve, 10));
      const id2 = await logChange('note', 'note-2', 'insert', {});

      for (let i = 0; i < SYNC_MAX_RETRY_COUNT; i++) {
        await incrementRetryCount(id1, 'Error');
        await incrementRetryCount(id2, 'Error');
      }

      const failed = await getFailedEntries();
      expect(failed[0].id).toBe(id2); // More recent first
      expect(failed[1].id).toBe(id1);
    });
  });

  describe('cleanupOldEntries', () => {
    it('should delete old synced entries', async () => {
      const db = await getDatabase();

      // Insert old synced entry
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      await db.runAsync(
        `INSERT INTO change_log (entity_type, entity_id, operation, payload, priority, created_at, synced_at, retry_count, last_error)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
        ['note', 'old-note', 'insert', '{}', 2, oldDate.toISOString(), oldDate.toISOString()]
      );

      await logChange('note', 'new-note', 'insert', {});
      await markAsSynced([2]); // Mark the new one as synced

      const deleted = await cleanupOldEntries(30);

      expect(deleted).toBe(1);

      const allChanges = await db.getAllAsync('SELECT * FROM change_log');
      expect(allChanges).toHaveLength(1);
    });

    it('should not delete unsynced entries', async () => {
      await logChange('note', 'note-1', 'insert', {});

      const deleted = await cleanupOldEntries(30);

      expect(deleted).toBe(0);

      const size = await getQueueSize();
      expect(size).toBe(1);
    });

    it('should not delete recent synced entries', async () => {
      await logChange('note', 'note-1', 'insert', {});
      await markAsSynced([1]);

      const deleted = await cleanupOldEntries(30);

      expect(deleted).toBe(0);
    });

    it('should reject non-positive days', async () => {
      await expect(cleanupOldEntries(0)).rejects.toThrow(DatabaseError);
      await expect(cleanupOldEntries(-1)).rejects.toThrow(DatabaseError);
    });
  });

  describe('clearAllEntries', () => {
    it('should delete all entries', async () => {
      await logChange('note', 'note-1', 'insert', {});
      await logChange('note', 'note-2', 'insert', {});
      await logChange('note', 'note-3', 'insert', {});

      await clearAllEntries();

      const size = await getQueueSize();
      expect(size).toBe(0);

      const db = await getDatabase();
      const all = await db.getAllAsync('SELECT * FROM change_log');
      expect(all).toHaveLength(0);
    });
  });

  describe('resetRetryCount', () => {
    let failedId1: number;
    let failedId2: number;

    beforeEach(async () => {
      failedId1 = await logChange('note', 'note-1', 'insert', {});
      failedId2 = await logChange('note', 'note-2', 'insert', {});

      for (let i = 0; i < SYNC_MAX_RETRY_COUNT; i++) {
        await incrementRetryCount(failedId1, 'Error');
        await incrementRetryCount(failedId2, 'Error');
      }
    });

    it('should reset retry count for specific entries', async () => {
      const count = await resetRetryCount([failedId1]);

      expect(count).toBe(1);

      const changes = await getUnsyncedChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].id).toBe(failedId1);
      expect(changes[0].retry_count).toBe(0);
    });

    it('should reset all failed entries when no IDs provided', async () => {
      const count = await resetRetryCount();

      expect(count).toBe(2);

      const changes = await getUnsyncedChanges();
      expect(changes).toHaveLength(2);
    });

    it('should clear last_error', async () => {
      await resetRetryCount([failedId1]);

      const changes = await getUnsyncedChanges();
      expect(changes[0].last_error).toBeNull();
    });

    it('should reject invalid IDs', async () => {
      await expect(resetRetryCount([0])).rejects.toThrow(DatabaseError);
      await expect(resetRetryCount([-1])).rejects.toThrow(DatabaseError);
    });
  });

  describe('getChangeLogStats', () => {
    beforeEach(async () => {
      await logChange('note', 'note-1', 'insert', {});
      await logChange('note', 'note-2', 'update', {});
      await logChange('relation', 'rel-1', 'insert', {});
      await logChange('reflection', 'ref-1', 'delete', {});

      // Mark one as synced
      await markAsSynced([1]);

      // Fail one
      for (let i = 0; i < SYNC_MAX_RETRY_COUNT; i++) {
        await incrementRetryCount(2, 'Error');
      }
    });

    it('should return correct statistics', async () => {
      const stats = await getChangeLogStats();

      expect(stats.total).toBe(4);
      expect(stats.synced).toBe(1);
      expect(stats.unsynced).toBe(2); // Excludes failed
      expect(stats.failed).toBe(1);
    });

    it('should group by entity type', async () => {
      const stats = await getChangeLogStats();

      expect(stats.byEntityType.note).toBe(1); // note-2 is failed, so only counting unsynced
      expect(stats.byEntityType.relation).toBe(1);
      expect(stats.byEntityType.reflection).toBe(1);
    });

    it('should group by operation', async () => {
      const stats = await getChangeLogStats();

      expect(stats.byOperation.insert).toBe(1); // Only counting unsynced
      expect(stats.byOperation.update).toBeDefined();
      expect(stats.byOperation.delete).toBe(1);
    });

    it('should return zero stats for empty queue', async () => {
      await clearAllEntries();

      const stats = await getChangeLogStats();

      expect(stats.total).toBe(0);
      expect(stats.unsynced).toBe(0);
      expect(stats.synced).toBe(0);
      expect(stats.failed).toBe(0);
      expect(Object.keys(stats.byEntityType)).toHaveLength(0);
      expect(Object.keys(stats.byOperation)).toHaveLength(0);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle concurrent operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(logChange('note', `note-${i}`, 'insert', { body: `Note ${i}` }));
      }

      const ids = await Promise.all(promises);

      expect(new Set(ids).size).toBe(10); // All IDs should be unique
      expect(await getQueueSize()).toBe(10);
    });

    it('should maintain FIFO order within same priority', async () => {
      await logChange('note', 'note-1', 'insert', {});
      await new Promise((resolve) => setTimeout(resolve, 10));
      await logChange('note', 'note-2', 'insert', {});
      await new Promise((resolve) => setTimeout(resolve, 10));
      await logChange('note', 'note-3', 'insert', {});

      const changes = await getUnsyncedChanges();

      expect(changes[0].entity_id).toBe('note-1');
      expect(changes[1].entity_id).toBe('note-2');
      expect(changes[2].entity_id).toBe('note-3');
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        body: 'A'.repeat(10000),
        metadata: { tags: Array(100).fill('tag') },
      };

      const id = await logChange('note', 'note-large', 'insert', largePayload);

      expect(id).toBeGreaterThan(0);

      const changes = await getUnsyncedChanges();
      const payload =
        typeof changes[0].payload === 'string'
          ? JSON.parse(changes[0].payload)
          : changes[0].payload;

      expect(payload.body.length).toBe(10000);
    });

    it('should handle unicode in payloads', async () => {
      const unicodePayload = {
        body: '안녕하세요! 🚀 Hello 世界',
        emoji: '👍🎉🔥',
      };

      await logChange('note', 'note-unicode', 'insert', unicodePayload);

      const changes = await getUnsyncedChanges();
      const payload =
        typeof changes[0].payload === 'string'
          ? JSON.parse(changes[0].payload)
          : changes[0].payload;

      expect(payload).toEqual(unicodePayload);
    });

    it('should handle full lifecycle', async () => {
      // Log change
      const id = await logChange('note', 'note-1', 'insert', { body: 'Test' });

      // Attempt sync (fail)
      await incrementRetryCount(id, 'Network error');
      expect((await getUnsyncedChanges())[0].retry_count).toBe(1);

      // Retry sync (fail again)
      await incrementRetryCount(id, 'Timeout');
      expect((await getUnsyncedChanges())[0].retry_count).toBe(2);

      // Final sync (success)
      await markAsSynced([id]);
      expect(await getQueueSize()).toBe(0);

      // Cleanup
      await cleanupOldEntries(0);
      const db = await getDatabase();
      const all = await db.getAllAsync('SELECT * FROM change_log');
      expect(all).toHaveLength(0);
    });
  });
});
