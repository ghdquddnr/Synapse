/**
 * Unit tests for retry logic with exponential backoff
 */

import {
  calculateBackoffDelay,
  canRetry,
  sleep,
  retryWithBackoff,
  isRetryableError,
  retryWithBackoffConditional,
} from './retry';
import { RETRY_CONFIG } from '@/constants/api';
import { SYNC_MAX_RETRY_COUNT } from '@/constants/database';

// Mock console to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe('retry utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate correct delays with default config', () => {
      expect(calculateBackoffDelay(0)).toBe(1000); // 1s
      expect(calculateBackoffDelay(1)).toBe(2000); // 2s
      expect(calculateBackoffDelay(2)).toBe(4000); // 4s
      expect(calculateBackoffDelay(3)).toBe(8000); // 8s
      expect(calculateBackoffDelay(4)).toBe(10000); // 10s (capped)
      expect(calculateBackoffDelay(5)).toBe(10000); // 10s (capped)
    });

    it('should handle negative retry count', () => {
      expect(calculateBackoffDelay(-1)).toBe(1000);
      expect(calculateBackoffDelay(-5)).toBe(1000);
    });

    it('should respect custom config', () => {
      const customConfig = {
        initialDelay: 500,
        maxDelay: 5000,
        backoffFactor: 3,
      };

      expect(calculateBackoffDelay(0, customConfig)).toBe(500); // 500ms
      expect(calculateBackoffDelay(1, customConfig)).toBe(1500); // 500 * 3
      expect(calculateBackoffDelay(2, customConfig)).toBe(4500); // 500 * 9
      expect(calculateBackoffDelay(3, customConfig)).toBe(5000); // capped at 5000
    });

    it('should cap at maxDelay', () => {
      const config = { maxDelay: 3000 };
      expect(calculateBackoffDelay(10, config)).toBe(3000);
      expect(calculateBackoffDelay(100, config)).toBe(3000);
    });
  });

  describe('canRetry', () => {
    it('should allow retry when under limit', () => {
      expect(canRetry(0)).toBe(true);
      expect(canRetry(1)).toBe(true);
      expect(canRetry(SYNC_MAX_RETRY_COUNT - 1)).toBe(true);
    });

    it('should not allow retry when at or over limit', () => {
      expect(canRetry(SYNC_MAX_RETRY_COUNT)).toBe(false);
      expect(canRetry(SYNC_MAX_RETRY_COUNT + 1)).toBe(false);
      expect(canRetry(100)).toBe(false);
    });

    it('should respect custom max retries', () => {
      expect(canRetry(2, 5)).toBe(true);
      expect(canRetry(5, 5)).toBe(false);
      expect(canRetry(4, 5)).toBe(true);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      // Allow 50ms margin for test execution
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(150);
    });

    it('should resolve immediately for zero duration', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;

      // Allow more margin for test execution overhead
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second attempt', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockFn, { initialDelay: 10 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw last error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        retryWithBackoff(mockFn, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow('Always fails');

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should apply exponential backoff', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      await retryWithBackoff(mockFn, {
        initialDelay: 50,
        backoffFactor: 2,
        maxRetries: 3,
      });
      const elapsed = Date.now() - start;

      // Should wait 50ms + 100ms = 150ms total
      expect(elapsed).toBeGreaterThanOrEqual(150);
      expect(elapsed).toBeLessThan(250); // Allow margin
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkError = new TypeError('Network request failed');
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should identify 5xx errors as retryable', () => {
      expect(isRetryableError({ statusCode: 500 })).toBe(true);
      expect(isRetryableError({ statusCode: 502 })).toBe(true);
      expect(isRetryableError({ statusCode: 503 })).toBe(true);
      expect(isRetryableError({ statusCode: 504 })).toBe(true);
    });

    it('should identify 429 as retryable', () => {
      expect(isRetryableError({ statusCode: 429 })).toBe(true);
    });

    it('should identify 408 timeout as retryable', () => {
      expect(isRetryableError({ statusCode: 408 })).toBe(true);
    });

    it('should identify 4xx errors as not retryable', () => {
      expect(isRetryableError({ statusCode: 400 })).toBe(false);
      expect(isRetryableError({ statusCode: 401 })).toBe(false);
      expect(isRetryableError({ statusCode: 403 })).toBe(false);
      expect(isRetryableError({ statusCode: 404 })).toBe(false);
    });

    it('should identify timeout messages as retryable', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError(new Error('Connection timeout'))).toBe(true);
      expect(isRetryableError(new Error('Network timeout'))).toBe(true);
    });

    it('should identify connection errors as retryable', () => {
      expect(isRetryableError(new Error('Connection failed'))).toBe(true);
      expect(isRetryableError(new Error('Network error'))).toBe(true);
    });

    it('should treat unknown errors as not retryable', () => {
      expect(isRetryableError(new Error('Unknown error'))).toBe(false);
      expect(isRetryableError({ message: 'Something went wrong' })).toBe(false);
      expect(isRetryableError('String error')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });

  describe('retryWithBackoffConditional', () => {
    it('should retry on retryable errors', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 503 })
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoffConditional(mockFn, {
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFn = jest.fn().mockRejectedValue({ statusCode: 400 });

      await expect(
        retryWithBackoffConditional(mockFn, { initialDelay: 10 })
      ).rejects.toEqual({ statusCode: 400 });

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoffConditional(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries on persistent retryable errors', async () => {
      const mockFn = jest.fn().mockRejectedValue({ statusCode: 503 });

      await expect(
        retryWithBackoffConditional(mockFn, {
          maxRetries: 2,
          initialDelay: 10,
        })
      ).rejects.toEqual({ statusCode: 503 });

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should retry network errors', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new TypeError('Network failed'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoffConditional(mockFn, {
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});
