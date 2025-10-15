/**
 * Sync Queue Management
 * Phase 6.5: Queue Management
 *
 * High-level queue management functions for sync operations.
 * Wraps changeLog functions with additional business logic.
 */

import {
  getQueueSize as dbGetQueueSize,
  getQueueStatus as dbGetQueueStatus,
  getUnsyncedChanges,
  getFailedEntries,
  resetRetryCount,
  cleanupOldEntries,
  getChangeLogStats,
} from '../database/changeLog';
import type { ChangeLogEntry } from '../../types';
import type { QueueStatus } from '../../types/sync';
import {
  SYNC_QUEUE_WARNING_SIZE,
  SYNC_QUEUE_MAX_SIZE,
  SYNC_BATCH_MAX_SIZE,
} from '../../constants/database';

/**
 * Get current queue size
 */
export async function getQueueSize(): Promise<number> {
  return await dbGetQueueSize();
}

/**
 * Get priority queue entries
 * Returns unsynced changes ordered by priority (desc) and created_at (asc)
 * @param limit - Maximum number of entries to retrieve
 */
export async function getPriorityQueue(
  limit: number = SYNC_BATCH_MAX_SIZE
): Promise<ChangeLogEntry[]> {
  return await getUnsyncedChanges(limit);
}

/**
 * Check queue limits and return status
 * @returns Queue status with warnings
 */
export async function checkQueueLimits(): Promise<QueueStatus> {
  const size = await getQueueSize();
  const isFull = size >= SYNC_QUEUE_MAX_SIZE;
  const isReadonly = isFull; // Read-only mode when queue is full

  return {
    size,
    limit: SYNC_QUEUE_MAX_SIZE,
    is_full: isFull,
    is_readonly: isReadonly,
  };
}

/**
 * Check if queue is in warning state
 * @returns True if queue size >= 80% of max size
 */
export async function isQueueWarning(): Promise<boolean> {
  const size = await getQueueSize();
  return size >= SYNC_QUEUE_WARNING_SIZE;
}

/**
 * Check if queue is full (read-only mode)
 * @returns True if queue size >= max size
 */
export async function isQueueFull(): Promise<boolean> {
  const size = await getQueueSize();
  return size >= SYNC_QUEUE_MAX_SIZE;
}

/**
 * Get detailed queue status with statistics
 */
export async function getDetailedQueueStatus(): Promise<{
  size: number;
  limit: number;
  is_full: boolean;
  is_readonly: boolean;
  warning: boolean;
  message: string | null;
  failed_count: number;
  stats: {
    total: number;
    unsynced: number;
    synced: number;
    failed: number;
    byEntityType: Record<string, number>;
    byOperation: Record<string, number>;
  };
}> {
  const dbStatus = await dbGetQueueStatus();
  const queueStatus = await checkQueueLimits();
  const stats = await getChangeLogStats();

  return {
    size: queueStatus.size,
    limit: queueStatus.limit,
    is_full: queueStatus.is_full,
    is_readonly: queueStatus.is_readonly,
    warning: dbStatus.warning,
    message: dbStatus.message,
    failed_count: stats.failed,
    stats,
  };
}

/**
 * Get failed queue entries
 * Returns entries that exceeded retry limit
 */
export async function getFailedQueueEntries(): Promise<ChangeLogEntry[]> {
  return await getFailedEntries();
}

/**
 * Retry failed queue entries
 * Resets retry count for specified entries or all failed entries
 * @param ids - Optional array of entry IDs to retry (if not specified, retries all failed)
 * @returns Number of entries reset
 */
export async function retryFailedEntries(ids?: number[]): Promise<number> {
  return await resetRetryCount(ids);
}

/**
 * Clean up old synced entries
 * Removes entries older than specified days to prevent database bloat
 * @param daysOld - Age threshold in days (default: 30)
 * @returns Number of entries deleted
 */
export async function cleanupOldSyncedEntries(daysOld: number = 30): Promise<number> {
  return await cleanupOldEntries(daysOld);
}

/**
 * Get queue health metrics
 * Returns health indicators for monitoring
 */
export async function getQueueHealth(): Promise<{
  healthy: boolean;
  size: number;
  capacity_used_percent: number;
  failed_count: number;
  warnings: string[];
}> {
  const size = await getQueueSize();
  const stats = await getChangeLogStats();
  const capacityUsedPercent = Math.round((size / SYNC_QUEUE_MAX_SIZE) * 100);

  const warnings: string[] = [];
  let healthy = true;

  // Check capacity
  if (size >= SYNC_QUEUE_MAX_SIZE) {
    healthy = false;
    warnings.push('Queue is full - app in read-only mode');
  } else if (size >= SYNC_QUEUE_WARNING_SIZE) {
    warnings.push(`Queue is ${capacityUsedPercent}% full - approaching limit`);
  }

  // Check failed entries
  if (stats.failed > 0) {
    warnings.push(`${stats.failed} entries have failed after max retries`);
    if (stats.failed > 10) {
      healthy = false;
    }
  }

  // Check if unsynced entries are growing
  if (size > 100) {
    warnings.push(`Large backlog: ${size} unsynced entries`);
  }

  return {
    healthy,
    size,
    capacity_used_percent: capacityUsedPercent,
    failed_count: stats.failed,
    warnings,
  };
}

/**
 * Should sync be paused?
 * Returns true if queue is in a state that requires sync to be paused
 */
export async function shouldPauseSync(): Promise<boolean> {
  const queueStatus = await checkQueueLimits();

  // Pause if queue is full (read-only mode)
  if (queueStatus.is_full) {
    return true;
  }

  return false;
}

/**
 * Can accept new changes?
 * Returns false if queue is full
 */
export async function canAcceptChanges(): Promise<boolean> {
  const queueStatus = await checkQueueLimits();
  return !queueStatus.is_full;
}

/**
 * Get queue summary for UI display
 */
export async function getQueueSummary(): Promise<{
  size: number;
  status: 'healthy' | 'warning' | 'full';
  message: string;
  failed_count: number;
}> {
  const health = await getQueueHealth();
  const stats = await getChangeLogStats();

  let status: 'healthy' | 'warning' | 'full';
  let message: string;

  if (health.size >= SYNC_QUEUE_MAX_SIZE) {
    status = 'full';
    message = 'Sync queue is full - app in read-only mode';
  } else if (health.size >= SYNC_QUEUE_WARNING_SIZE) {
    status = 'warning';
    message = `Sync queue ${health.capacity_used_percent}% full`;
  } else {
    status = 'healthy';
    message = `${health.size} items pending sync`;
  }

  return {
    size: health.size,
    status,
    message,
    failed_count: stats.failed,
  };
}
