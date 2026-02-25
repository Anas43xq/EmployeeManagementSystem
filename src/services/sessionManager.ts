
import { supabase } from './supabase';

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
    
    if (refreshData.session) {
      return refreshData.session.access_token;
    }
    
    return null;
  } catch {
    return null;
  }
}
