/**
 * Authentication Error Handlers
 * Isolated, reusable handlers for auth-specific errors
 */

import { ErrorContext, ErrorHandler, ErrorHandlerFn } from '../types';

/**
 * EMAIL_NOT_FOUND handler
 * Exact match: Email address not registered
 */
const emailNotFoundHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.emailNotFound') || 'Email not found');
  }
  if (context.showNotification) {
    context.showNotification('error', context.t?.('auth.emailNotFound') || 'Email not found');
  }
  return { handled: true, stop: true };
};

/**
 * REQUIRES_OTP_NEW handler
 * Exact match: User needs new OTP (first time or expired)
 * Async flow: Triggers OTP generation and navigates to OTP screen
 */
const otpRequiredNewHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (!context.otp?.triggerOtpFlow || !context.setScreen) {
    return { handled: false };
  }

  const { success, error } = await context.otp.triggerOtpFlow(context.email || '');
  if (!success && error) {
    if (context.form?.setError) {
      context.form.setError(error);
    }
  } else {
    context.setScreen('otp');
  }
  return { handled: true, stop: true };
};

/**
 * REQUIRES_OTP_ACTIVE handler
 * Exact match: OTP already sent, user needs to verify
 * Flow: Set OTP email and navigate to OTP screen
 */
const otpRequiredActiveHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (!context.otp?.setOtpEmail || !context.setScreen) {
    return { handled: false };
  }

  context.otp.setOtpEmail(context.email || '');
  context.setScreen('otp');
  return { handled: true, stop: true };
};

/**
 * BANNED handler
 * Pattern match: "banned" or "user is banned"
 * Displays account banned message
 */
const bannedHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.accountBanned') || 'Account has been banned');
  }
  if (context.showNotification) {
    context.showNotification(
      'error',
      context.t?.('auth.accountBanned') || 'Account has been banned'
    );
  }
  return { handled: true, stop: true };
};

/**
 * EMAIL_NOT_CONFIRMED handler
 * Pattern match: "email not confirmed"
 * Displays email confirmation required message
 */
const emailNotConfirmedHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.emailNotConfirmed') || 'Email address not confirmed');
  }
  if (context.showNotification) {
    context.showNotification(
      'error',
      context.t?.('auth.emailNotConfirmed') || 'Email address not confirmed'
    );
  }
  return { handled: true, stop: true };
};

/**
 * INVALID_CREDENTIALS fallback handler
 * Default handler: catches all unmatched auth errors
 * Shows generic invalid credentials message
 */
const invalidCredentialsHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.invalidCredentials') || 'Invalid credentials');
  }
  if (context.showNotification) {
    context.showNotification(
      'error',
      context.t?.('auth.invalidCredentials') || 'Invalid credentials'
    );
  }
  return { handled: true, stop: true };
};

/**
 * ATTEMPTS_REMAINING custom handler
 * Custom matcher: parses "ATTEMPTS_REMAINING:X" format
 * Shows warning about remaining attempts before lockout
 */
const createAttemptsRemainingHandler = (): ErrorHandler => ({
  name: 'attemptsRemainingHandler',
  matcher: (errorMessage: string) => {
    return errorMessage.startsWith('ATTEMPTS_REMAINING:');
  },
  handler: async (errorMessage: string, context: ErrorContext) => {
    const remaining = parseInt(errorMessage.split(':')[1], 10) || 0;
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
    return { handled: true, stop: true };
  },
  priority: 10, // Higher priority to catch before pattern matches
});

/**
 * Export all auth handlers
 */
export const authHandlers: ErrorHandler[] = [
  {
    name: 'emailNotFoundHandler',
    exact: 'EMAIL_NOT_FOUND',
    handler: emailNotFoundHandler,
    priority: 100, // Highest priority for exact matches
  },
  {
    name: 'otpRequiredNewHandler',
    exact: 'REQUIRES_OTP_NEW',
    handler: otpRequiredNewHandler,
    priority: 100,
  },
  {
    name: 'otpRequiredActiveHandler',
    exact: 'REQUIRES_OTP_ACTIVE',
    handler: otpRequiredActiveHandler,
    priority: 100,
  },
  createAttemptsRemainingHandler(),
  {
    name: 'bannedHandler',
    pattern: 'banned',
    handler: bannedHandler,
    priority: 50, // Pattern priority
  },
  {
    name: 'emailNotConfirmedHandler',
    pattern: 'email not confirmed',
    handler: emailNotConfirmedHandler,
    priority: 50,
  },
  {
    name: 'invalidCredentialsHandler',
    // No matcher: fallback handler
    handler: invalidCredentialsHandler,
    priority: 0,
  },
];
