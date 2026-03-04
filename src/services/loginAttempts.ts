/**
 * loginAttempts.ts
 * Server-side login attempt tracking with escalating lockout phases.
 *
 * Phase 1 → 3 consecutive fails  → 7-second lockout  → advance to phase 2
 * Phase 2 → 2 more fails         → 17-second lockout → advance to phase 3
 * Phase 3 → 1 more fail          → account deactivated for 2 h
 *                                   (or admin reactivates early)
 *
 * On every successful login the counter is reset to phase 1.
 */

import { supabase } from './supabase';
import { logActivity } from './activityLog';

// ─── Phase configuration ───────────────────────────────────────────────────────
export const LOGIN_PHASES = {
  1: { maxFails: 3, lockSeconds: 7  },
  2: { maxFails: 2, lockSeconds: 17 },
  3: { maxFails: 1, lockSeconds: 0  }, // 0 = deactivate instead of lock
} as const;

export type LoginPhase = keyof typeof LOGIN_PHASES;

// ─── Deactivation duration ─────────────────────────────────────────────────────
export const DEACTIVATION_HOURS = 2;

// ─── Admin spam-prevention (admins never lock/deactivate) ──────────────────────
export const ADMIN_SPAM_COOLDOWN_SECONDS = 15;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface LoginAttemptRecord {
  id: string;
  user_id: string;
  failed_attempts: number;
  login_phase: number;
  locked_until: string | null;
  last_attempt_at: string | null;
  deactivated_at: string | null;
  deactivation_reason: string | null;
}

export interface LockoutStatus {
  locked: boolean;
  remainingSeconds: number;
  isDeactivated: boolean;
  deactivatedAt: string | null;
  autoReactivatesAt: string | null;
  phase: number;
  failedAttempts: number;
  attemptsRemainingInPhase: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Use `as any` throughout because the `login_attempts` table is added via a new migration
// and the generated Supabase types file hasn't been regenerated yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Check whether a user has the 'admin' role.
 * Admins are exempt from lockout / deactivation — only spam-prevention applies.
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}

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
 * Check whether the user is currently locked out or deactivated.
 * Also triggers auto-reactivation if the 2-hour window has elapsed.
 */
export async function checkLoginLockout(userId: string): Promise<LockoutStatus> {
  // Ask the DB to auto-reactivate if eligible before we read the record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('auto_reactivate_user_if_eligible', { p_user_id: userId }).catch(() => {});

  const record = await getRecord(userId);

  const defaultStatus: LockoutStatus = {
    locked: false,
    remainingSeconds: 0,
    isDeactivated: false,
    deactivatedAt: null,
    autoReactivatesAt: null,
    phase: 1,
    failedAttempts: 0,
    attemptsRemainingInPhase: LOGIN_PHASES[1].maxFails,
  };

  if (!record) return defaultStatus;

  const phase = (record.login_phase as LoginPhase) ?? 1;
  const phaseConfig = LOGIN_PHASES[phase] ?? LOGIN_PHASES[1];

  // ── Deactivated? ───────────────────────────────────────────────────────────
  if (record.deactivated_at) {
    const deactivatedAt = new Date(record.deactivated_at);
    const autoReactivatesAt = new Date(
      deactivatedAt.getTime() + DEACTIVATION_HOURS * 60 * 60 * 1000
    );
    return {
      locked: true,
      remainingSeconds: 0,
      isDeactivated: true,
      deactivatedAt: record.deactivated_at,
      autoReactivatesAt: autoReactivatesAt.toISOString(),
      phase,
      failedAttempts: record.failed_attempts,
      attemptsRemainingInPhase: 0,
    };
  }

  // ── Locked (timer)? ────────────────────────────────────────────────────────
  if (record.locked_until) {
    const lockedUntil = new Date(record.locked_until);
    const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
    if (remaining > 0) {
      return {
        locked: true,
        remainingSeconds: remaining,
        isDeactivated: false,
        deactivatedAt: null,
        autoReactivatesAt: null,
        phase,
        failedAttempts: record.failed_attempts,
        attemptsRemainingInPhase: 0,
      };
    }
  }

  // ── Not locked — compute remaining attempts ────────────────────────────────
  // Phase thresholds: phase 1 = 0-2 fails, phase 2 = 3-4, phase 3 = 5
  const phaseStartFail = phase === 1 ? 0 : phase === 2 ? 3 : 5;
  const failsInPhase = record.failed_attempts - phaseStartFail;
  const attemptsRemainingInPhase = Math.max(0, phaseConfig.maxFails - failsInPhase);

  return {
    locked: false,
    remainingSeconds: 0,
    isDeactivated: false,
    deactivatedAt: null,
    autoReactivatesAt: null,
    phase,
    failedAttempts: record.failed_attempts,
    attemptsRemainingInPhase,
  };
}

