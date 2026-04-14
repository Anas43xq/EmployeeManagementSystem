/**
 * OTP Verification Error Handlers
 * Handles errors specific to OTP verification flows
 */

import { ErrorContext, ErrorHandler, ErrorHandlerFn } from '../types';

/**
 * Invalid OTP code handler
 * Pattern match: "invalid" + "otp"
 */
const invalidOtpHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.invalidOtp') || 'Invalid OTP code');
  }
  if (context.showNotification) {
    context.showNotification('error', context.t?.('auth.invalidOtp') || 'Invalid OTP code');
  }
  return { handled: true, stop: true };
};

/**
 * OTP expired handler
 * Pattern match: "expired"
 */
const otpExpiredHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.otpExpired') || 'OTP has expired');
  }
  if (context.showNotification) {
    context.showNotification('error', context.t?.('auth.otpExpired') || 'OTP has expired');
  }
  return { handled: true, stop: true };
};

/**
 * Rate limit on OTP verification handler
 * Pattern match: "rate limit"
 */
const otpRateLimitHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
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
  return { handled: true, stop: true };
};

/**
 * OTP not matching handler
 * Pattern match: "does not match"
 */
const otpNotMatchingHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
  if (context.form?.setError) {
    context.form.setError(context.t?.('auth.otpMismatch') || 'OTP does not match');
  }
  if (context.showNotification) {
    context.showNotification('error', context.t?.('auth.otpMismatch') || 'OTP does not match');
  }
  return { handled: true, stop: true };
};

/**
 * Generic OTP verification failed handler (fallback)
 */
const otpVerificationFailedHandler: ErrorHandlerFn = async (
  _errorMessage: string,
  context: ErrorContext
) => {
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
  return { handled: true, stop: true };
};

/**
 * Export all OTP handlers
 */
export const otpHandlers: ErrorHandler[] = [
  {
    name: 'invalidOtpHandler',
    pattern: 'invalid otp',
    handler: invalidOtpHandler,
    priority: 50,
  },
  {
    name: 'otpExpiredHandler',
    pattern: 'expired',
    handler: otpExpiredHandler,
    priority: 50,
  },
  {
    name: 'otpRateLimitHandler',
    pattern: 'rate limit',
    handler: otpRateLimitHandler,
    priority: 50,
  },
  {
    name: 'otpNotMatchingHandler',
    pattern: 'does not match',
    handler: otpNotMatchingHandler,
    priority: 50,
  },
  {
    name: 'otpVerificationFailedHandler',
    // No matcher: fallback handler
    handler: otpVerificationFailedHandler,
    priority: 0,
  },
];
