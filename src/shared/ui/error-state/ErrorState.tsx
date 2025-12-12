import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { AppError } from '@/shared/errors';
import { ERROR_CODES } from '@/shared/errors';

interface ErrorStateProps {
  error: AppError | Error | string;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  className = '',
  size = 'md',
}) => {
  const getErrorInfo = () => {
    if (typeof error === 'string') {
      return {
        title: 'Error',
        message: error,
        icon: AlertTriangle,
        color: 'text-red-500',
      };
    }

    if (error instanceof Error && 'status' in error && 'code' in error) {
      const appError = error as unknown as AppError;
      
      switch (appError.code) {
        case ERROR_CODES.NETWORK_ERROR:
          return {
            title: 'Connection Error',
            message: 'Please check your internet connection and try again.',
            icon: WifiOff,
            color: 'text-orange-500',
          };
        
        case ERROR_CODES.UNAUTHORIZED:
          return {
            title: 'Authentication Required',
            message: 'Please log in to continue.',
            icon: AlertTriangle,
            color: 'text-amber-500',
          };
        
        case ERROR_CODES.FORBIDDEN:
          return {
            title: 'Access Denied',
            message: 'You don\'t have permission to access this resource.',
            icon: AlertTriangle,
            color: 'text-red-500',
          };
        
        case ERROR_CODES.NOT_FOUND:
          return {
            title: 'Not Found',
            message: 'The requested resource could not be found.',
            icon: AlertTriangle,
            color: 'text-slate-500',
          };
        
        case ERROR_CODES.RATE_LIMIT:
          return {
            title: 'Rate Limited',
            message: 'Too many requests. Please wait a moment and try again.',
            icon: AlertTriangle,
            color: 'text-amber-500',
          };
        
        default:
          return {
            title: 'Something went wrong',
            message: appError.message || 'An unexpected error occurred.',
            icon: AlertTriangle,
            color: 'text-red-500',
          };
      }
    }

    return {
      title: 'Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      icon: AlertTriangle,
      color: 'text-red-500',
    };
  };

  const { title, message, icon: Icon, color } = getErrorInfo();

  const sizeClasses = {
    sm: {
      container: 'p-4',
      icon: 'h-8 w-8',
      title: 'text-sm font-medium',
      message: 'text-xs',
      button: 'px-3 py-1.5 text-xs',
    },
    md: {
      container: 'p-6',
      icon: 'h-12 w-12',
      title: 'text-base font-semibold',
      message: 'text-sm',
      button: 'px-4 py-2 text-sm',
    },
    lg: {
      container: 'p-8',
      icon: 'h-16 w-16',
      title: 'text-lg font-semibold',
      message: 'text-base',
      button: 'px-6 py-3 text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${classes.container} ${className}`}>
      <div className="mb-4">
        <Icon className={`mx-auto ${classes.icon} ${color}`} />
      </div>
      
      <h3 className={`text-slate-900 mb-2 ${classes.title}`}>
        {title}
      </h3>
      
      <p className={`text-slate-600 mb-6 max-w-md ${classes.message}`}>
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className={`
            inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg 
            hover:bg-blue-700 transition-colors font-medium
            ${classes.button}
          `}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
};