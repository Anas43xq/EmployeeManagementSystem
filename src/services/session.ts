import { supabase } from './supabase';
import { logActivity } from './activityLog';
import { getDeviceProxy } from '../utils/deviceIdentificationUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase as any;


export const OTP_TRIGGER_THRESHOLD = 5;
export const OTP_VERIFICATION_ATTEMPTS_MAX = 5;
export const OTP_REQUEST_COOLDOWN_SECONDS = 120;


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

export interface DeviceLimitStatus {
  allowed: boolean;
  failedAttempts: number;
  attemptsRemaining: number;
  limit: number;
  windowMinutes: number;
  windowResetAt: string | null;
  secondsUntilReset: number;
}




export function getProgressiveDelaySeconds(attemptCount: number): number {
  if (attemptCount < 2) return 0;
  if (attemptCount === 2) return 5;
  if (attemptCount === 3) return 15;
  if (attemptCount === 4) return 30;
  if (attemptCount === 5) return 0;
  return 30;
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

function parseDeviceLimitResult(data: Record<string, unknown> | null): DeviceLimitStatus {
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




export async function getLoginAttemptStatus(email: string): Promise<LoginAttemptStatus> {
  const { data, error } = await rpc.rpc('pre_auth_login_check', {
    p_email: email,
  });

  if (error) {
    return parseRpcResult(null);
  }

  return parseRpcResult(data);
}


export async function recordFailedAttempt(email: string): Promise<LoginAttemptStatus> {
  const { data, error } = await rpc.rpc('record_failed_login', {
    p_email: email,
  });

  if (error) {
    return parseRpcResult(null);
  }

  return parseRpcResult(data);
}


export async function escalateToOtp(email: string): Promise<{ error?: string }> {
  try {

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      return { error: error.message };
    }



    await rpc.rpc('refresh_otp_expiry', { p_email: email });

    return {};
  } catch (_err: unknown) {
    const message = _err instanceof Error ? _err.message : 'Unknown error';
    return { error: message };
  }
}


export async function sendLoginOtp(email: string): Promise<{ error?: string }> {
  try {

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



    await rpc.rpc('refresh_otp_expiry', { p_email: email });

    return {};
  } catch (_err: unknown) {
    const message = _err instanceof Error ? _err.message : 'Unknown error';
    return { error: message };
  }
}


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


export async function resetLoginAttempts(userId: string): Promise<void> {
  const { error } = await rpc.rpc('reset_login_attempts_rpc', {
    p_user_id: userId,
  });

  if (error) {

  }
}


export async function checkDeviceLimits(email: string): Promise<DeviceLimitStatus> {
  try {
    const deviceProxy = await getDeviceProxy();


    const isInvalid = (val: string | null | undefined) =>
      !val || val === 'unknown' || (typeof val === 'string' && val.trim() === '');

    if (isInvalid(deviceProxy.ipAddress) || isInvalid(deviceProxy.userAgent)) {
      return parseDeviceLimitResult(null);
    }

    const { data, error } = await rpc.rpc('check_device_limits', {
      p_ip_address: deviceProxy.ipAddress,
      p_user_agent: deviceProxy.userAgent,
      p_email: email,
    });

    if (error) {

      console.error('[Device Rate Limit] RPC error (400 check params above):', {
        status: error?.status,
        message: error?.message,
      });
      return parseDeviceLimitResult(null);
    }

    return parseDeviceLimitResult(data);
  } catch (_err: unknown) {

    return parseDeviceLimitResult(null);
  }
}


export async function validateOtpRequestCooldown(
  email: string
): Promise<{ allowed: boolean; secondsRemaining: number; cooldownSeconds: number }> {
  try {
    const { data, error } = await rpc.rpc('validate_otp_request_cooldown', {
      p_email: email,
    });

    if (error) {

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


export async function getOtpRequestCooldownRemaining(email: string): Promise<number> {
  const { secondsRemaining } = await validateOtpRequestCooldown(email);
  return secondsRemaining;
}





const SESSION_HEALTH_KEY = 'ems_session_health';
const LAST_ACTIVITY_KEY = 'ems_last_activity';
const MAX_FAILED_ATTEMPTS = 3;
export const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 1000;

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
  onError?: (error: Error) => void,
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
    .on('system', { event: 'join' }, () => {
      console.debug('[SessionEnforcement] WebSocket subscription connected');
    })
    .on('system', { event: 'leave' }, () => {
      console.debug('[SessionEnforcement] WebSocket subscription disconnected');
    })
    .on('system', { event: 'error' }, (error) => {
      console.warn('[SessionEnforcement] WebSocket subscription error:', error);
      onError?.(new Error(`Session subscription failed: ${error}`));
    })
    .subscribe((status, error) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.warn('[SessionEnforcement] Subscription status:', status, error);
        onError?.(new Error(`Session subscription ${status}`));
      } else if (status === 'SUBSCRIBED') {
        console.debug('[SessionEnforcement] Successfully subscribed to changes');
      }
    });

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


function isTransientError(error: unknown): boolean {
  const errorStr = String(error).toLowerCase();
  const timeoutError = error instanceof Error ? error.message.toLowerCase() : '';
  
  const timeoutCheck = timeoutError.length > 0 && (timeoutError.includes('abort') || timeoutError.includes('timeout'));
  
  return (
    errorStr.includes('failed to fetch') ||
    errorStr.includes('network') ||
    errorStr.includes('timeout') ||
    errorStr.includes('econnrefused') ||
    errorStr.includes('econnreset') ||
    errorStr.includes('socket hang up') ||
    timeoutCheck
  );
}

const MAX_VALIDATION_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

async function validateSessionActivityWithRetry(
  userId: string,
  attempt: number = 0
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const { data, error } = await supabase
      .from('users')
      .select('last_activity_at')
      .eq('id', userId)
      .single();

    clearTimeout(timeoutId);

    if (error) {
      if (isTransientError(error)) {
        if (attempt < MAX_VALIDATION_RETRIES) {
          const delay = RETRY_DELAYS[attempt];
          console.debug(
            `[Session] Validation transient error, retrying in ${delay}ms:`,
            error
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          return validateSessionActivityWithRetry(userId, attempt + 1);
        } else {
          console.debug(
            `[Session] Validation transient error after ${MAX_VALIDATION_RETRIES} retries, treating as valid session`,
            error
          );
          return true;
        }
      } else {
        console.debug('[Session] Validation auth error, treating session as invalid:', error);
        return true;
      }
    }

    if (!data || !data.last_activity_at) {
      return true;
    }

    const lastActivity = new Date(data.last_activity_at).getTime();
    const now = Date.now();
    const inactiveMinutes = (now - lastActivity) / 60000;
    const isValid = inactiveMinutes <= 120;

    console.debug(
      `[Session] User inactive for ${inactiveMinutes.toFixed(1)} minutes, valid: ${isValid}`
    );
    return isValid;
  } catch (error) {
    if (isTransientError(error)) {
      if (attempt < MAX_VALIDATION_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.debug(
          `[Session] Validation exception (transient), retrying in ${delay}ms:`,
          error
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return validateSessionActivityWithRetry(userId, attempt + 1);
      } else {
        console.debug(
          `[Session] Validation exception after ${MAX_VALIDATION_RETRIES} retries, treating as valid session`,
          error
        );
        return true;
      }
    } else {
      console.error('[Session] Validation caught unexpected error:', error);
      return false;
    }
  }
}

export async function validateSessionActivity(userId: string): Promise<boolean> {
  return validateSessionActivityWithRetry(userId, 0);
}

