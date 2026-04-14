/**
 * Error Handler Registry
 * Central routing for all error handling logic
 * Supports exact match → pattern matching → fallback
 */

import { ErrorContext, ErrorHandler } from './types';

export class ErrorHandlerRegistry {
  private handlers: ErrorHandler[] = [];

  /**
   * Register a new error handler
   */
  register(handler: ErrorHandler): void {
    // Set default priority if not provided (lower values checked first)
    if (handler.priority === undefined) {
      handler.priority = 0;
    }
    this.handlers.push(handler);
    // Sort handlers by priority (descending) so higher priority handlers are checked first
    this.handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Handle an error message through the registry
   * Routing strategy:
   *   1. Exact match
   *   2. Pattern match (case-insensitive substring)
   *   3. Custom matcher function
   *   4. Fallback (first handler without matcher)
   */
  async handle(errorMessage: string, context: ErrorContext): Promise<void> {
    // Try exact matches first
    for (const handler of this.handlers) {
      if (handler.exact && errorMessage === handler.exact) {
        const result = await handler.handler(errorMessage, context);
        if (result.handled && result.stop) {
          return;
        }
        if (result.handled) {
          break; // Move to next handler type if not stopping
        }
      }
    }

    // Try pattern matches (case-insensitive)
    for (const handler of this.handlers) {
      if (
        handler.pattern &&
        errorMessage.toLowerCase().includes(handler.pattern.toLowerCase())
      ) {
        const result = await handler.handler(errorMessage, context);
        if (result.handled && result.stop) {
          return;
        }
        if (result.handled) {
          break; // Move to next handler type if not stopping
        }
      }
    }

    // Try custom matchers
    for (const handler of this.handlers) {
      if (handler.matcher && handler.matcher(errorMessage)) {
        const result = await handler.handler(errorMessage, context);
        if (result.handled && result.stop) {
          return;
        }
        if (result.handled) {
          break; // Move to next handler type if not stopping
        }
      }
    }

    // No match found - handlers should have a fallback without any matcher
    // This allows a default handler to catch unmatched errors
  }

  /**
   * Get count of registered handlers (for debugging)
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers = [];
  }

  /**
   * List all registered handlers by name (for debugging)
   */
  listHandlers(): string[] {
    return this.handlers.map((h) => h.name);
  }
}

// Export singleton instance
export const errorRegistry = new ErrorHandlerRegistry();
