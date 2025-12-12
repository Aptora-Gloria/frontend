import { useState, useCallback } from 'react';

interface UseRetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

interface UseRetryResult {
  attempt: number;
  isRetrying: boolean;
  retry: <T>(fn: () => Promise<T>) => Promise<T>;
  reset: () => void;
}

export function useRetry(options: UseRetryOptions = {}): UseRetryResult {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;
  const [attempt, setAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      let currentAttempt = 0;
      setIsRetrying(true);

      while (currentAttempt < maxAttempts) {
        try {
          setAttempt(currentAttempt + 1);
          const result = await fn();
          setIsRetrying(false);
          setAttempt(0);
          return result;
        } catch (error) {
          currentAttempt++;
          
          if (currentAttempt >= maxAttempts) {
            setIsRetrying(false);
            throw error;
          }

          // Wait before retrying
          const waitTime = backoff ? delay * Math.pow(2, currentAttempt - 1) : delay;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      setIsRetrying(false);
      throw new Error('Max retry attempts reached');
    },
    [maxAttempts, delay, backoff]
  );

  const reset = useCallback(() => {
    setAttempt(0);
    setIsRetrying(false);
  }, []);

  return {
    attempt,
    isRetrying,
    retry,
    reset,
  };
}