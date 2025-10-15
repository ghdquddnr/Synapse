/**
 * Unit tests for push sync service
 */

import { pushChanges, pushSingleBatch } from './push';
import * as apiClient from '@/services/api/client';
import * as changeLogDb from '@/services/database/changeLog';
import * as deviceUtil from '@/utils/device';
import type { SyncPushResponse } from '@/types/sync';
import type { ChangeLogEntry } from '@/types';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock dependencies
jest.mock('@/services/api/client');
jest.mock('@/services/database/changeLog');
jest.mock('@/utils/device');

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockGetUnsyncedChangesBatch = changeLogDb.getUnsyncedChangesBatch as jest.MockedFunction<
  typeof changeLogDb.getUnsyncedChangesBatch
>;
const mockMarkAsSynced = changeLogDb.markAsSynced as jest.MockedFunction<
  typeof changeLogDb.markAsSynced
>;
const mockIncrementRetryCount = changeLogDb.incrementRetryCount as jest.MockedFunction<
  typeof changeLogDb.incrementRetryCount
>;
const mockGetDeviceId = deviceUtil.getDeviceId as jest.MockedFunction<
  typeof deviceUtil.getDeviceId
>;

// Mock console to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('push sync service', () => {
  const mockDeviceId = 'device-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDeviceId.mockResolvedValue(mockDeviceId);
    mockMarkAsSynced.mockResolvedValue(undefined);
    mockIncrementRetryCount.mockResolvedValue(undefined);
  });

  const createMockChangeLogEntry = (
    overrides?: Partial<ChangeLogEntry>
  ): ChangeLogEntry => ({
    id: 1,
    entity_type: 'note',
    entity_id: 'note-123',
    operation: 'insert',
    payload: JSON.stringify({ body: 'Test note', importance: 2 }),
    priority: 2,
    created_at: new Date().toISOString(),
    synced_at: null,
    retry_count: 0,
    last_error: null,
    ...overrides,
  });

  describe('pushSingleBatch', () => {
    it('should return success with zero counts when no changes', async () => {
      mockGetUnsyncedChangesBatch.mockResolvedValue([]);

      const result = await pushSingleBatch();

      expect(result).toEqual({
        success: true,
        pushed_count: 0,
        failed_count: 0,
        has_more: false,
      });
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should successfully push single change', async () => {
      const change = createMockChangeLogEntry();
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change])
        .mockResolvedValueOnce([]); // No more changes

      const mockResponse: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [
          {
            entity_id: 'note-123',
            success: true,
          },
        ],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await pushSingleBatch();

      expect(result).toEqual({
        success: true,
        pushed_count: 1,
        failed_count: 0,
        has_more: false,
      });
      expect(mockMarkAsSynced).toHaveBeenCalledWith([1]);
      expect(mockIncrementRetryCount).not.toHaveBeenCalled();
    });

    it('should handle partial success', async () => {
      const change1 = createMockChangeLogEntry({ id: 1, entity_id: 'note-1' });
      const change2 = createMockChangeLogEntry({ id: 2, entity_id: 'note-2' });
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change1, change2])
        .mockResolvedValueOnce([]); // No more changes

      const mockResponse: SyncPushResponse = {
        success_count: 1,
        failure_count: 1,
        results: [
          {
            entity_id: 'note-1',
            success: true,
          },
          {
            entity_id: 'note-2',
            success: false,
            error: 'Validation error',
          },
        ],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await pushSingleBatch();

      expect(result).toEqual({
        success: true,
        pushed_count: 1,
        failed_count: 1,
        has_more: false,
      });
      expect(mockMarkAsSynced).toHaveBeenCalledWith([1]);
      expect(mockIncrementRetryCount).toHaveBeenCalledWith(2, 'Validation error');
    });

    it('should handle API error', async () => {
      const change = createMockChangeLogEntry();
      mockGetUnsyncedChangesBatch.mockResolvedValue([change]);
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await pushSingleBatch();

      expect(result).toEqual({
        success: false,
        pushed_count: 0,
        failed_count: 0,
        has_more: false,
        error: 'Network error',
      });
      expect(mockMarkAsSynced).not.toHaveBeenCalled();
      expect(mockIncrementRetryCount).not.toHaveBeenCalled();
    });

    it('should parse JSON payload strings', async () => {
      const change = createMockChangeLogEntry({
        payload: '{"body":"Test","importance":2}',
      });
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change])
        .mockResolvedValueOnce([]);

      const mockResponse: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-123', success: true }],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue(mockResponse);

      await pushSingleBatch();

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              payload: { body: 'Test', importance: 2 },
            }),
          ]),
        }),
        expect.any(Number)
      );
    });

    it('should indicate has_more when changes remain', async () => {
      const change = createMockChangeLogEntry();
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change])
        .mockResolvedValueOnce([createMockChangeLogEntry({ id: 2 })]); // More changes

      const mockResponse: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-123', success: true }],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await pushSingleBatch();

      expect(result.has_more).toBe(true);
    });

    it('should include device_id in request', async () => {
      const change = createMockChangeLogEntry();
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change])
        .mockResolvedValueOnce([]);

      const mockResponse: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-123', success: true }],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue(mockResponse);

      await pushSingleBatch();

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          device_id: mockDeviceId,
        }),
        expect.any(Number)
      );
    });
  });

  describe('pushChanges (recursive)', () => {
    it('should return success when no changes', async () => {
      mockGetUnsyncedChangesBatch.mockResolvedValue([]);

      const result = await pushChanges();

      expect(result).toEqual({
        success: true,
        pushed_count: 0,
        failed_count: 0,
        has_more: false,
      });
    });

    it('should push single batch and stop when no more changes', async () => {
      const change = createMockChangeLogEntry();
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change])
        .mockResolvedValueOnce([]); // No more changes

      const mockResponse: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-123', success: true }],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await pushChanges();

      expect(result).toEqual({
        success: true,
        pushed_count: 1,
        failed_count: 0,
        has_more: false,
      });
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should recursively push multiple batches', async () => {
      const change1 = createMockChangeLogEntry({ id: 1 });
      const change2 = createMockChangeLogEntry({ id: 2 });

      // First batch call
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change1])
        .mockResolvedValueOnce([change2]) // Has more
        // Second batch call
        .mockResolvedValueOnce([change2])
        .mockResolvedValueOnce([]); // No more

      const mockResponse1: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-123', success: true }],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };

      const mockResponse2: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-123', success: true }],
        new_checkpoint: '2024-01-01T00:00:01Z',
      };

      mockPost
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await pushChanges();

      expect(result).toEqual({
        success: true,
        pushed_count: 2,
        failed_count: 0,
        has_more: false,
      });
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should accumulate success and failure counts', async () => {
      const change1 = createMockChangeLogEntry({ id: 1, entity_id: 'note-1' });
      const change2 = createMockChangeLogEntry({ id: 2, entity_id: 'note-2' });
      const change3 = createMockChangeLogEntry({ id: 3, entity_id: 'note-3' });

      // First batch: 1 success, 1 failure
      mockGetUnsyncedChangesBatch
        .mockResolvedValueOnce([change1, change2])
        .mockResolvedValueOnce([change3]) // Has more
        // Second batch: 1 success
        .mockResolvedValueOnce([change3])
        .mockResolvedValueOnce([]); // No more

      const mockResponse1: SyncPushResponse = {
        success_count: 1,
        failure_count: 1,
        results: [
          { entity_id: 'note-1', success: true },
          { entity_id: 'note-2', success: false, error: 'Error' },
        ],
        new_checkpoint: '2024-01-01T00:00:00Z',
      };

      const mockResponse2: SyncPushResponse = {
        success_count: 1,
        failure_count: 0,
        results: [{ entity_id: 'note-3', success: true }],
        new_checkpoint: '2024-01-01T00:00:01Z',
      };

      mockPost
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await pushChanges();

      expect(result).toEqual({
        success: true,
        pushed_count: 2,
        failed_count: 1,
        has_more: false,
      });
    });

    it('should handle API error and stop recursion', async () => {
      const change = createMockChangeLogEntry();
      mockGetUnsyncedChangesBatch.mockResolvedValue([change]);
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await pushChanges();

      expect(result).toEqual({
        success: false,
        pushed_count: 0,
        failed_count: 0,
        has_more: false,
        error: 'Network error',
      });
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });
});
