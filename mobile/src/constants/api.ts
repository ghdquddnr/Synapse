// API endpoint URLs and configuration

// Base URL - should be configured via environment variables
// For development, use localhost or ngrok URL
// For production, use actual server URL
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000' // Development (Android emulator use 10.0.2.2:8000)
  : 'https://api.synapse.example.com'; // Production (replace with actual URL)

// API version
export const API_VERSION = 'v1';

// Full API base path
export const API_PATH = `${API_BASE_URL}/api/${API_VERSION}`;

// Auth endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_PATH}/auth/login`,
  REFRESH: `${API_PATH}/auth/refresh`,
  REGISTER: `${API_PATH}/auth/register`,
} as const;

// Sync endpoints
export const SYNC_ENDPOINTS = {
  PUSH: `${API_PATH}/sync/push`,
  PULL: `${API_PATH}/sync/pull`,
} as const;

// Recommendation endpoints
export const RECOMMENDATION_ENDPOINTS = {
  GET_RECOMMENDATIONS: (noteId: string) => `${API_PATH}/recommend/${noteId}`,
} as const;

// Report endpoints
export const REPORT_ENDPOINTS = {
  WEEKLY: `${API_PATH}/reports/weekly`,
} as const;

// HTTP request timeouts (milliseconds)
export const TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  AUTH: 15000, // 15 seconds
  SYNC: 30000, // 30 seconds
  RECOMMENDATION: 20000, // 20 seconds (AI processing)
  REPORT: 30000, // 30 seconds (clustering)
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_FACTOR: 2, // Exponential backoff
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const;

// Android emulator localhost helper
export const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // Android emulator needs 10.0.2.2 instead of localhost
    // iOS simulator can use localhost
    // For actual device, use your computer's IP address or ngrok
    return API_BASE_URL;
  }
  return API_BASE_URL;
};
