import { AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';


export async function getCurrentAuthUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}


export async function updateCurrentUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}


export async function signInForVerification(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ?? null;
}


export async function verifyRecoveryOtp(tokenHash: string) {
  return supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
}


export async function setRecoverySession(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}


export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return error ?? null;
}






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

