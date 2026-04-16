/**
 * Simplified Error Handler
 * Consolidated from services/errorHandler/ and services/errorUtils.ts
 * Provides error extraction, categorization, and handling without registry pattern
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

export interface ErrorContext {
  form?: {
    setError: (message: string) => void;
    setWarnMessage?: (message: string) => void;
    email?: string;
  };
  t?: (key: string, options?: Record<string, unknown>) => string;
  showNotification?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  otp?: {
    triggerOtpFlow: (email: string) => Promise<{ success: boolean; error?: string }>;
    setOtpEmail: (email: string) => void;
  };
  email?: string;
  setScreen?: (screen: string) => void;
  navigate?: (path: string, options?: Record<string, unknown>) => void;
}

export type ErrorCategory = 'auth' | 'otp' | 'session' | 'network' | 'validation' | 'unknown';

export interface ParsedError {
  message: string;
  category: ErrorCategory;
  handled?: boolean;
}

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';

// ─── Error Extraction & Normalization ───────────────────────────────────────

/**
 * Extract and normalize any error type into a consistent AppError format
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
    message: DEFAULT_ERROR_MESSAGE,
    originalError: err,
  };
}

/**
 * Returns a normalized human-readable error message
 */
export function getErrorMessage(err: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  const message = extractError(err).message.trim();
  return message || fallback;
}

/**
 * Log error with context
 */
export function logError(error: AppError | unknown, context?: string): void {
  const appError = error instanceof Object && 'message' in error ? (error as AppError) : extractError(error);
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';
  console.error(`[${timestamp}]${contextStr}`, appError.message, {
    code: appError.code,
    status: appError.status,
    details: appError.details,
    originalError: appError.originalError,
  });
}

/**
 * Determine if error is network-related (transient)
 */
export function isTransientError(error: AppError | unknown): boolean {
  const appError = extractError(error);
  const message = appError.message.toLowerCase();
  const code = appError.code?.toLowerCase() || '';

  return (
    code === 'aborterror' ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    message.includes('signal is aborted') ||
    appError.status === 0 ||
    (appError.status != null && appError.status >= 500)
  );
}

/**
 * Determine if error is auth-related
 */
export function isAuthError(error: AppError | unknown): boolean {
  const appError = extractError(error);
  const message = appError.message.toLowerCase();

  return (
    appError.status === 401 ||
    appError.status === 403 ||
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid credentials') ||
    message.includes('not authenticated')
  );
}

// ─── Error Categories & Parsing ──────────────────────────────────────────────

/**
 * Categorize error message for routing
 */
export function categorizeError(errorMessage: string): ErrorCategory {
  const msg = errorMessage.toLowerCase();

  // OTP errors
  if (msg.includes('otp') || msg.includes('verification')) return 'otp';
  
  // Session/rate limit errors
  if (msg.includes('rate limit') || msg.includes('attempts remaining') || msg.includes('cooldown')) {
    return 'session';
  }

  // Network errors
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'network';
  }

  // Auth errors
  if (
    msg.includes('email') ||
    msg.includes('password') ||
    msg.includes('credential') ||
    msg.includes('banned') ||
    msg.includes('confirmed')
  ) {
    return 'auth';
  }

  // Validation errors
  if (msg.includes('required') || msg.includes('invalid') || msg.includes('format')) {
    return 'validation';
  }

  return 'unknown';
}

/**
 * Parse error message for UI display
 */
export function parseError(err: unknown): ParsedError {
  const appError = extractError(err);
  const message = appError.message;
  const category = categorizeError(message);

  return {
    message,
    category,
    handled: false,
  };
}

// ─── Error Handling Router (Simple Version) ──────────────────────────────────

/**
 * Main error handler that routes through error cases
 * Simplified from registry pattern - uses simple if/else matching
 */
