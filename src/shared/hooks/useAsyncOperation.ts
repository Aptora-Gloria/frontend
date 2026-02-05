import { useState, useCallback } from 'react';
import { useToast } from '@/shared/contexts/ToastContext';
import type { AppError } from '@/shared/errors';

interface UseAsyncOperationOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncOperationResult<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useAsyncOperation<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { showSuccess, showError } = useToast();

  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed',
  } = options;

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await asyncFunction(...args);
        setData(result);
        
        if (showSuccessToast) {
          showSuccess(successMessage);
        }
        
        return result;
      } catch (err) {
        const appError = err as AppError;
        setError(appError);
        
        if (showErrorToast) {
          showError(appError.message || errorMessage);
        }
        
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, showSuccessToast, showErrorToast, successMessage, errorMessage, showSuccess, showError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}