/**
 * Record a failed login attempt, apply locking/deactivation logic, and
 * log the event to activity_logs.
 *
 * Returns the updated LockoutStatus so the caller knows what happened.
 */
export async function recordFailedAttempt(userId: string, userEmail?: string): Promise<LockoutStatus> {
  const admin = await isUserAdmin(userId);
  const record = await getRecord(userId);

  const currentFails = record?.failed_attempts ?? 0;
  const newFails     = currentFails + 1;

  // ── Admin path: never escalate, never deactivate ────────────────────────────
  if (admin) {
    let lockedUntil: string | null = null;

    // After 3 rapid fails → simple 15 s cooldown, then reset counter
    if (newFails >= 3) {
      lockedUntil = new Date(Date.now() + ADMIN_SPAM_COOLDOWN_SECONDS * 1000).toISOString();
    }

    await upsertRecord(userId, {
      failed_attempts:     lockedUntil ? 0 : newFails, // reset after cooldown
      login_phase:         1,                          // always stay phase 1
      locked_until:        lockedUntil,
      last_attempt_at:     new Date().toISOString(),
      deactivated_at:      null,
      deactivation_reason: null,
    });

    // Activity log
    try {
      await logActivity(userId, 'user_login_failed', 'user', userId, {
        email:           userEmail,
        phase:           1,
        failed_attempts: newFails,
        locked_until:    lockedUntil,
        deactivated:     false,
        reason:          'invalid_credentials',
        admin_exempt:    true,
      });
    } catch {
      // Non-critical
    }

    return checkLoginLockout(userId);
  }

  // ── Regular user path: escalating phases ────────────────────────────────────
  const currentPhase = (record?.login_phase as LoginPhase) ?? 1;

  // Phase 1: fails 1-3   → after 3rd fail: 7s lock, move to phase 2
  // Phase 2: fails 4-5   → after 5th fail: 17s lock, move to phase 3
  // Phase 3: fail  6     → deactivate

  let newPhase: LoginPhase          = currentPhase;
  let lockedUntil: string | null    = null;
  let deactivatedAt: string | null  = null;
  let deactivationReason: string | null = null;

  if (newFails === 3) {
    // End of phase 1 → lock 7s, advance to phase 2
    lockedUntil = new Date(Date.now() + LOGIN_PHASES[1].lockSeconds * 1000).toISOString();
    newPhase = 2;
  } else if (newFails === 5) {
    // End of phase 2 → lock 17s, advance to phase 3
    lockedUntil = new Date(Date.now() + LOGIN_PHASES[2].lockSeconds * 1000).toISOString();
    newPhase = 3;
  } else if (newFails >= 6) {
    // Phase 3: deactivate
    deactivatedAt      = new Date().toISOString();
    deactivationReason = 'too_many_failed_attempts';

    // Set is_active = false in users table
    await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }

  // Persist
  await upsertRecord(userId, {
    failed_attempts:     newFails,
    login_phase:         newPhase,
    locked_until:        lockedUntil ?? record?.locked_until ?? null,
    last_attempt_at:     new Date().toISOString(),
    deactivated_at:      deactivatedAt,
    deactivation_reason: deactivationReason,
  });

  // Activity log
  try {
    await logActivity(
      userId,
      'user_login_failed',
      'user',
      userId,
      {
        email:           userEmail,
        phase:           newPhase,
        failed_attempts: newFails,
        locked_until:    lockedUntil ?? null,
        deactivated:     deactivatedAt !== null,
        reason:          deactivationReason ?? 'invalid_credentials',
      }
    );
  } catch {
    // Non-critical — don't block the auth flow
  }

  // Return fresh status
  return checkLoginLockout(userId);
}

/**
 * Reset the failed-attempt counter after a successful login.
 */
export async function resetLoginAttempts(userId: string): Promise<void> {
  await upsertRecord(userId, {
    failed_attempts:     0,
    login_phase:         1,
    locked_until:        null,
    last_attempt_at:     null,
    deactivated_at:      null,
    deactivation_reason: null,
  });
}

/**
 * Admin manual reactivation — clears deactivation and resets counter.
 */
export async function adminReactivateUser(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('users')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  await upsertRecord(userId, {
    failed_attempts:     0,
    login_phase:         1,
    locked_until:        null,
    last_attempt_at:     null,
    deactivated_at:      null,
    deactivation_reason: null,
  });
}
