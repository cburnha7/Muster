import { ApiServiceConfig } from './BaseApiService';

/**
 * API service configuration for different environments
 */
const getBaseURL = () => {
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  
  // If environment variable is set, use it
  if (envURL) {
    return envURL;
  }
  
  // Default to localhost for development
  if (__DEV__) {
    return 'http://localhost:3000/api';
  }
  
  // Production fallback
  return 'https://muster-production.up.railway.app/api';
};

export const apiConfig: ApiServiceConfig = {
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay
  enableLogging: __DEV__, // Enable detailed logging in development
  enableCaching: true, // Enable request caching for performance
};

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Events
  EVENTS: {
    BASE: '/events',
    BY_ID: (id: string) => `/events/${id}`,
    BOOK: (id: string) => `/events/${id}/book`,
    PARTICIPANTS: (id: string) => `/events/${id}/participants`,
    NEARBY: '/events/nearby',
    RECOMMENDED: '/events/recommended',
  },

  // Facilities
  FACILITIES: {
    BASE: '/facilities',
    BY_ID: (id: string) => `/facilities/${id}`,
    EVENTS: (id: string) => `/facilities/${id}/events`,
    IMAGES: (id: string) => `/facilities/${id}/images`,
    NEARBY: '/facilities/nearby',
  },

  // Users
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    PROFILE_IMAGE: '/users/profile/image',
    BOOKINGS: '/users/bookings',
    EVENTS: '/users/events',
    TEAMS: '/users/teams',
    NOTIFICATIONS: '/users/notifications',
  },

  // Teams
  TEAMS: {
    BASE: '/teams',
    BY_ID: (id: string) => `/teams/${id}`,
    JOIN: (id: string) => `/teams/${id}/join`,
    LEAVE: (id: string) => `/teams/${id}/leave`,
    INVITE: (id: string) => `/teams/${id}/invite`,
    REMOVE_MEMBER: (teamId: string, userId: string) => `/teams/${teamId}/members/${userId}`,
    EVENTS: (id: string) => `/teams/${id}/events`,
    UPDATE_ROLE: (teamId: string, userId: string) => `/teams/${teamId}/members/${userId}/role`,
    NEARBY: '/teams/nearby',
    RECOMMENDED: '/teams/recommended',
  },

  // Bookings
  BOOKINGS: {
    BASE: '/bookings',
    BY_ID: (id: string) => `/bookings/${id}`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
  },

  // Search
  SEARCH: {
    BASE: '/search',
    EVENTS: '/search/events',
    FACILITIES: '/search/facilities',
    TEAMS: '/search/teams',
  },

  // Notifications
  NOTIFICATIONS: {
    REGISTER: '/notifications/register',
    PREFERENCES: '/notifications/preferences',
    TEST: '/notifications/test',
  },
} as const;

/**
 * HTTP status codes for common scenarios
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Common error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Business logic errors
  EVENT_FULL: 'EVENT_FULL',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  TEAM_FULL: 'TEAM_FULL',
  ALREADY_MEMBER: 'ALREADY_MEMBER',

  // System errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Request timeout configurations for different types of operations
 */
export const TIMEOUT_CONFIG = {
  FAST: 5000,      // 5 seconds - for quick operations
  NORMAL: 15000,   // 15 seconds - for normal operations
  SLOW: 30000,     // 30 seconds - for slow operations like file uploads
  UPLOAD: 60000,   // 60 seconds - for file uploads
} as const;

/**
 * Cache configuration for different types of data
 */
export const CACHE_CONFIG = {
  USER_PROFILE: {
    ttl: 5 * 60 * 1000, // 5 minutes
    key: 'user_profile',
  },
  FACILITIES: {
    ttl: 10 * 60 * 1000, // 10 minutes
    key: 'facilities',
  },
  EVENTS: {
    ttl: 2 * 60 * 1000, // 2 minutes
    key: 'events',
  },
  TEAMS: {
    ttl: 5 * 60 * 1000, // 5 minutes
    key: 'teams',
  },
} as const;