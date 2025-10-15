/**
 * Sync orchestrator tests
 * Note: Some tests are simplified due to singleton state management
 */

import { syncOrchestrator, SyncResult } from './orchestrator';
import { pushChanges } from './push';
import { pullChanges } from './pull';
import { networkMonitor } from './networkMonitor';
import { shouldPauseSync } from './queue';

// Mock dependencies
jest.mock('./push');
jest.mock('./pull');
jest.mock('./networkMonitor');
jest.mock('./queue');

const mockPushChanges = pushChanges as jest.MockedFunction<typeof pushChanges>;
const mockPullChanges = pullChanges as jest.MockedFunction<typeof pullChanges>;
const mockIsConnected = networkMonitor.isConnected as jest.MockedFunction<
  typeof networkMonitor.isConnected
>;
const mockShouldPauseSync = shouldPauseSync as jest.MockedFunction<typeof shouldPauseSync>;

describe('syncOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset orchestrator state (accessing private properties for testing)
    (syncOrchestrator as any).isSyncing = false;
    (syncOrchestrator as any).lastSyncTime = 0;

    // Default mocks
    mockIsConnected.mockResolvedValue(true);
    mockShouldPauseSync.mockResolvedValue(false);
  });

  describe('sync()', () => {
    it('should successfully complete push and pull sync', async () => {
      mockPushChanges.mockResolvedValue({
        success: true,
        totalProcessed: 10,
        totalSucceeded: 10,
        totalFailed: 0,
        batches: [],
      });

      mockPullChanges.mockResolvedValue({
        success: true,
        totalProcessed: 5,
        upsertedCount: 5,
        deletedCount: 0,
        conflictsResolved: 0,
      });

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(true);
      expect(result.pushResult).toBeDefined();
      expect(result.pullResult).toBeDefined();
      expect(mockPushChanges).toHaveBeenCalledTimes(1);
      expect(mockPullChanges).toHaveBeenCalledTimes(1);
    });

    it('should skip sync if offline', async () => {
      mockIsConnected.mockResolvedValue(false);

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('offline');
      expect(mockPushChanges).not.toHaveBeenCalled();
      expect(mockPullChanges).not.toHaveBeenCalled();
    });

    it('should skip sync if queue is overloaded', async () => {
      mockShouldPauseSync.mockResolvedValue(true);

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('queue_overloaded');
      expect(mockPushChanges).not.toHaveBeenCalled();
      expect(mockPullChanges).not.toHaveBeenCalled();
    });

    it('should skip sync if already in progress', async () => {
      // Manually set syncing state
      (syncOrchestrator as any).isSyncing = true;
      (syncOrchestrator as any).lastSyncTime = Date.now();

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('sync_in_progress');

      // Reset state
      (syncOrchestrator as any).isSyncing = false;
    });

    it('should return error if push sync fails', async () => {
      mockPushChanges.mockResolvedValue({
        success: false,
        error: 'Network error',
        totalProcessed: 0,
        totalSucceeded: 0,
        totalFailed: 10,
        batches: [],
      });

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.pushResult).toBeDefined();
      expect(result.pushResult?.error).toBe('Network error');
      expect(mockPullChanges).not.toHaveBeenCalled(); // Should not proceed to pull
    });

    it('should return error if pull sync fails', async () => {
      mockPushChanges.mockResolvedValue({
        success: true,
        totalProcessed: 10,
        totalSucceeded: 10,
        totalFailed: 0,
        batches: [],
      });

      mockPullChanges.mockResolvedValue({
        success: false,
        error: 'Database error',
        totalProcessed: 0,
        upsertedCount: 0,
        deletedCount: 0,
        conflictsResolved: 0,
      });

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.pushResult).toBeDefined();
      expect(result.pullResult).toBeDefined();
      expect(result.pullResult?.error).toBe('Database error');
    });

    it('should handle exceptions during sync', async () => {
      mockPushChanges.mockRejectedValue(new Error('Unexpected error'));

      const result = await syncOrchestrator.sync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('manualSync()', () => {
    it('should trigger sync', async () => {
      mockPushChanges.mockResolvedValue({
        success: true,
        totalProcessed: 5,
        totalSucceeded: 5,
        totalFailed: 0,
        batches: [],
      });

      mockPullChanges.mockResolvedValue({
        success: true,
        totalProcessed: 3,
        upsertedCount: 3,
        deletedCount: 0,
        conflictsResolved: 0,
      });

      const result = await syncOrchestrator.manualSync();

      expect(result.success).toBe(true);
      expect(mockPushChanges).toHaveBeenCalled();
      expect(mockPullChanges).toHaveBeenCalled();
    });
  });

  describe('isSyncInProgress()', () => {
    it('should return false when not syncing', () => {
      expect(syncOrchestrator.isSyncInProgress()).toBe(false);
    });

    it('should return true during sync', () => {
      // Manually set syncing state
      (syncOrchestrator as any).isSyncing = true;
      expect(syncOrchestrator.isSyncInProgress()).toBe(true);

      // Reset state
      (syncOrchestrator as any).isSyncing = false;
      expect(syncOrchestrator.isSyncInProgress()).toBe(false);
    });
  });

  describe('getLastSyncTime()', () => {
    it('should return 0 initially', () => {
      const lastSync = syncOrchestrator.getLastSyncTime();
      expect(lastSync).toBe(0);
    });

    it('should update after sync', async () => {
      mockPushChanges.mockResolvedValue({
        success: true,
        totalProcessed: 5,
        totalSucceeded: 5,
        totalFailed: 0,
        batches: [],
      });

      mockPullChanges.mockResolvedValue({
        success: true,
        totalProcessed: 3,
        upsertedCount: 3,
        deletedCount: 0,
        conflictsResolved: 0,
      });

      const before = Date.now();
      await syncOrchestrator.sync();
      const lastSync = syncOrchestrator.getLastSyncTime();

      expect(lastSync).toBeGreaterThanOrEqual(before);
      expect(lastSync).toBeLessThanOrEqual(Date.now());
    });
  });
});
