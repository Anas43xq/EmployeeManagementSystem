import { describe, it, expect } from 'vitest';
import { extractError, isTransientError, isAuthError } from './errorHandler';

describe('errorHandler', () => {
  describe('extractError', () => {
    it('should handle standard Error objects', () => {
      const error = new Error('Something went wrong');
      const result = extractError(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBe('Error');
      expect(result.originalError).toBe(error);
    });

    it('should handle Supabase AuthError objects', () => {
      const authError = {
        message: 'Invalid login credentials',
        status: 400,
        code: 'INVALID_CREDENTIALS',
      };
      const result = extractError(authError);

      expect(result.message).toBe('Invalid login credentials');
      expect(result.status).toBe(400);
      expect(result.code).toBe('INVALID_CREDENTIALS');
      expect(result.originalError).toBe(authError);
    });

    it('should handle string errors', () => {
      const result = extractError('Something failed');

      expect(result.message).toBe('Something failed');
      expect(result.originalError).toBe('Something failed');
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Custom error object' };
      const result = extractError(error);

      expect(result.message).toBe('Custom error object');
      expect(result.originalError).toBe(error);
    });

    it('should handle null and undefined gracefully', () => {
      const result1 = extractError(null);
      const result2 = extractError(undefined);

      expect(result1.message).toBe('An unexpected error occurred');
      expect(result2.message).toBe('An unexpected error occurred');
    });

    it('should handle numbers and other unknown types', () => {
      const result = extractError(404);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.originalError).toBe(404);
    });

    it('should preserve null messages with fallback', () => {
      const authError = {
        message: null,
        status: 500,
      };
      const result = extractError(authError);

      expect(result.message).toBe('An unknown error occurred');
      expect(result.status).toBe(500);
    });
  });

  describe('isTransientError', () => {
    it('should identify network errors as transient', () => {
      const networkError = extractError(new Error('network failed'));
      expect(isTransientError(networkError)).toBe(true);
    });

    it('should identify fetch errors as transient', () => {
      const fetchError = extractError(new Error('failed to fetch'));
      expect(isTransientError(fetchError)).toBe(true);
    });

    it('should identify timeout errors as transient', () => {
      const timeoutError = extractError(new Error('request timeout'));
      expect(isTransientError(timeoutError)).toBe(true);
    });

    it('should identify ABORT errors as transient', () => {
      const abortError = extractError({
        message: 'Signal is aborted',
        code: 'AbortError',
      });
      expect(isTransientError(abortError)).toBe(true);
    });

    it('should not identify auth errors as transient', () => {
      const authError = extractError({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
      expect(isTransientError(authError)).toBe(false);
    });

    it('should not identify permission errors as transient', () => {
      const permError = extractError(new Error('Permission denied'));
      expect(isTransientError(permError)).toBe(false);
    });

    it('should handle raw error objects', () => {
      const result = isTransientError(new Error('network error'));
      expect(result).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      const upperError = extractError(new Error('NETWORK TIMEOUT'));
      expect(isTransientError(upperError)).toBe(true);
    });
  });

  describe('isAuthError', () => {
    it('should identify authentication errors', () => {
      const authError = extractError({
        message: 'Invalid token',
        code: 'UNAUTHORIZED',
        status: 401,
      });
      expect(isAuthError(authError)).toBe(true);
    });

    it('should identify session expiry errors', () => {
      const sessionError = extractError(new Error('session expired'));
      expect(isAuthError(sessionError)).toBe(true);
    });

    it('should identify invalid credentials errors', () => {
      const credError = extractError({
        message: 'Invalid email or password',
        status: 401,
      });
      expect(isAuthError(credError)).toBe(true);
    });

    it('should identify not authenticated errors', () => {
      const notAuthError = extractError(new Error('not authenticated'));
      expect(isAuthError(notAuthError)).toBe(true);
    });

    it('should identify reauthentication needed errors', () => {
      const reauthError = extractError(new Error('refresh token expired'));
      expect(isAuthError(reauthError)).toBe(true);
    });

    it('should not identify non-auth errors as auth errors', () => {
      const networkError = extractError(new Error('network timeout'));
      expect(isAuthError(networkError)).toBe(false);
    });

    it('should check HTTP 401 status code', () => {
      const unauth = extractError({
        message: 'Unauthorized',
        status: 401,
      });
      expect(isAuthError(unauth)).toBe(true);
    });

    it('should check HTTP 403 status code', () => {
      const forbidden = extractError({
        message: 'Forbidden',
        status: 403,
      });
      expect(isAuthError(forbidden)).toBe(true);
    });

    it('should handle raw error objects', () => {
      const result = isAuthError(new Error('invalid token'));
      expect(result).toBe(true);
    });

    it('should be case-insensitive', () => {
      const upperError = extractError(new Error('SESSION EXPIRED'));
      expect(isAuthError(upperError)).toBe(true);
    });
  });
});
