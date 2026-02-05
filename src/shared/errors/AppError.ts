export type AppError = {
    status: number;
    code: string;
    message: string;
    details?: string;
    timestamp?: string;
}

export class AppErrorClass extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly details?: string;
    public readonly timestamp: string;

    constructor(error: AppError) {
        super(error.message);
        this.name = 'AppError';
        this.status = error.status;
        this.code = error.code;
        this.details = error.details;
        this.timestamp = error.timestamp || new Date().toISOString();
    }
}

// Common error codes
export const ERROR_CODES = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];