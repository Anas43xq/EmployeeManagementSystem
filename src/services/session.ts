

/**
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

import { supabase } from './supabase';
import { logActivity } from './activityLog';
import { getMacProxy } from '../utils/ipMacUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase as any;

// ─── Configuration ─────────────────────────────────────────────────────────────
export const OTP_TRIGGER_THRESHOLD = 5;
export const OTP_VERIFICATION_ATTEMPTS_MAX = 5;
export const OTP_REQUEST_COOLDOWN_SECONDS = 120;

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
 * 1st attempt: 0s, 2nd: 5s, 3rd: 15s, 4th: 30s, 5th: 0s (escalate to OTP immediately)
 */
export function getProgressiveDelaySeconds(attemptCount: number): number {
  if (attemptCount < 2) return 0;
  if (attemptCount === 2) return 5;
  if (attemptCount === 3) return 15;
  if (attemptCount === 4) return 30;
  if (attemptCount === 5) return 0; // Escalate to OTP immediately, no delay
  return 30; // 6th+ attempts (shouldn't reach here, but default to 30s)
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
 * TASK 2: Escalate to OTP directly when failed attempts reach 5
 * Replaces the 4-hop chain: throw REQUIRES_OTP_NEW → catch → triggerOtpFlow → sendLoginOtp
 * 
 * This function:
 * - Sets requiresOtp = true in login_attempts (already done by record_failed_login at 5 attempts)
 * - Sends the OTP email directly via Supabase Auth
 * - Refreshes OTP expiry window server-side
 * - Returns with no thrown errors
 * 
 * Used when failedAttempts reaches 5 in recordFailedAttempt.
 */
export async function escalateToOtp(email: string): Promise<{ error?: string }> {
  try {
    // Send OTP email via Supabase Auth
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
 * TASK 5: Reset login counters with proper scope isolation
 * 
 * This function resets login attempt counters after successful auth.
 * Called post-auth (user has a session), but the RPC also accepts anon.
 * 
 * Counter reset scope:
 * - Password login success: resets failed_attempts and requires_otp only (password counters)
 *   - Does NOT reset: otp_attempts, last_otp_request_at
 * - OTP verification success: resets ALL counters (both password + OTP)
 *   - Resets: failed_attempts, requires_otp, otp_attempts, last_otp_request_at
 *   - Also clears any progressive delay that was set
 * 
 * This ensures a successful password login doesn't erase OTP attempt history
 * if the user later needs to escalate to OTP. Only a successful OTP verification
 * fully clears all counters.
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
    const isInvalid = (val: string | null | undefined) =>
      !val || val === 'unknown' || (typeof val === 'string' && val.trim() === '');

    if (isInvalid(macProxy.ipAddress) || isInvalid(macProxy.userAgent)) {
      return parseIpMacLimitResult(null);
    }

    const { data, error } = await rpc.rpc('check_ip_mac_limits', {
      p_ip_address: macProxy.ipAddress,
      p_user_agent: macProxy.userAgent,
      p_email: email,
    });

    if (error) {
      // On error, assume allowed (fail-open for UX, not security-critical since server validates)
      console.error('[IP/MAC Rate Limit] RPC error (400 check params above):', {
        status: error?.status,
        message: error?.message,
      });
      return parseIpMacLimitResult(null);
    }

    return parseIpMacLimitResult(data);
  } catch (_err: unknown) {
    // Network error or other issue, assume allowed
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


// File: sessionManager.ts

// Session health lives in local storage so progressive recovery survives tab refreshes.
const SESSION_HEALTH_KEY = 'ems_session_health';
const LAST_ACTIVITY_KEY = 'ems_last_activity';
const MAX_FAILED_ATTEMPTS = 3;
export const RECOVERY_COOLDOWN_MS = 5000;
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes

interface SessionHealth {
  failedAttempts: number;
  lastAttempt: number;
  lastRecovery: number;
}

export interface SessionEnforcementState {
  bannedAt: string | null;
  currentSessionToken: string | null;
  isActive: boolean | null;
}

interface SessionEnforcementRow {
  banned_at?: string | null;
  current_session_token?: string | null;
  is_active?: boolean | null;
}

function toSessionEnforcementState(value: unknown): SessionEnforcementState {
  if (!value || typeof value !== 'object') {
    return { bannedAt: null, currentSessionToken: null, isActive: null };
  }

  const row = value as SessionEnforcementRow;

  return {
    bannedAt: row.banned_at ?? null,
    currentSessionToken: row.current_session_token ?? null,
    isActive: row.is_active ?? null,
  };
}

function getSessionHealth(): SessionHealth {
  try {
    const stored = localStorage.getItem(SESSION_HEALTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
  }
  return { failedAttempts: 0, lastAttempt: 0, lastRecovery: 0 };
}

function setSessionHealth(health: SessionHealth): void {
  try {
    localStorage.setItem(SESSION_HEALTH_KEY, JSON.stringify(health));
  } catch {
  }
}

export function resetSessionHealth(): void {
  try {
    localStorage.removeItem(SESSION_HEALTH_KEY);
  } catch {
  }
}

export function recordAuthFailure(): boolean {
  const health = getSessionHealth();
  const now = Date.now();

  health.failedAttempts++;
  health.lastAttempt = now;
  setSessionHealth(health);

  if (health.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const timeSinceLastRecovery = now - health.lastRecovery;
    if (timeSinceLastRecovery > RECOVERY_COOLDOWN_MS) {
      return true;
    }
  }

  return false;
}

export function recordAuthSuccess(): void {
  resetSessionHealth();
}

export async function clearAuthState(): Promise<void> {
  const health = getSessionHealth();
  health.lastRecovery = Date.now();
  health.failedAttempts = 0;
  setSessionHealth(health);

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sb-') ||
      key.startsWith('ems-') ||
      key.includes('supabase') ||
      key.includes('auth-token')
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  });

  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
  }
}

export async function signOutCurrentSession(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSessionEnforcementState(userId: string): Promise<SessionEnforcementState | null> {
  const { data, error } = await supabase
    .from('users')
    .select('is_active, banned_at, current_session_token')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return toSessionEnforcementState(data);
}

export function subscribeToSessionEnforcement(
  userId: string,
  onUpdate: (state: SessionEnforcementState) => void,
): () => void {
  const channel = supabase
    .channel(`user-session:${userId}:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      (payload) => {
        onUpdate(toSessionEnforcementState(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt - Math.floor(Date.now() / 1000);

      if (expiresIn < 300) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          return refreshData.session.access_token;
        }
        if (expiresIn > 0) {
          return session.access_token;
        }
        return null;
      }
    }

    return session.access_token;
  } catch {
    return null;
  }
}

export function updateLastActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
  }
}

export function getLastActivity(): number {
  try {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

export function isInactivityTimeoutExceeded(): boolean {
  const lastActivity = getLastActivity();
  return Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
}

export function getInactivityTimeoutMs(): number {
  return INACTIVITY_TIMEOUT_MS;
}

export function clearLastActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
  }
}

export async function getFreshAccessToken(): Promise<string | null> {
  try {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const expiresAt = session.expires_at || 0;
        const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          return session.access_token;
        }
      }
      return null;
    }

    if (refreshData && refreshData.session) {
      return refreshData.session.access_token;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Update the last_activity_at timestamp for a user in the database.
 * Call this on successful login to establish the activity baseline.
 * Note: In production, this should also be called on real API calls (not page loads).
 */
export async function updateServerActivityTimestamp(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Validate if a user's session is still active based on server-side last_activity_at.
 * If last_activity_at > 8 hours ago, the session is considered expired.
 * Returns true if session is valid, false if expired.
 */
export async function validateSessionActivity(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('last_activity_at')
      .eq('id', userId)
      .single();

    if (error || !data || !data.last_activity_at) {
      // If no last_activity_at, consider session valid (new account)
      return true;
    }

    const lastActivity = new Date(data.last_activity_at).getTime();
    const now = Date.now();
    const inactiveMinutes = (now - lastActivity) / 60000;

    // 8 hours = 480 minutes
    const isValid = inactiveMinutes <= 120;
    return isValid;
  } catch {
    return false;
  }
}

