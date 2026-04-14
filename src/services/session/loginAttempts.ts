/**
 * loginAttempts.ts
 * Server-side login attempt tracking with OTP trigger + progressive delays.
 *
 * All pre-auth operations go through SECURITY DEFINER RPCs so they bypass RLS
 * (the user has no session yet when these run).
 *
 * Flow:
 *   1. pre_auth_login_check      — resolve email → status + delay info
 *   2. record_failed_login       — increment counter, set progressive delay, auto-set OTP window at 5
 *   3. sendLoginOtp              — send OTP email via Supabase Auth + validate cooldown
 *   4. verifyLoginOtp            — verify OTP, reset counter on success (resets delays too)
 *   5. resetLoginAttempts        — zero-out (called post-auth)
 *   6. checkIpMacLimits          — validate IP/device combo hasn't hit 5 per 5 min
 *   7. validateOtpRequestCooldown — check if 60 seconds passed since last OTP request
 *   8. getOtpRequestCooldownRemaining — thin wrapper around validateOtpRequestCooldown returning seconds only
 */

import { supabase } from '../supabase';
import { logActivity } from '../activityLog';
import { getMacProxy } from '../../utils/ipMacUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase as any;

// ─── Configuration ─────────────────────────────────────────────────────────────
export const OTP_TRIGGER_THRESHOLD = 5;
export const OTP_VERIFICATION_ATTEMPTS_MAX = 5;
export const OTP_REQUEST_COOLDOWN_SECONDS = 60;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface LoginAttemptStatus {
  userId: string | null;
  failedAttempts: number;
  attemptsRemaining: number;
  requiresOtp: boolean;
  otpExpiresAt: string | null;
  otpSecondsLeft: number;
  delayUntil: string | null;
  secondsUntilRetry: number;
}