export async function handleError(
  errorMessage: string,
  context: ErrorContext
): Promise<void> {
  const msg = errorMessage.trim();
  const msgLower = msg.toLowerCase();

  // ───  Auth Handlers ───────────────────────────────────────────────────────

  // EMAIL_NOT_FOUND (exact match)
  if (msg === 'EMAIL_NOT_FOUND') {
    if (context.form?.setError) {
      context.form.setError(context.t?.('auth.emailNotFound') || 'Email not found');
    }
    if (context.showNotification) {
      context.showNotification('error', context.t?.('auth.emailNotFound') || 'Email not found');
    }
    return;
  }

  // REQUIRES_OTP_NEW (exact match)
  if (msg === 'REQUIRES_OTP_NEW') {
    if (!context.otp?.triggerOtpFlow || !context.setScreen) {
      return;
    }
    const { error } = await context.otp.triggerOtpFlow(context.email || '');
    if (error && context.form?.setError) {
      context.form.setError(error);
    }
    // Always move to OTP page after 5 attempts - user can retry there
    context.setScreen('otp');
    return;
  }

  // REQUIRES_OTP_ACTIVE (exact match)
  if (msg === 'REQUIRES_OTP_ACTIVE') {
    if (!context.otp?.setOtpEmail || !context.setScreen) {
      return;
    }
    context.otp.setOtpEmail(context.email || '');
    context.setScreen('otp');
    return;
  }

  // ATTEMPTS_REMAINING custom format (pattern: ATTEMPTS_REMAINING:X)
  if (msg.startsWith('ATTEMPTS_REMAINING:')) {
    const remaining = parseInt(msg.split(':')[1], 10) || 0;
    if (context.form?.setWarnMessage) {
      context.form.setWarnMessage(
        context.t?.('auth.attemptsRemaining', { attempts: remaining }) ||
          `You have ${remaining} attempts remaining`
      );
    }
    if (context.form?.setError) {
      context.form.setError(context.t?.('auth.invalidCredentials') || 'Invalid credentials');
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.invalidCredentials') || 'Invalid credentials'
      );
    }
    return;
  }

  // Banned (pattern match)
  if (msgLower.includes('banned')) {
    if (context.form?.setError) {
      context.form.setError(context.t?.('auth.accountBanned') || 'Account has been banned');
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.accountBanned') || 'Account has been banned'
      );
    }
    return;
  }

  // Email not confirmed (pattern match)
  if (msgLower.includes('email not confirmed')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.emailNotConfirmed') || 'Email address not confirmed'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.emailNotConfirmed') || 'Email address not confirmed'
      );
    }
    return;
  }

  // ───  OTP Handlers ────────────────────────────────────────────────────────

  // Invalid OTP (pattern match)
  if (msgLower.includes('invalid otp')) {
    if (context.form?.setError) {
      context.form.setError(context.t?.('auth.invalidOtp') || 'Invalid OTP code');
    }
    if (context.showNotification) {
      context.showNotification('error', context.t?.('auth.invalidOtp') || 'Invalid OTP code');
    }
    return;
  }

  // OTP expired (pattern match)
  if (msgLower.includes('expired')) {
    if (context.form?.setError) {
      context.form.setError(context.t?.('auth.otpExpired') || 'OTP has expired');
    }
    if (context.showNotification) {
      context.showNotification('error', context.t?.('auth.otpExpired') || 'OTP has expired');
    }
    return;
  }

  // OTP rate limit (pattern match: rate limit in OTP context)
  if (msgLower.includes('rate limit') && msgLower.includes('otp')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.tooManyOtpAttempts') || 'Too many OTP attempts. Please try again later.'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.tooManyOtpAttempts') || 'Too many OTP attempts. Please try again later.'
      );
    }
    return;
  }

  // OTP does not match (pattern match)
  if (msgLower.includes('does not match')) {
    if (context.form?.setError) {
      context.form.setError(context.t?.('auth.otpMismatch') || 'OTP does not match');
    }
    if (context.showNotification) {
      context.showNotification('error', context.t?.('auth.otpMismatch') || 'OTP does not match');
    }
    return;
  }

  // ───  Password Reset Handlers ──────────────────────────────────────────────

  // Password reset: email not found (pattern match)
  if (msgLower.includes('not found') && msgLower.includes('reset')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.emailNotFoundPassword') || 'Email address not found in our system'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.emailNotFoundPassword') || 'Email address not found in our system'
      );
    }
    return;
  }

  // Password reset: rate limit (pattern match)
  if (msgLower.includes('rate limit') && msgLower.includes('password')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.passwordResetRateLimit') ||
          'Too many reset requests. Please try again later.'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.passwordResetRateLimit') ||
          'Too many reset requests. Please try again later.'
      );
    }
    return;
  }

  // Password reset: banned (pattern match)
  if (msgLower.includes('banned') && msgLower.includes('password')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.accountBannedPassword') || 'This account has been banned'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.accountBannedPassword') || 'This account has been banned'
      );
    }
    return;
  }

  // ───  Session/Rate Limit Handlers ─────────────────────────────────────────

  // Session: rate limit (generic)
  if (msgLower.includes('rate limit')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.tooManyAttempts') || 'Too many attempts. Please try again later.'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.tooManyAttempts') || 'Too many attempts. Please try again later.'
      );
    }
    return;
  }

  // ───  Fallback Handlers ────────────────────────────────────────────────────

  // Generic OTP verification failed (for OTP flow)
  if (msgLower.includes('verification failed')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.verificationFailed') || 'Verification failed. Please try again.'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.verificationFailed') || 'Verification failed. Please try again.'
      );
    }
    return;
  }

  // Generic password reset failed (fallback)
  if (msgLower.includes('reset')) {
    if (context.form?.setError) {
      context.form.setError(
        context.t?.('auth.resetFailed') ||
          'Failed to send reset link. Please check your email address and try again.'
      );
    }
    if (context.showNotification) {
      context.showNotification(
        'error',
        context.t?.('auth.resetFailed') ||
          'Failed to send reset link. Please check your email address and try again.'
      );
    }
    return;
  }

  // Generic invalid credentials (auth fallback)
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.invalidCredentials') || 'Invalid credentials');
  }
  if (context.showNotification) {
    context.showNotification(
      'error',
      context.t?.('auth.invalidCredentials') || 'Invalid credentials'
    );
  }
}

/**
 * Initialize error handlers (stub for compatibility)
 * In simplified version, this is a no-op since handlers are embedded
 */
export function initializeErrorHandlers(): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[ErrorHandler] Initialization complete (simplified handler in use)');
  }
}
