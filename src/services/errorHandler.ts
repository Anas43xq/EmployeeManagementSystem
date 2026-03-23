/**
 * Centralized error handling service
 * Provides consistent error extraction and normalization across all services
 * Priority 4: SOLID - Centralize error handling
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  // Preserve original error for debugging
  originalError?: unknown;
}

/**
 * Extract and normalize any error type into a consistent AppError format
 * Replaces silent error swallows with consistent error handling
 */
export function extractError(err: unknown): AppError {
  // Handle AuthError from Supabase
  if (err && typeof err === 'object' && 'message' in err && 'status' in err) {
    const error = err as { message: string; status?: number; code?: string };
    return {
      message: error.message || 'An unknown error occurred',
      code: error.code,
      status: error.status,
      originalError: err,
    };
  }

  // Handle standard Error
  if (err instanceof Error) {
    return {
      message: err.message,
      code: err.name,
      originalError: err,
    };
  }

  // Handle string errors
  if (typeof err === 'string') {
    return {
      message: err,
      originalError: err,
    };
  }

  // Handle object with message property
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return {
      message: String(err.message),
      originalError: err,
    };
  }

  // Fallback for unknown error types
  return {
    message: 'An unexpected error occurred',
    originalError: err,
  };
}

/**
 * Log error with context (can be wired to external logging service)
 */
export function logError(error: AppError, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';
  console.error(`[${timestamp}]${contextStr}`, error.message, {
    code: error.code,
    status: error.status,
    details: error.details,
    originalError: error.originalError,
  });
}

/**
 * Determine if error is network-related (transient)
 */
export function isTransientError(error: AppError | unknown): boolean {
  const appError = error instanceof Object && 'message' in error ? error as AppError : extractError(error);
  const message = appError.message.toLowerCase();
  const code = appError.code?.toLowerCase() || '';

  return (
    code === 'aborterror' ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    message.includes('signal is aborted') ||
    message.includes('aborterror')
  );
}

/**
 * Determine if error requires reauthentication
 */
export function isAuthError(error: AppError | unknown): boolean {
  const appError = error instanceof Object && 'message' in error ? error as AppError : extractError(error);
  const message = appError.message.toLowerCase();
  const status = appError.status;

  return (
    status === 401 ||
    status === 403 ||
    message.includes('refresh token') ||
    message.includes('invalid token') ||
    message.includes('token not found') ||
    message.includes('session expired') ||
    message.includes('not authenticated')
  );
}