export interface IpMacLimitStatus {
  allowed: boolean;
  failedAttempts: number;
  attemptsRemaining: number;
  limit: number;
  windowMinutes: number;
  windowResetAt: string | null;
  secondsUntilReset: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calculate progressive delay in seconds based on attempt count
 * 1st attempt: 0s, 2nd: 5s, 3rd: 15s, 4th+: 30s
 */
export function getProgressiveDelaySeconds(attemptCount: number): number {
  if (attemptCount < 2) return 0;
  if (attemptCount === 2) return 5;
  if (attemptCount === 3) return 15;
  return 30; // 4th attempt and beyond
}

function parseRpcResult(data: Record<string, unknown> | null): LoginAttemptStatus {
  if (!data) {
    return {
      userId: null,
      failedAttempts: 0,
      attemptsRemaining: OTP_TRIGGER_THRESHOLD,
      requiresOtp: false,
      otpExpiresAt: null,
      otpSecondsLeft: 0,
      delayUntil: null,
      secondsUntilRetry: 0,
    };
  }
  return {
    userId: (data.user_id as string) ?? null,
    failedAttempts: (data.failed_attempts as number) ?? 0,
    attemptsRemaining: (data.attempts_remaining as number) ?? OTP_TRIGGER_THRESHOLD,
    requiresOtp: (data.requires_otp as boolean) ?? false,
    otpExpiresAt: (data.otp_expires_at as string) ?? null,
    otpSecondsLeft: (data.otp_seconds_left as number) ?? 0,
    delayUntil: (data.delay_until as string) ?? null,
    secondsUntilRetry: (data.seconds_until_retry as number) ?? 0,
  };
}

function parseIpMacLimitResult(data: Record<string, unknown> | null): IpMacLimitStatus {
  if (!data) {
    return {
      allowed: true,
      failedAttempts: 0,
      attemptsRemaining: 5,
      limit: 5,
      windowMinutes: 5,
      windowResetAt: null,
      secondsUntilReset: 0,
    };
  }
  return {
    allowed: (data.allowed as boolean) ?? true,
    failedAttempts: (data.failed_attempts as number) ?? 0,
    attemptsRemaining: (data.attempts_remaining as number) ?? 5,
    limit: (data.limit as number) ?? 5,
    windowMinutes: (data.window_minutes as number) ?? 5,
    windowResetAt: (data.window_reset_at as string) ?? null,
    secondsUntilReset: (data.seconds_until_reset as number) ?? 0,
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
 * Validates cooldown (60 seconds) before sending.
 */
export async function sendLoginOtp(email: string): Promise<{ error?: string }> {
  try {
    // Validate cooldown on server side first
    const cooldownStatus = await validateOtpRequestCooldown(email);
    if (!cooldownStatus.allowed) {
      const minutes = Math.ceil(cooldownStatus.secondsRemaining / 60) || 1;
      return { 
        error: `Please wait ${minutes} minute(s) before requesting a new code.` 
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      return { error: error.message };
    }

    // Refresh OTP expiry window via RPC (no session needed)
    // This also resets verification attempts and updates last_otp_request_at
    await rpc.rpc('refresh_otp_expiry', { p_email: email });

    return {};
  } catch (_err: unknown) {
    const message = _err instanceof Error ? _err.message : 'Unknown error';
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
  } catch (_err: unknown) {
    const message = _err instanceof Error ? _err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Reset the counter after a successful login or OTP verification.
 * Called post-auth, so the user has a session (but the RPC also accepts anon).
 * This also clears any progressive delay that was set.
 */
export async function resetLoginAttempts(userId: string): Promise<void> {
  const { error } = await rpc.rpc('reset_login_attempts_rpc', {
    p_user_id: userId,
  });

  if (error) {
    // non-critical: counter reset failure should not interrupt the login flow
  }
}

/**
 * Check if IP/MAC combo has exceeded rate limit (5 attempts per 5 minutes).
 * Should be called before password attempt to validate device is not spamming.
 */
export async function checkIpMacLimits(email: string): Promise<IpMacLimitStatus> {
  try {
    const macProxy = await getMacProxy();

    // Skip RPC if IP or user-agent detection failed (prevents 400 errors from invalid parameters)
    if (macProxy.ipAddress === 'unknown' || macProxy.userAgent === 'unknown') {
      console.debug('[IP/MAC Rate Limit] Skipping check - IP/UA detection unavailable');
      return parseIpMacLimitResult(null);
    }

    const { data, error } = await rpc.rpc('check_ip_mac_limits', {
      p_ip_address: macProxy.ipAddress,
      p_user_agent: macProxy.userAgent,
      p_email: email,
    });

    if (error) {
      // On error, assume allowed (fail-open for UX, not security-critical since server validates)
      console.debug('[IP/MAC Rate Limit] RPC error:', error);
      return parseIpMacLimitResult(null);
    }

    return parseIpMacLimitResult(data);
  } catch (_err: unknown) {
    // Network error or other issue, assume allowed
    console.debug('[IP/MAC Rate Limit] Exception:', _err);
    return parseIpMacLimitResult(null);
  }
}

/**
 * Validate OTP request cooldown (60 seconds between requests).
 * Returns allowed status and seconds remaining in cooldown window.
 */
export async function validateOtpRequestCooldown(
  email: string
): Promise<{ allowed: boolean; secondsRemaining: number; cooldownSeconds: number }> {
  try {
    const { data, error } = await rpc.rpc('validate_otp_request_cooldown', {
      p_email: email,
    });

    if (error) {
      // On error, assume allowed (fail-open)
      return { allowed: true, secondsRemaining: 0, cooldownSeconds: OTP_REQUEST_COOLDOWN_SECONDS };
    }

    return {
      allowed: (data?.allowed as boolean) ?? true,
      secondsRemaining: (data?.seconds_remaining as number) ?? 0,
      cooldownSeconds: (data?.cooldown_seconds as number) ?? OTP_REQUEST_COOLDOWN_SECONDS,
    };
  } catch (_err: unknown) {
    return { allowed: true, secondsRemaining: 0, cooldownSeconds: OTP_REQUEST_COOLDOWN_SECONDS };
  }
}

/**
 * Get OTP request cooldown remaining seconds.
 * Delegates to validateOtpRequestCooldown and extracts secondsRemaining.
 */
export async function getOtpRequestCooldownRemaining(email: string): Promise<number> {
  const { secondsRemaining } = await validateOtpRequestCooldown(email);
  return secondsRemaining;
}
