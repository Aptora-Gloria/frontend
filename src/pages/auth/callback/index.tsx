import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useAuth } from '@/shared/contexts/AuthContext';
import { login } from '@/shared/lib/auth-api';
import { STORAGE_KEYS, IS_DEVELOPMENT } from '@/shared/lib/constants';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { ErrorState } from '@/shared/ui/error-state';
import type { AppError } from '@/shared/errors';

export const AuthCallbackPage = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const code = params.get('code');
  const errorParam = params.get('error');
  const navigate = useNavigate();
  const { login: setAuthToken, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { showError, showSuccess } = useToast();
  const [error, setError] = useState<AppError | string | null>(null);
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

              if (
                message.toLowerCase().includes('client_secret') ||
                message.toLowerCase().includes('client secret') ||
                message.toLowerCase().includes('invalid client') ||
                status === 401
              ) {
                errorMessage = `Backend authentication error: ${message}. Please check if GITHUB_CLIENT_SECRET is configured correctly in your backend.`;
              } else if (status === 403) {
                errorMessage = `Access forbidden (403). Please check CORS and SecurityConfig settings.`;
              } else if (status === 429) {
                errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
              } else {
                errorMessage = `Authentication failed (${status}): ${message}`;
              }
            } else {
              const dataString = String(responseData);
              errorMessage = `Authentication failed (${status}): ${dataString}`;
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

  // ORTAK ARKA PLAN YAPISI (DRY Prensibi)
  const BackgroundEffects = () => (
    <>
      <div
        className="absolute -top-[30%] left-1/2 h-[100vh] w-[150vw] -translate-x-1/2 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(255, 255, 255, 0) 70%)'
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-100/30 blur-[100px] mix-blend-multiply pointer-events-none" />
    </>
  );

  if (isLoading) {
    return (
      // ANA KAPSAYICI: Tam ekran, ortalanmış ve arka plan efektli
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white text-slate-900">
        <BackgroundEffects />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >

          {/* LOADER KUTUSU */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-100">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <div className="absolute inset-0 rounded-2xl bg-blue-500/5 animate-pulse" />
          </div>

          {/* METİN (İNGİLİZCE) */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Verifying your account...
            </h2>
            <p className="text-sm text-slate-500 max-w-[300px]">
              Please wait while we securely redirect you to your dashboard.
            </p>
          </div>

          {/* PROGRESS BAR */}
          <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full bg-slate-900"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut"
              }}
            />
          </div>

        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      // ERROR EKRANI: Artık bu da tam ortalanmış ve şık görünüyor
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white text-slate-900">
        <BackgroundEffects />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full px-6 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-bold mb-3 text-slate-900">Authentication Error</h1>
          <p className="text-slate-500 mb-8 whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
            {error}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                window.location.href = '/';
              }}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                navigate('/dashboard', { replace: true });
              }}
              className="px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};