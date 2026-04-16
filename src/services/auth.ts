

// File: authActions.ts

import { supabase } from './supabase';

/** Returns the currently authenticated Supabase user, or null. */
export async function getCurrentAuthUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Updates the current user's password. Throws on failure. */
export async function updateCurrentUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Re-authenticates the user for sensitive operations. Returns the auth error or null on success. */
export async function signInForVerification(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ?? null;
}

/** Verifies a password-recovery OTP token hash from a reset email link. */
export async function verifyRecoveryOtp(tokenHash: string) {
  return supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
}

/** Establishes an auth session from the access/refresh tokens in a recovery hash link. */
export async function setRecoverySession(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

/** Sends a password-reset email to the given address. Returns the error or null on success. */
export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return error ?? null;
}


// File: authHelpers.ts

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

