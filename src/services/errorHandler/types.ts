/**
 * Error Handler Registry - Type Definitions
 * Defines the shape and contract for all error handlers
 */

/**
 * Context passed to error handlers with form state and utilities
 */
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

/**
 * Return type for error handler execution
 * handled: true if the error was successfully handled
 * stop: true if subsequent handlers should not be tried
 */
export interface ErrorHandlerResult {
  handled: boolean;
  stop?: boolean;
}

/**
 * Handler function signature
 * Returns true when error is handled, false to continue chain
 */
export type ErrorHandlerFn = (
  errorMessage: string,
  context: ErrorContext
) => Promise<ErrorHandlerResult>;

/**
 * Error handler registration contract
 * Handlers implement different matching strategies
 */
export interface ErrorHandler {
  name: string;
  /**
   * Exact match: errorMessage === pattern
   */
  exact?: string;
  /**
   * Pattern match: errorMessage includes pattern (case-insensitive)
   */
  pattern?: string;
  /**
   * Custom matcher function
   */
  matcher?: (errorMessage: string) => boolean;
  /**
   * The handler function to execute
   */
  handler: ErrorHandlerFn;
  /**
   * Priority (higher = checks earlier)
   */
  priority?: number;
}

/**
 * Matching strategy type
 */
export type MatchStrategy = 'exact' | 'pattern' | 'custom';
