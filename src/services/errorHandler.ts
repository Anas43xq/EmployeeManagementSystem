/**
 * Barrel export combining utilities and registry-based handlers
 */

// Re-export utilities from errorUtils
export { extractError, getErrorMessage, logError, isTransientError, isAuthError } from './errorUtils';
export type { AppError } from './errorUtils';

// Re-export registry-based error handling system
// Using explicit path to avoid confusion with errorHandler/ directory
export { initializeErrorHandlers, handleError, errorRegistry } from './errorHandler/index';
