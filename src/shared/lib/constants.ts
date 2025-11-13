/**
 * Application constants
 */

export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';
export const IS_PRODUCTION = import.meta.env.MODE === 'production';

/**
 * API Configuration
 */
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  AUTH_CALLBACK: '/auth/callback',
} as const;

/**
 * LocalStorage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
} as const;

