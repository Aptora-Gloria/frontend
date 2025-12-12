import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, IS_DEVELOPMENT, STORAGE_KEYS } from './constants';
import type { AppError } from '@/shared/errors';
import { ERROR_CODES } from '@/shared/errors';

function normalizeError(error: unknown): AppError {
  const timestamp = new Date().toISOString();

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const responseData = error.response?.data;
    
    switch (status) {
      case 401:
        return {
          status: 401,
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Your session has expired. Please log in again.',
          details: responseData?.message || error.message,
          timestamp,
        };
      
      case 403:
        return {
          status: 403,
          code: ERROR_CODES.FORBIDDEN,
          message: 'You do not have permission to perform this action.',
          details: responseData?.message || error.message,
          timestamp,
        };
      
      case 404:
        return {
          status: 404,
          code: ERROR_CODES.NOT_FOUND,
          message: 'The requested resource was not found.',
          details: responseData?.message || error.message,
          timestamp,
        };
      
      case 429:
        return {
          status: 429,
          code: ERROR_CODES.RATE_LIMIT,
          message: 'Too many requests. Please try again later.',
          details: responseData?.message || error.message,
          timestamp,
        };
      
      case 422:
        return {
          status: 422,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid data provided.',
          details: responseData?.message || error.message,
          timestamp,
        };
      
      default:
        if (status >= 500) {
          return {
            status,
            code: ERROR_CODES.SERVER_ERROR,
            message: 'Server error occurred. Please try again later.',
            details: responseData?.message || error.message,
            timestamp,
          };
        }
        
        return {
          status,
          code: ERROR_CODES.NETWORK_ERROR,
          message: 'Network error occurred. Please check your connection.',
          details: error.message,
          timestamp,
        };
    }
  }

  // Non-axios errors
  if (error instanceof Error) {
    return {
      status: 500,
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: 'An unexpected error occurred.',
      details: error.message,
      timestamp,
    };
  }

  return {
    status: 500,
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unexpected error occurred.',
    details: String(error),
    timestamp,
  };
}
// Use relative URL in development (Vite proxy) or full URL in production
const API_URL =
  IS_DEVELOPMENT
    ? '' // Use relative URLs for Vite proxy
    : import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  (error) => {
    const appError = normalizeError(error);
     if (appError.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      window.location.href = '/';
     }
    return Promise.reject(appError);
    }

  
);

export default apiClient;
