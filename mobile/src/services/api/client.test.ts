/**
 * API Client Tests
 *
 * Tests for HTTP client functionality including authentication,
 * error handling, and request/response processing.
 */

import { apiRequest, post, get, ApiError } from './client';
import * as auth from '@/utils/auth';
import { TIMEOUTS, DEFAULT_HEADERS } from '@/constants/api';

// Mock fetch globally
global.fetch = jest.fn();

// Mock auth module
jest.mock('@/utils/auth');

describe('API Client', () => {
  const mockAccessToken = 'mock-access-token';
  const testUrl = 'https://api.example.com/test';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (auth.getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);
  });

  describe('ApiError', () => {
    it('should create error with message and status code', () => {
      const error = new ApiError('Test error', 404);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('should create error with response data', () => {
      const responseData = { error: 'Not found' };
      const error = new ApiError('Test error', 404, responseData);
      expect(error.responseData).toEqual(responseData);
    });
  });

  describe('apiRequest', () => {
    describe('Authentication', () => {
      it('should include access token in Authorization header', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ success: true }),
        });

        await apiRequest(testUrl);

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${mockAccessToken}`,
            }),
          })
        );
      });

      it('should throw ApiError when no access token is available', async () => {
        (auth.getAccessToken as jest.Mock).mockResolvedValue(null);

        await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl)).rejects.toThrow('No access token available');
      });
    });

    describe('Request Configuration', () => {
      it('should use GET method by default', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        await apiRequest(testUrl);

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      it('should include default headers', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        await apiRequest(testUrl);

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            headers: expect.objectContaining(DEFAULT_HEADERS),
          })
        );
      });

      it('should allow custom headers', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        const customHeaders = { 'X-Custom': 'value' };
        await apiRequest(testUrl, { headers: customHeaders });

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            headers: expect.objectContaining(customHeaders),
          })
        );
      });

      it('should stringify body for POST requests', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        const body = { data: 'test' };
        await apiRequest(testUrl, { method: 'POST', body });

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(body),
          })
        );
      });

      it('should use custom timeout when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        const customTimeout = 5000;
        await apiRequest(testUrl, { timeout: customTimeout });

        // Verify signal was created (timeout is handled internally)
        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });
    });

    describe('Response Handling', () => {
      it('should parse JSON response', async () => {
        const mockData = { id: 1, name: 'Test' };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => mockData,
        });

        const result = await apiRequest(testUrl);

        expect(result).toEqual(mockData);
      });

      it('should parse text response when content-type is not JSON', async () => {
        const mockText = 'Plain text response';
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'text/plain']]),
          text: async () => mockText,
        });

        const result = await apiRequest(testUrl);

        expect(result).toBe(mockText);
      });

      it('should handle response without content-type header', async () => {
        const mockText = 'Response without content-type';
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map(),
          text: async () => mockText,
        });

        const result = await apiRequest(testUrl);

        expect(result).toBe(mockText);
      });
    });

    describe('Error Handling', () => {
      it('should throw ApiError for HTTP 4xx errors', async () => {
        const errorData = { error: 'Bad request' };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => errorData,
        });

        await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl)).rejects.toMatchObject({
          statusCode: 400,
          responseData: errorData,
        });
      });

      it('should throw ApiError for HTTP 5xx errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error',
        });

        await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl)).rejects.toMatchObject({
          statusCode: 500,
        });
      });

      it('should handle error response with text instead of JSON', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => {
            throw new Error('Not JSON');
          },
          text: async () => 'Error text',
        });

        await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl)).rejects.toMatchObject({
          statusCode: 500,
          responseData: 'Error text',
        });
      });

      it('should throw ApiError on timeout', async () => {
        (global.fetch as jest.Mock).mockImplementation(
          () =>
            new Promise((_, reject) => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              setTimeout(() => reject(error), 10);
            })
        );

        await expect(apiRequest(testUrl, { timeout: 50 })).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl, { timeout: 50 })).rejects.toMatchObject({
          statusCode: 408,
        });
      });

      it('should throw ApiError on network error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network failure'));

        await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl)).rejects.toThrow('Network error');
      });

      it('should re-throw ApiError instances', async () => {
        const customError = new ApiError('Custom error', 503);
        (global.fetch as jest.Mock).mockRejectedValue(customError);

        await expect(apiRequest(testUrl)).rejects.toThrow(customError);
      });

      it('should wrap unknown errors in ApiError', async () => {
        (global.fetch as jest.Mock).mockRejectedValue('Unknown error');

        await expect(apiRequest(testUrl)).rejects.toThrow(ApiError);
        await expect(apiRequest(testUrl)).rejects.toThrow('Unknown error');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('post', () => {
      it('should make POST request with body', async () => {
        const mockResponse = { success: true };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => mockResponse,
        });

        const body = { data: 'test' };
        const result = await post(testUrl, body);

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(body),
          })
        );
      });

      it('should use custom timeout', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        const customTimeout = 3000;
        await post(testUrl, {}, customTimeout);

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });
    });

    describe('get', () => {
      it('should make GET request', async () => {
        const mockResponse = { data: 'test' };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => mockResponse,
        });

        const result = await get(testUrl);

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      it('should use custom timeout', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({}),
        });

        const customTimeout = 3000;
        await get(testUrl, customTimeout);

        expect(global.fetch).toHaveBeenCalledWith(
          testUrl,
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });
    });
  });
});
