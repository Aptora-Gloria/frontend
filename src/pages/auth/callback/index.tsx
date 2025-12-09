import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/shared/contexts/AuthContext';
import { login } from '@/shared/lib/auth-api';
import { STORAGE_KEYS, IS_DEVELOPMENT, ROUTES } from '@/shared/lib/constants';

export const AuthCallbackPage = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const code = params.get('code');
  const errorParam = params.get('error');
  const navigate = useNavigate();
  const { login: setAuthToken, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasHandledAuth = useRef(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasHandledAuth.current) {
      return;
    }

    // If already authenticated and no code, redirect to dashboard
    if (!authLoading && isAuthenticated && !code && !errorParam) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // authLoading true ise bekle
    if (authLoading) {
      return;
    }

    const handleAuth = async () => {
      // handleAuth'ın sadece bir kez çalışmasını garanti et
      if (hasHandledAuth.current) {
        return;
      }
      hasHandledAuth.current = true;
      // Check for GitHub error parameter
      if (errorParam) {
        const errorDescription = params.get('error_description') || errorParam;
        setError(`GitHub authorization error: ${errorDescription}`);
        setIsLoading(false);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        logout();
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setIsLoading(false);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        logout();
        return;
      }

      try {
        if (IS_DEVELOPMENT) {
          console.log('Sending code to backend:', code);
          console.log('API URL:', import.meta.env.VITE_API_URL);
        }
        const response = await login(code);
        if (IS_DEVELOPMENT) {
          console.log('Login response:', response);
          console.log('JWT Token received:', response?.accessToken);
        }
        
        if (!response || !response.accessToken) {
          throw new Error('Invalid response from backend: missing accessToken');
        }
        
        // setAuthToken already calls refreshUser internally, but we await it here
        // to ensure user data is loaded before navigation
        await setAuthToken(response.accessToken);
        
        // setIsLoading false yap, isAuthenticated useEffect'i navigate edecek
        setIsLoading(false);
      } catch (err: unknown) {
        console.error('Auth callback failed:', err);
        console.error('Error details:', {
          error: err,
          type: typeof err,
          isAxiosError: err && typeof err === 'object' && 'isAxiosError' in err,
        });
        
        // Clear any existing token on error and update auth context
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        logout(); // Update AuthContext state
        
        let errorMessage = 'Authentication failed. Please try again.';

        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as {
            response?: { status?: number; data?: unknown };
          };
          if (axiosError.response) {
            const status = axiosError.response.status;
            const responseData = axiosError.response.data;
            
            // Check for specific error messages
            if (responseData && typeof responseData === 'object') {
              const message = 'message' in responseData ? String(responseData.message) : 'Unknown error';
              
              // Check for client_secret related errors
              if (
                message.toLowerCase().includes('client_secret') ||
                message.toLowerCase().includes('client secret') ||
                message.toLowerCase().includes('invalid client') ||
                status === 401
              ) {
                errorMessage = `Backend authentication error: ${message}. Please check if GITHUB_CLIENT_SECRET is configured correctly in your backend.`;
              } else if (status === 403) {
                errorMessage = `Access forbidden (403). Please check:\n1. Backend CORS is configured to allow http://localhost:5173\n2. /auth/login endpoint is in permitAll() in SecurityConfig\n3. Backend server is running on correct port`;
              } else if (status === 429) {
                errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
              } else {
                errorMessage = `Authentication failed (${status}): ${message}`;
              }
            } else {
              // Handle string responses (like "Forbidden")
              const dataString = String(responseData);
              if (status === 403) {
                errorMessage = `Access forbidden (403): ${dataString}. Please check backend CORS and SecurityConfig settings.`;
              } else {
                errorMessage = `Authentication failed (${status}): ${dataString}`;
              }
            }
          } else if ('message' in err) {
            errorMessage = `Network error: ${String(err.message)}. Please check if the backend server is running.`;
          }
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [code, errorParam, params, authLoading, isAuthenticated, navigate, setAuthToken, logout]);

  // isAuthenticated true olduğunda ve loading bittiğinde dashboard'a yönlendir
  useEffect(() => {
    if (!isLoading && !authLoading && isAuthenticated && !error && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, authLoading, isAuthenticated, error, navigate]);

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-2xl font-semibold mb-4">Authenticating...</h1>
          <p className="text-gray-600">Please wait while we sign you in.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-2xl font-semibold mb-4 text-red-600">Authentication Error</h1>
          <p className="text-gray-600 mb-4 whitespace-pre-wrap">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                // Ensure tokens are cleared before navigating
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                navigate('/dashboard', { replace: true });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                // Clear everything and reload to start fresh
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
};
