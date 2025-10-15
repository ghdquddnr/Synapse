/**
 * Change Log Database Operations
 *
 * Manages change log for synchronization tracking.
 * Records all local modifications (insert/update/delete) for push sync.
 */

import { getDatabase } from './connection';
import type { ChangeLogEntry } from '@/types';
import { DatabaseError } from '@/types/database';
import {
  SYNC_BATCH_MAX_SIZE,
  SYNC_BATCH_MAX_BYTES,
  SYNC_MAX_RETRY_COUNT,
  SYNC_QUEUE_WARNING_SIZE,
  SYNC_QUEUE_MAX_SIZE,
} from '@/constants/database';

/**
 * Log a change for synchronization
 * @param entityType - Type of entity (note, relation, reflection, etc.)
 * @param entityId - ID of the entity
 * @param operation - Operation type (insert, update, delete)
 * @param payload - Change payload (entity data)
 * @returns Created change log entry ID
 */
export async function logChange(
  entityType: string,
  entityId: string,
  operation: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown>
): Promise<number> {
  const db = await getDatabase();

  if (!entityType?.trim()) {
    throw new DatabaseError('Entity type cannot be empty', 'VALIDATION_ERROR');
  }

  if (!entityId?.trim()) {
    throw new DatabaseError('Entity ID cannot be empty', 'VALIDATION_ERROR');
  }

  const validOperations = ['insert', 'update', 'delete'];
  if (!validOperations.includes(operation)) {
    throw new DatabaseError(
      `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  // Check queue size limit
  const queueSize = await getQueueSize();
  if (queueSize >= SYNC_QUEUE_MAX_SIZE) {
    throw new DatabaseError(
      `Change log queue is full (${SYNC_QUEUE_MAX_SIZE} entries). Cannot add more changes.`,
      'QUEUE_FULL'
    );
  }

  const now = new Date().toISOString();
  const priority = calculatePriority(entityType, operation);
  const payloadJson = JSON.stringify(payload);

  const result = await db.runAsync(
    `INSERT INTO change_log (
      entity_type, entity_id, operation, payload, priority, created_at, synced_at, retry_count, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL)`,
    [entityType, entityId, operation, payloadJson, priority, now]
  );

  return result.lastInsertRowId;
}

/**
 * Get unsynced changes from the change log
 * @param limit - Maximum number of entries to retrieve (default: SYNC_BATCH_MAX_SIZE)
 * @returns Array of unsynced change log entries, ordered by priority desc, created_at asc
 */
export async function getUnsyncedChanges(
  limit: number = SYNC_BATCH_MAX_SIZE
): Promise<ChangeLogEntry[]> {
  const db = await getDatabase();

  if (limit <= 0) {
    throw new DatabaseError('Limit must be a positive number', 'VALIDATION_ERROR');
  }

  if (limit > SYNC_BATCH_MAX_SIZE) {
    throw new DatabaseError(
      `Limit cannot exceed ${SYNC_BATCH_MAX_SIZE}`,
      'VALIDATION_ERROR'
    );
  }

  const results = await db.getAllAsync<ChangeLogEntry>(
    `SELECT
      id, entity_type, entity_id, operation, payload, priority,
      created_at, synced_at, retry_count, last_error
    FROM change_log
    WHERE synced_at IS NULL
      AND retry_count < ?
    ORDER BY priority DESC, created_at ASC
    LIMIT ?`,
    [SYNC_MAX_RETRY_COUNT, limit]
  );

  return results;
}

/**
 * Get unsynced changes with size constraint
 * Returns entries up to the size limit or count limit, whichever is reached first
 * @param maxCount - Maximum number of entries (default: SYNC_BATCH_MAX_SIZE)
 * @param maxBytes - Maximum total payload size in bytes (default: SYNC_BATCH_MAX_BYTES)
 * @returns Array of unsynced change log entries
 */
export async function getUnsyncedChangesBatch(
  maxCount: number = SYNC_BATCH_MAX_SIZE,
  maxBytes: number = SYNC_BATCH_MAX_BYTES
): Promise<ChangeLogEntry[]> {
  const db = await getDatabase();

  if (maxCount <= 0 || maxBytes <= 0) {
    throw new DatabaseError(
      'Max count and max bytes must be positive numbers',
      'VALIDATION_ERROR'
    );
  }

  // Get all unsynced changes ordered by priority
  const allChanges = await getUnsyncedChanges(maxCount);

  // Filter by cumulative size
  const batch: ChangeLogEntry[] = [];
  let totalBytes = 0;

  for (const change of allChanges) {
    const entrySize = estimateEntrySize(change);

    if (totalBytes + entrySize > maxBytes && batch.length > 0) {
      // Size limit reached, stop adding
      break;
    }

    batch.push(change);
    totalBytes += entrySize;
  }

  return batch;
}

/**
 * Mark change log entries as synced
 * @param ids - Array of change log entry IDs
 */
export async function markAsSynced(ids: number[]): Promise<void> {
  const db = await getDatabase();

  if (!ids || ids.length === 0) {
    return; // Nothing to mark
  }

  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new DatabaseError('All IDs must be positive integers', 'VALIDATION_ERROR');
  }

  const now = new Date().toISOString();
  const placeholders = ids.map(() => '?').join(',');

  const result = await db.runAsync(
    `UPDATE change_log
     SET synced_at = ?
     WHERE id IN (${placeholders})`,
    [now, ...ids]
  );

  if (result.changes === 0) {
    throw new DatabaseError('No change log entries were marked as synced', 'NOT_FOUND');
  }
}

/**
 * Increment retry count and record error for a change log entry
 * @param id - Change log entry ID
 * @param error - Error message
 */
export async function incrementRetryCount(id: number, error: string): Promise<void> {
  const db = await getDatabase();

  if (!Number.isInteger(id) || id <= 0) {
    throw new DatabaseError('ID must be a positive integer', 'VALIDATION_ERROR');
  }

  if (!error?.trim()) {
    throw new DatabaseError('Error message cannot be empty', 'VALIDATION_ERROR');
  }

  const result = await db.runAsync(
    `UPDATE change_log
     SET retry_count = retry_count + 1,
         last_error = ?
     WHERE id = ?`,
    [error.trim(), id]
  );

  if (result.changes === 0) {
    throw new DatabaseError(`Change log entry with id ${id} not found`, 'NOT_FOUND');
  }
}

/**
 * Get queue size (total unsynced entries)
 * @returns Number of unsynced change log entries
 */
export async function getQueueSize(): Promise<number> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM change_log
     WHERE synced_at IS NULL`
  );

  return result?.count ?? 0;
}

/**
 * Get queue status with warnings
 * @returns Queue status information
 */
export async function getQueueStatus(): Promise<{
  size: number;
  warning: boolean;
  full: boolean;
  message: string | null;
}> {
  const size = await getQueueSize();
  const warning = size >= SYNC_QUEUE_WARNING_SIZE;
  const full = size >= SYNC_QUEUE_MAX_SIZE;

  let message: string | null = null;
  if (full) {
    message = `Queue is full (${size}/${SYNC_QUEUE_MAX_SIZE}). App is in read-only mode.`;
  } else if (warning) {
    message = `Queue is ${Math.round((size / SYNC_QUEUE_MAX_SIZE) * 100)}% full (${size}/${SYNC_QUEUE_MAX_SIZE}).`;
  }

  return { size, warning, full, message };
}

/**
 * Get failed entries (exceeded retry limit)
 * @returns Array of failed change log entries
 */
export async function getFailedEntries(): Promise<ChangeLogEntry[]> {
  const db = await getDatabase();

  const results = await db.getAllAsync<ChangeLogEntry>(
    `SELECT
      id, entity_type, entity_id, operation, payload, priority,
      created_at, synced_at, retry_count, last_error
    FROM change_log
    WHERE synced_at IS NULL
      AND retry_count >= ?
    ORDER BY created_at DESC`,
    [SYNC_MAX_RETRY_COUNT]
  );

  return results;
}

/**
 * Delete synced entries older than specified days
 * Used for cleanup to prevent database bloat
 * @param daysOld - Number of days (default: 30)
 * @returns Number of deleted entries
 */
export async function cleanupOldEntries(daysOld = 30): Promise<number> {
  const db = await getDatabase();

  if (daysOld <= 0) {
    throw new DatabaseError('Days must be a positive number', 'VALIDATION_ERROR');
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoff = cutoffDate.toISOString();

  const result = await db.runAsync(
    `DELETE FROM change_log
     WHERE synced_at IS NOT NULL
       AND synced_at < ?`,
    [cutoff]
  );

  return result.changes ?? 0;
}

/**
 * Clear all change log entries (for testing purposes only)
 */
export async function clearAllEntries(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM change_log');
}

/**
 * Reset retry count for failed entries
 * Allows retrying failed syncs
 * @param ids - Array of change log entry IDs (if empty, resets all failed entries)
 */
export async function resetRetryCount(ids?: number[]): Promise<number> {
  const db = await getDatabase();

  if (ids && ids.length > 0) {
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new DatabaseError('All IDs must be positive integers', 'VALIDATION_ERROR');
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = await db.runAsync(
      `UPDATE change_log
       SET retry_count = 0, last_error = NULL
       WHERE id IN (${placeholders})`,
      ids
    );

    return result.changes ?? 0;
  } else {
    // Reset all failed entries
    const result = await db.runAsync(
      `UPDATE change_log
       SET retry_count = 0, last_error = NULL
       WHERE synced_at IS NULL AND retry_count >= ?`,
      [SYNC_MAX_RETRY_COUNT]
    );

    return result.changes ?? 0;
  }
}

/**
 * Get statistics about the change log
 * @returns Change log statistics
 */
export async function getChangeLogStats(): Promise<{
  total: number;
  unsynced: number;
  synced: number;
  failed: number;
  byEntityType: Record<string, number>;
  byOperation: Record<string, number>;
}> {
  const db = await getDatabase();

  const total = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM change_log'
  );

  const unsynced = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM change_log WHERE synced_at IS NULL AND retry_count < ?',
    [SYNC_MAX_RETRY_COUNT]
  );

  const synced = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM change_log WHERE synced_at IS NOT NULL'
  );

  const failed = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM change_log WHERE synced_at IS NULL AND retry_count >= ?',
    [SYNC_MAX_RETRY_COUNT]
  );

  const byEntityTypeResults = await db.getAllAsync<{ entity_type: string; count: number }>(
    `SELECT entity_type, COUNT(*) as count
     FROM change_log
     WHERE synced_at IS NULL
     GROUP BY entity_type`
  );

  const byOperationResults = await db.getAllAsync<{ operation: string; count: number }>(
    `SELECT operation, COUNT(*) as count
     FROM change_log
     WHERE synced_at IS NULL
     GROUP BY operation`
  );

  const byEntityType: Record<string, number> = {};
  for (const row of byEntityTypeResults) {
    byEntityType[row.entity_type] = row.count;
  }

  const byOperation: Record<string, number> = {};
  for (const row of byOperationResults) {
    byOperation[row.operation] = row.count;
  }

  return {
    total: total?.count ?? 0,
    unsynced: unsynced?.count ?? 0,
    synced: synced?.count ?? 0,
    failed: failed?.count ?? 0,
    byEntityType,
    byOperation,
  };
}

// Helper functions

/**
 * Calculate priority for a change log entry
 * Higher priority = synced first
 * Priority levels:
 * - 3: High priority (reflections, user data)
 * - 2: Medium priority (notes, relations)
 * - 1: Low priority (search history)
 */
function calculatePriority(entityType: string, operation: string): number {
  // High priority entities
  if (entityType === 'reflection' || entityType === 'user') {
    return 3;
  }

  // Medium priority entities
  if (entityType === 'note' || entityType === 'relation') {
    // Delete operations have higher priority within the same entity type
    return operation === 'delete' ? 2 : 2;
  }

  // Low priority entities
  return 1;
}

/**
 * Estimate the size of a change log entry in bytes
 * Used for batch size calculation
 */
function estimateEntrySize(entry: ChangeLogEntry): number {
  // Rough estimate: JSON string length + metadata overhead
  const payloadSize = typeof entry.payload === 'string'
    ? entry.payload.length
    : JSON.stringify(entry.payload).length;

  const metadataSize = 200; // Approximate size of other fields
  return payloadSize + metadataSize;
}
