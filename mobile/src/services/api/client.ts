/**
 * API Client
 *
 * HTTP client for communicating with the backend API.
 * Handles authentication, request/response, and error handling.
 */

import { SYNC_ENDPOINTS, TIMEOUTS, DEFAULT_HEADERS } from '@/constants/api';
import { getAccessToken } from '@/utils/auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * Make an authenticated API request
 * @param url - API endpoint URL
 * @param options - Request options
 * @returns Response data
 * @throws ApiError if request fails
 */
export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = TIMEOUTS.DEFAULT,
  } = options;

  // Get access token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError('No access token available', 401);
  }

  // Prepare headers
  const requestHeaders = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  // Prepare request
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  requestInit.signal = controller.signal;

  try {
    const response = await fetch(url, requestInit);
    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    // Non-JSON response
    return (await response.text()) as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeout}ms`, 408);
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError('Network error: ' + error.message);
    }

    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // Unknown error
    throw new ApiError('Unknown error: ' + String(error));
  }
}

/**
 * POST request helper
 */
export async function post<T>(
  url: string,
  body: unknown,
  timeout?: number
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    body,
    timeout,
  });
}

/**
 * GET request helper
 */
export async function get<T>(url: string, timeout?: number): Promise<T> {
  return apiRequest<T>(url, {
    method: 'GET',
    timeout,
  });
}
