/**
 * Session Error Handlers
 * Handlers for rate limiting and session-related errors
 */

import { ErrorContext, ErrorHandler } from '../types';

/**
 * ATTEMPTS_REMAINING handler (Session variant)
 * Parses rate limit status messages
 * Note: Currently not used in Login flow but provided for consistency
 */
const createSessionAttemptsHandler = (): ErrorHandler => ({
  name: 'sessionAttemptsRemainingHandler',
  matcher: (errorMessage: string) => {
    return errorMessage.startsWith('ATTEMPTS_REMAINING:');
  },
  handler: async (errorMessage: string, context: ErrorContext) => {
    const remaining = parseInt(errorMessage.split(':')[1], 10) || 0;
    if (context.form?.setWarnMessage) {
      context.form.setWarnMessage(
        context.t?.('auth.attemptsRemaining', { attempts: remaining }) ||
          `${remaining} attempts remaining before lockout`
      );
    }
    return { handled: true, stop: true };
  },
  priority: 50,
});

/**
 * Export all session handlers
 */
export const sessionHandlers: ErrorHandler[] = [createSessionAttemptsHandler()];
