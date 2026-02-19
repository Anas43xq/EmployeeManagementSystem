/**
 * Session Manager - Handles authentication state recovery and cleanup
 * Prevents stuck loading states caused by corrupted/stale tokens
 */

import { supabase } from './supabase';

const SESSION_HEALTH_KEY = 'ems_session_health';
const MAX_FAILED_ATTEMPTS = 3;
const RECOVERY_COOLDOWN_MS = 5000;

interface SessionHealth {
  failedAttempts: number;
  lastAttempt: number;
  lastRecovery: number;
}

function getSessionHealth(): SessionHealth {
  try {
    const stored = localStorage.getItem(SESSION_HEALTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { failedAttempts: 0, lastAttempt: 0, lastRecovery: 0 };
}

function setSessionHealth(health: SessionHealth): void {
  try {
    localStorage.setItem(SESSION_HEALTH_KEY, JSON.stringify(health));
  } catch {
    // Ignore storage errors
  }
}

export function resetSessionHealth(): void {
  try {
    localStorage.removeItem(SESSION_HEALTH_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function recordAuthFailure(): boolean {
  const health = getSessionHealth();
  const now = Date.now();
  
  health.failedAttempts++;
  health.lastAttempt = now;
  setSessionHealth(health);
  
  // If we've exceeded max attempts, trigger recovery
  if (health.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const timeSinceLastRecovery = now - health.lastRecovery;
    if (timeSinceLastRecovery > RECOVERY_COOLDOWN_MS) {
      return true; // Needs recovery
    }
  }
  
  return false;
}

export function recordAuthSuccess(): void {
  resetSessionHealth();
}

/**
 * Clears corrupted auth state from localStorage
 * This is the programmatic equivalent of localStorage.clear() + reload
 * but targeted only at auth-related data
 */
export async function clearAuthState(): Promise<void> {
  console.warn('[SessionManager] Clearing corrupted auth state...');
  
  const health = getSessionHealth();
  health.lastRecovery = Date.now();
  health.failedAttempts = 0;
  setSessionHealth(health);
  
  // Clear Supabase auth storage keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sb-') || 
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
      // Ignore removal errors
    }
  });
  
  // Also clear session storage
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore session storage errors
  }
  
  console.log('[SessionManager] Auth state cleared');
}

/**
 * Validates the current session and recovers if needed
 * Returns true if session is valid, false if user needs to re-login
 */
export async function validateAndRecoverSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[SessionManager] Session validation error:', error.message);
      
      if (recordAuthFailure()) {
        await clearAuthState();
        return false;
      }
      
      // Try one refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        if (recordAuthFailure()) {
          await clearAuthState();
        }
        return false;
      }
      
      recordAuthSuccess();
      return true;
    }
    
    if (!session) {
      return false;
    }
    
    // Check if token is about to expire (within 60 seconds)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn < 60) {
        console.log('[SessionManager] Token expiring soon, refreshing...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[SessionManager] Proactive refresh failed:', refreshError.message);
          // Don't fail here, the token might still be valid
        }
      }
    }
    
    recordAuthSuccess();
    return true;
  } catch (error) {
    console.error('[SessionManager] Unexpected error:', error);
    if (recordAuthFailure()) {
      await clearAuthState();
    }
    return false;
  }
}

/**
 * Get a valid access token for API calls
 * Handles refresh automatically and returns null if session is invalid
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('[SessionManager] No session found');
      return null;
    }
    
    // Check if we need to refresh (if expiring within 5 minutes, refresh proactively)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
      console.log('[SessionManager] Token expires in', expiresIn, 'seconds');
      
      if (expiresIn < 300) { // 5 minutes
        console.log('[SessionManager] Token expiring soon, refreshing...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          console.log('[SessionManager] Token refreshed successfully');
          return refreshData.session.access_token;
        }
        console.warn('[SessionManager] Refresh failed:', refreshError?.message);
        // If refresh failed but token still has time, use the current one
        if (expiresIn > 0) {
          return session.access_token;
        }
        return null;
      }
    }
    
    return session.access_token;
  } catch (error) {
    console.error('[SessionManager] Error getting access token:', error);
    return null;
  }
}

/**
 * Force refresh the session and return a fresh access token
 * Use this before critical operations like payroll generation
 */
export async function getFreshAccessToken(): Promise<string | null> {
  try {
    console.log('[SessionManager] Forcing token refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('[SessionManager] Force refresh failed:', refreshError.message);
      
      // If refresh fails, try to get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const expiresAt = session.expires_at || 0;
        const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          console.log('[SessionManager] Using existing token (expires in', expiresIn, 's)');
          return session.access_token;
        }
      }
      return null;
    }
    
    if (refreshData.session) {
      console.log('[SessionManager] Force refresh successful');
      return refreshData.session.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('[SessionManager] Error force refreshing token:', error);
    return null;
  }
}
