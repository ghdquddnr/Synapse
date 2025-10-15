/**
 * Push Sync Service
 *
 * Manages pushing local changes to the server.
 * Implements batch processing, error handling, and recursive sync.
 */

import { post } from '@/services/api/client';
import { SYNC_ENDPOINTS, TIMEOUTS } from '@/constants/api';
import {
  getUnsyncedChangesBatch,
  markAsSynced,
  incrementRetryCount,
} from '@/services/database/changeLog';
import { getDeviceId } from '@/utils/device';
import type { SyncPushRequest, SyncPushResponse } from '@/types/sync';
import type { ChangeLogEntry } from '@/types';
import {
  SYNC_BATCH_MAX_SIZE,
  SYNC_BATCH_MAX_BYTES,
} from '@/constants/database';

export interface PushResult {
  success: boolean;
  pushed_count: number;
  failed_count: number;
  has_more: boolean;
  error?: string;
}

/**
 * Push local changes to server
 *
 * Process:
 * 1. Query unsynced changes (max 100 entries, 1MB)
 * 2. Serialize and send to POST /sync/push
 * 3. Handle response:
 *    - Success items: Mark as synced (update synced_at)
 *    - Failed items: Increment retry_count, store error
 * 4. If more unsynced changes exist, recursively call pushChanges
 *
 * @returns Push result with counts and status
 */
export async function pushChanges(): Promise<PushResult> {
  try {
    // Get unsynced changes batch
    const changes = await getUnsyncedChangesBatch(
      SYNC_BATCH_MAX_SIZE,
      SYNC_BATCH_MAX_BYTES
    );

    // No changes to sync
    if (changes.length === 0) {
      return {
        success: true,
        pushed_count: 0,
        failed_count: 0,
        has_more: false,
      };
    }

    // Get device ID
    const deviceId = await getDeviceId();

    // Prepare request payload
    const requestPayload: SyncPushRequest = {
      device_id: deviceId,
      changes: changes.map((change) => ({
        ...change,
        // Parse payload if it's a string
        payload:
          typeof change.payload === 'string'
            ? JSON.parse(change.payload)
            : change.payload,
      })),
    };

    // Send push request
    const response = await post<SyncPushResponse>(
      SYNC_ENDPOINTS.PUSH,
      requestPayload,
      TIMEOUTS.SYNC
    );

    // Process results
    const successIds: number[] = [];
    const failureUpdates: Array<{ id: number; error: string }> = [];

    for (const result of response.results) {
      // Find the corresponding change log entry
      const changeEntry = changes.find((c) => c.entity_id === result.entity_id);
      if (!changeEntry) {
        console.warn(`No matching change log entry for entity ${result.entity_id}`);
        continue;
      }

      if (result.success) {
        successIds.push(changeEntry.id);
      } else {
        failureUpdates.push({
          id: changeEntry.id,
          error: result.error || 'Unknown error',
        });
      }
    }

    // Update database
    // Mark successful syncs
    if (successIds.length > 0) {
      await markAsSynced(successIds);
    }

    // Increment retry count for failures
    for (const failure of failureUpdates) {
      await incrementRetryCount(failure.id, failure.error);
    }

    // Check if there are more changes to sync
    const remainingChanges = await getUnsyncedChangesBatch(1, SYNC_BATCH_MAX_BYTES);
    const hasMore = remainingChanges.length > 0;

    // Recursive call if there are more changes
    if (hasMore) {
      const nextResult = await pushChanges();
      return {
        success: true,
        pushed_count: response.success_count + nextResult.pushed_count,
        failed_count: response.failure_count + nextResult.failed_count,
        has_more: nextResult.has_more,
      };
    }

    return {
      success: true,
      pushed_count: response.success_count,
      failed_count: response.failure_count,
      has_more: false,
    };
  } catch (error) {
    console.error('Push sync failed:', error);

    return {
      success: false,
      pushed_count: 0,
      failed_count: 0,
      has_more: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Push a single batch of changes (non-recursive)
 *
 * Useful for testing or when you want more control over the sync process.
 *
 * @returns Push result for the single batch
 */
export async function pushSingleBatch(): Promise<PushResult> {
  try {
    // Get unsynced changes batch
    const changes = await getUnsyncedChangesBatch(
      SYNC_BATCH_MAX_SIZE,
      SYNC_BATCH_MAX_BYTES
    );

    // No changes to sync
    if (changes.length === 0) {
      return {
        success: true,
        pushed_count: 0,
        failed_count: 0,
        has_more: false,
      };
    }

    // Get device ID
    const deviceId = await getDeviceId();

    // Prepare request payload
    const requestPayload: SyncPushRequest = {
      device_id: deviceId,
      changes: changes.map((change) => ({
        ...change,
        // Parse payload if it's a string
        payload:
          typeof change.payload === 'string'
            ? JSON.parse(change.payload)
            : change.payload,
      })),
    };

    // Send push request
    const response = await post<SyncPushResponse>(
      SYNC_ENDPOINTS.PUSH,
      requestPayload,
      TIMEOUTS.SYNC
    );

    // Process results
    const successIds: number[] = [];
    const failureUpdates: Array<{ id: number; error: string }> = [];

    for (const result of response.results) {
      // Find the corresponding change log entry
      const changeEntry = changes.find((c) => c.entity_id === result.entity_id);
      if (!changeEntry) {
        console.warn(`No matching change log entry for entity ${result.entity_id}`);
        continue;
      }

      if (result.success) {
        successIds.push(changeEntry.id);
      } else {
        failureUpdates.push({
          id: changeEntry.id,
          error: result.error || 'Unknown error',
        });
      }
    }

    // Update database
    // Mark successful syncs
    if (successIds.length > 0) {
      await markAsSynced(successIds);
    }

    // Increment retry count for failures
    for (const failure of failureUpdates) {
      await incrementRetryCount(failure.id, failure.error);
    }

    // Check if there are more changes to sync
    const remainingChanges = await getUnsyncedChangesBatch(1, SYNC_BATCH_MAX_BYTES);
    const hasMore = remainingChanges.length > 0;

    return {
      success: true,
      pushed_count: response.success_count,
      failed_count: response.failure_count,
      has_more: hasMore,
    };
  } catch (error) {
    console.error('Push single batch failed:', error);

    return {
      success: false,
      pushed_count: 0,
      failed_count: 0,
      has_more: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
