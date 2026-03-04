/**
 * loginAttempts.ts
 * Server-side login attempt tracking with OTP trigger.
 *
 * - Track consecutive failed login attempts per user.
 * - After 5 failed attempts → automatically send OTP email.
 * - OTP valid for 10 minutes; after expiry the user must request a new one.
 * - Successful OTP verification or password login resets the counter.
 */

import { supabase } from './supabase';
import { logActivity } from './activityLog';

// ─── Configuration ─────────────────────────────────────────────────────────────
export const OTP_TRIGGER_THRESHOLD = 5;
const OTP_VALIDITY_MINUTES = 10;
const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface LoginAttemptRecord {
  id: string;
  user_id: string;
  failed_attempts: number;
  last_attempt_at: string | null;
  otp_sent_at: string | null;
  otp_expires_at: string | null;
}

export interface LoginAttemptStatus {
  failedAttempts: number;
  attemptsRemaining: number;
  requiresOtp: boolean;
  otpExpiresAt: string | null;
  otpSecondsLeft: number; // > 0 = time left, <= 0 = expired / no OTP
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function getRecord(userId: string): Promise<LoginAttemptRecord | null> {
  const { data, error } = await db
    .from('login_attempts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[loginAttempts] getRecord error:', error.message);
  }
  return (data as LoginAttemptRecord) ?? null;
}

async function upsertRecord(
  userId: string,
  patch: Partial<Omit<LoginAttemptRecord, 'id' | 'user_id'>>
): Promise<void> {
  const { error } = await db
    .from('login_attempts')
    .upsert(
      { user_id: userId, ...patch },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[loginAttempts] upsertRecord error:', error.message);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get current attempt status for a user.
 */
export async function getLoginAttemptStatus(userId: string): Promise<LoginAttemptStatus> {
  const record = await getRecord(userId);
  const failedAttempts = record?.failed_attempts ?? 0;
  const attemptsRemaining = Math.max(0, OTP_TRIGGER_THRESHOLD - failedAttempts);

  let requiresOtp = failedAttempts >= OTP_TRIGGER_THRESHOLD;
  let otpSecondsLeft = 0;

  if (requiresOtp && record?.otp_expires_at) {
    const expiresAt = new Date(record.otp_expires_at).getTime();
    otpSecondsLeft = Math.ceil((expiresAt - Date.now()) / 1000);

    // OTP expired → user needs to request a fresh OTP
    if (otpSecondsLeft <= 0) {
      otpSecondsLeft = 0;
    }
  }

  return {
    failedAttempts,
    attemptsRemaining,
    requiresOtp,
    otpExpiresAt: record?.otp_expires_at ?? null,
    otpSecondsLeft,
  };
}

/**
 * Record a failed login attempt and return updated status.
 * On the 5th failure the OTP expiry window is set.
 */
export async function recordFailedAttempt(
  userId: string,
  userEmail?: string
): Promise<LoginAttemptStatus> {
  const record = await getRecord(userId);
  const newFails = (record?.failed_attempts ?? 0) + 1;

  const patch: Partial<Omit<LoginAttemptRecord, 'id' | 'user_id'>> = {
    failed_attempts: newFails,
    last_attempt_at: new Date().toISOString(),
  };

  // Set OTP window on the exact threshold hit
  if (newFails === OTP_TRIGGER_THRESHOLD) {
    const now = new Date();
    patch.otp_sent_at = now.toISOString();
    patch.otp_expires_at = new Date(now.getTime() + OTP_VALIDITY_MS).toISOString();
  }

  await upsertRecord(userId, patch);

  try {
    await logActivity(userId, 'user_login_failed', 'user', userId, {
      email: userEmail,
      failed_attempts: newFails,
      requires_otp: newFails >= OTP_TRIGGER_THRESHOLD,
      reason: 'invalid_credentials',
    });
  } catch { /* non-critical */ }

  return getLoginAttemptStatus(userId);
}

/**
 * Send an OTP email.
 * Updates the OTP expiry window in the DB.
 */
export async function sendLoginOtp(
  email: string,
  userId?: string
): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      console.error('[loginAttempts] sendLoginOtp error:', error.message);
      return { error: error.message };
    }

    // Refresh OTP expiry window in the DB
    if (userId) {
      const now = new Date();
      await upsertRecord(userId, {
        otp_sent_at: now.toISOString(),
        otp_expires_at: new Date(now.getTime() + OTP_VALIDITY_MS).toISOString(),
      });
    }

    return {};
  } catch (err: any) {
    console.error('[loginAttempts] sendLoginOtp exception:', err.message);
    return { error: err.message };
  }
}

/**
 * Verify an OTP code.
 * On success the attempt counter is reset and a session is returned.
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
      return { success: true };
    }

    return { success: false, error: 'OTP verification failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Reset the counter after a successful login or OTP verification.
 */
export async function resetLoginAttempts(userId: string): Promise<void> {
  await upsertRecord(userId, {
    failed_attempts: 0,
    last_attempt_at: null,
    otp_sent_at: null,
    otp_expires_at: null,
  });
}
