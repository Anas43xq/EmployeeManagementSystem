import { supabase } from '../supabase';

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
