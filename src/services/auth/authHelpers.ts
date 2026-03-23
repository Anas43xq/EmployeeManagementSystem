import { AuthError } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'hr' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  isActive: boolean;
}

export const isRefreshTokenError = (error: AuthError | Error | null): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  if (name === 'aborterror' || message.includes('aborterror') || message.includes('signal is aborted')) {
    return false;
  }

  return (
    message.includes('refresh token') ||
    message.includes('invalid token') ||
    message.includes('token not found') ||
    message.includes('session expired') ||
    message.includes('not found')
  );
};

export const isAuthTransientError = (error: AuthError | Error | null): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  return (
    name === 'aborterror' ||
    message.includes('aborterror') ||
    message.includes('signal is aborted') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('failed to fetch')
  );
};
