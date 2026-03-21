/**
 * loginAttempts.ts
 * Server-side login attempt tracking with OTP trigger.
 *
 * All pre-auth operations go through SECURITY DEFINER RPCs so they bypass RLS
 * (the user has no session yet when these run).
 *
 * Flow:
 *   1. pre_auth_login_check   — resolve email → status
 *   2. record_failed_login    — increment counter, auto-set OTP window at 5
 *   3. sendLoginOtp            — send OTP email via Supabase Auth
 *   4. verifyLoginOtp          — verify OTP, reset counter on success
 *   5. resetLoginAttempts      — zero-out (called post-auth)
 */

import { supabase } from './supabase';
import { logActivity } from './activityLog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase as any;

// ─── Configuration ─────────────────────────────────────────────────────────────
export const OTP_TRIGGER_THRESHOLD = 5;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface LoginAttemptStatus {
  userId: string | null;
  failedAttempts: number;
  attemptsRemaining: number;
  requiresOtp: boolean;
  otpExpiresAt: string | null;
  otpSecondsLeft: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function parseRpcResult(data: Record<string, unknown> | null): LoginAttemptStatus {
  if (!data) {
    return {
      userId: null,
      failedAttempts: 0,
      attemptsRemaining: OTP_TRIGGER_THRESHOLD,
      requiresOtp: false,
      otpExpiresAt: null,
      otpSecondsLeft: 0,
    };
  }
  return {
    userId: (data.user_id as string) ?? null,
    failedAttempts: (data.failed_attempts as number) ?? 0,
    attemptsRemaining: (data.attempts_remaining as number) ?? OTP_TRIGGER_THRESHOLD,
    requiresOtp: (data.requires_otp as boolean) ?? false,
    otpExpiresAt: (data.otp_expires_at as string) ?? null,
    otpSecondsLeft: (data.otp_seconds_left as number) ?? 0,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Check current attempt status for an email (pre-auth, no session needed).
 */
export async function getLoginAttemptStatus(email: string): Promise<LoginAttemptStatus> {
  const { data, error } = await rpc.rpc('pre_auth_login_check', {
    p_email: email,
  });

  if (error) {
    return parseRpcResult(null);
  }

  return parseRpcResult(data);
}

/**
 * Record a failed login attempt (pre-auth RPC).
 * On the 5th failure the OTP expiry window is automatically set server-side.
 */
export async function recordFailedAttempt(email: string): Promise<LoginAttemptStatus> {
  const { data, error } = await rpc.rpc('record_failed_login', {
    p_email: email,
  });

  if (error) {
    return parseRpcResult(null);
  }

  return parseRpcResult(data);
}

/**
 * Send an OTP email and refresh the expiry window in the DB.
 */
export async function sendLoginOtp(email: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      return { error: error.message };
    }

    // Refresh OTP expiry window via RPC (no session needed)
    await rpc.rpc('refresh_otp_expiry', { p_email: email });

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message };
  }
}

/**
 * Verify an OTP code.
 * On success the attempt counter is reset and a session is established.
 */
export async function verifyLoginOtp(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user?.id) {
      await resetLoginAttempts(data.user.id);
      logActivity(data.user.id, 'user_login', 'user', data.user.id, { email });
      return { success: true };
    }

    return { success: false, error: 'OTP verification failed' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Reset the counter after a successful login or OTP verification.
 * Called post-auth, so the user has a session (but the RPC also accepts anon).
 */
export async function resetLoginAttempts(userId: string): Promise<void> {
  const { error } = await rpc.rpc('reset_login_attempts_rpc', {
    p_user_id: userId,
  });

  if (error) {
    // non-critical: counter reset failure should not interrupt the login flow
  }
}
