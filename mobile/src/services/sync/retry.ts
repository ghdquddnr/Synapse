/**
 * Retry Logic with Exponential Backoff
 *
 * Provides retry utilities for sync operations with exponential backoff.
 */

import { RETRY_CONFIG } from '@/constants/api';
import { SYNC_MAX_RETRY_COUNT } from '@/constants/database';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: RETRY_CONFIG.MAX_RETRIES,
  initialDelay: RETRY_CONFIG.INITIAL_DELAY,
  maxDelay: RETRY_CONFIG.MAX_DELAY,
  backoffFactor: RETRY_CONFIG.BACKOFF_FACTOR,
};

/**
 * Calculate delay for a given retry attempt using exponential backoff
 *
 * Formula: min(initialDelay * (backoffFactor ^ retryCount), maxDelay)
 *
 * @param retryCount - Current retry attempt number (0-based)
 * @param config - Retry configuration (optional, uses defaults)
 * @returns Delay in milliseconds
 *
 * @example
 * calculateBackoffDelay(0) // 1000ms (initial)
 * calculateBackoffDelay(1) // 2000ms (1000 * 2^1)
 * calculateBackoffDelay(2) // 4000ms (1000 * 2^2)
 * calculateBackoffDelay(3) // 8000ms (1000 * 2^3)
 * calculateBackoffDelay(4) // 10000ms (capped at maxDelay)
 */
export function calculateBackoffDelay(
  retryCount: number,
  config: Partial<RetryConfig> = {}
): number {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  if (retryCount < 0) {
    return finalConfig.initialDelay;
  }

  // Calculate exponential backoff
  const delay =
    finalConfig.initialDelay * Math.pow(finalConfig.backoffFactor, retryCount);

  // Cap at max delay
  return Math.min(delay, finalConfig.maxDelay);
}

/**
 * Check if retry is allowed based on retry count
 *
 * @param retryCount - Current retry count
 * @param maxRetries - Maximum allowed retries (optional, uses default from database config)
 * @returns True if retry is allowed, false otherwise
 */
export function canRetry(
  retryCount: number,
  maxRetries: number = SYNC_MAX_RETRY_COUNT
): boolean {
  return retryCount < maxRetries;
}

/**
 * Sleep for a given duration
 *
 * @param milliseconds - Duration to sleep in milliseconds
 * @returns Promise that resolves after the delay
 */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration (optional)
 * @returns Result of the function
 * @throws Error if all retries are exhausted
 *
 * @example
 * const result = await retryWithBackoff(async () => {
 *   return await apiCall();
 * });
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this was the last attempt, throw
      if (attempt === finalConfig.maxRetries) {
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, finalConfig);

      console.log(
        `Retry attempt ${attempt + 1}/${finalConfig.maxRetries} failed. ` +
          `Retrying in ${delay}ms...`,
        error instanceof Error ? error.message : String(error)
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Check if an error is retryable
 *
 * Network errors, timeouts, and 5xx server errors are retryable.
 * 4xx client errors (except 429 Too Many Requests) are not retryable.
 *
 * @param error - Error to check
 * @returns True if error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  // Network errors (TypeError in fetch)
  if (error instanceof TypeError) {
    return true;
  }

  // Check if error has statusCode property (ApiError)
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: number }).statusCode === 'number'
  ) {
    const statusCode = (error as { statusCode: number }).statusCode;

    // 5xx server errors are retryable
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    // 429 Too Many Requests is retryable
    if (statusCode === 429) {
      return true;
    }

    // 408 Request Timeout is retryable
    if (statusCode === 408) {
      return true;
    }

    // 4xx client errors are not retryable (except 408, 429)
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }
  }

  // Timeout errors
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    ) {
      return true;
    }
  }

  // Default to not retryable for unknown errors
  return false;
}

/**
 * Execute a function with conditional retry based on error type
 *
 * Only retries if the error is retryable (network errors, 5xx, timeouts).
 * Does not retry on 4xx client errors.
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration (optional)
 * @returns Result of the function
 * @throws Error if all retries are exhausted or error is not retryable
 *
 * @example
 * const result = await retryWithBackoffConditional(async () => {
 *   return await syncPush();
 * });
 */
export async function retryWithBackoffConditional<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log('Error is not retryable, failing immediately:', error);
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === finalConfig.maxRetries) {
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, finalConfig);

      console.log(
        `Retry attempt ${attempt + 1}/${finalConfig.maxRetries} failed. ` +
          `Retrying in ${delay}ms...`,
        error instanceof Error ? error.message : String(error)
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}
