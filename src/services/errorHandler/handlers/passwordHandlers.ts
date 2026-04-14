/**
 * Password Reset Error Handlers
 * Handles errors specific to password reset flows
 */

import { ErrorContext, ErrorHandler, ErrorHandlerFn } from '../types';

/**
 * Email not found handler
 * Pattern match: "not found"
 */
const emailNotFoundPasswordHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
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
  return { handled: true, stop: true };
};

/**
 * Rate limit on password reset handler
 * Pattern match: "rate limit"
 */
const passwordResetRateLimitHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
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
  return { handled: true, stop: true };
};

/**
 * Account banned handler
 * Pattern match: "banned"
 */
const accountBannedPasswordHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
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
  return { handled: true, stop: true };
};

/**
 * Generic password reset failed handler (fallback)
 */
const passwordResetFailedHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
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
  return { handled: true, stop: true };
};

/**
 * Export all password handlers
 */
export const passwordHandlers: ErrorHandler[] = [
  {
    name: 'emailNotFoundPasswordHandler',
    pattern: 'not found',
    handler: emailNotFoundPasswordHandler,
    priority: 50,
  },
  {
    name: 'passwordResetRateLimitHandler',
    pattern: 'rate limit',
    handler: passwordResetRateLimitHandler,
    priority: 50,
  },
  {
    name: 'accountBannedPasswordHandler',
    pattern: 'banned',
    handler: accountBannedPasswordHandler,
    priority: 50,
  },
  {
    name: 'passwordResetFailedHandler',
    // No matcher: fallback handler
    handler: passwordResetFailedHandler,
    priority: 0,
  },
];
