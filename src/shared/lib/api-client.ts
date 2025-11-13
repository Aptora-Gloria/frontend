import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, IS_DEVELOPMENT, STORAGE_KEYS } from './constants';

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
  (error: AxiosError) => {
    // Log detailed error information (only in development)
    if (IS_DEVELOPMENT) {
      if (error.response) {
        // Server responded with error status
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
          url: error.config?.url,
          method: error.config?.method,
        });
      } else if (error.request) {
        // Request was made but no response received
        console.error('API Error: No response received', {
          request: error.request,
          message: error.message,
        });
      } else {
        // Something else happened
        console.error('API Error:', error.message);
      }
    }

    if (error.response?.status === 401) {
      // Unauthorized - clear token
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      // Only redirect if not already on callback or login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth/callback' && currentPath !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
