/**
 * Central Error Handler Initialization
 * Coordinates registry setup and provides main public API
 */

import { errorRegistry } from './registry';
import { authHandlers, sessionHandlers, otpHandlers, passwordHandlers } from './handlers';
import { ErrorContext } from './types';

let isInitialized = false;

/**
 * Initialize all error handlers
 * Must be called once during app startup
 * (typically in main.tsx or App.tsx)
 */
export function initializeErrorHandlers(): void {
  if (isInitialized) {
    console.warn('Error handlers already initialized');
    return;
  }

  // Register all auth handlers
  authHandlers.forEach((handler) => {
    errorRegistry.register(handler);
  });

  // Register all session handlers
  sessionHandlers.forEach((handler) => {
    errorRegistry.register(handler);
  });

  // Register all OTP handlers
  otpHandlers.forEach((handler) => {
    errorRegistry.register(handler);
  });

  // Register all password handlers
  passwordHandlers.forEach((handler) => {
    errorRegistry.register(handler);
  });

  isInitialized = true;

  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[ErrorHandler] Initialized with ${errorRegistry.getHandlerCount()} handlers:`,
      errorRegistry.listHandlers()
    );
  }
}

/**
 * Main public API for error handling
 * Routes error message through the registry
 */
export async function handleError(
  errorMessage: string,
  context: ErrorContext
): Promise<void> {
  if (!isInitialized) {
    console.warn(
      'Error handlers not initialized. Call initializeErrorHandlers() during app startup.'
    );
    return;
  }

  await errorRegistry.handle(errorMessage, context);
}

/**
 * Export registry for advanced usage (testing, debugging)
 */
export { errorRegistry } from './registry';

/**
 * Export types for handler implementations
 */
export type { ErrorContext, ErrorHandler, ErrorHandlerFn } from './types';
