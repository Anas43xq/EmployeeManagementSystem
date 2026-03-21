import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, db } from '../services/supabase';
import { logActivity } from '../services/activityLog';
import { clearAuthState, resetSessionHealth, updateLastActivity, clearLastActivity } from '../services/sessionManager';
import { getLoginAttemptStatus, recordFailedAttempt, resetLoginAttempts } from '../services/loginAttempts';
import { clearAllCache } from '../services/apiCache';
import { isRefreshTokenError, isTransientError } from '../services/authHelpers';
import { useInactivityLogout } from '../hooks/useInactivityLogout';
import { useSessionEnforcement } from '../hooks/useSessionEnforcement';

export type { AuthUser } from '../services/authHelpers';
import type { AuthUser, UserRole } from '../services/authHelpers';

// -- User data cache -----------------------------------------------------------
const userDataCache = new Map<string, { data: AuthUser; timestamp: number }>();
const USER_CACHE_TTL = 60000; // 1 minute

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);
  const loadingUserRef = useRef<string | null>(null);
  const visibilityCheckRef = useRef(false);
  const lastVisibilityCheckRef = useRef(0);

  // -- Load user data from DB (with in-memory cache) -------------------------
  const loadUserData = useCallback(async (authUser: User): Promise<AuthUser | null> => {
    const cached = userDataCache.get(authUser.id);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) return cached.data;

    if (loadingUserRef.current === authUser.id) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const cachedAfterWait = userDataCache.get(authUser.id);
      if (cachedAfterWait) return cachedAfterWait.data;
      return null;
    }
    loadingUserRef.current = authUser.id;
    try {
      const role = (authUser.app_metadata?.role || authUser.user_metadata?.role) as UserRole | undefined;
      const { data, error } = await db
        .from('users')
        .select('role, employee_id, is_active, banned_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        return { id: authUser.id, email: authUser.email || '', role: role || 'staff', employeeId: null, is_active: false };
      }
      // Banned users are signed out; deactivated users stay to see the Deactivated screen.
      if (data?.banned_at !== null && data?.banned_at !== undefined) {
        userDataCache.delete(authUser.id);
        await supabase.auth.signOut();
        throw new Error('Your account has been banned');
      }
      const userData: AuthUser = {
        id: authUser.id,
        email: authUser.email || '',
        role: data?.role || role || 'staff',
        employeeId: data?.employee_id || null,
        is_active: data?.is_active ?? false,
      };
      userDataCache.set(authUser.id, { data: userData, timestamp: Date.now() });
      return userData;
    } catch (_error) {
      if ((_error as Error).message === 'Your account has been banned') throw _error;
      return { id: authUser.id, email: authUser.email || '', role: 'staff', employeeId: null, is_active: false };
    } finally {
      loadingUserRef.current = null;
    }
  }, []);

  const clearCache = useCallback(() => { userDataCache.clear(); }, []);

  // -- Session init, auth state listener, visibility token refresh -----------
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let mounted = true;
    const initTimeout = setTimeout(() => { if (mounted) setLoading(false); }, 8000);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (mounted) { setUser(null); setLoading(false); }
          return;
        }
        const userData = await loadUserData(session.user);
        if (mounted && userData) setUser(userData);
      } catch (_error) {
        if ((_error as Error).message === 'Your account has been deactivated') {
          if (mounted) setUser(null);
        } else if (isRefreshTokenError(_error as Error)) {
          await clearAuthState();
        }
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(initTimeout);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { clearCache(); clearAllCache(); if (mounted) setUser(null); return; }
      if (event === 'TOKEN_REFRESHED') return;
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        try {
          const userData = await loadUserData(session.user);
          if (mounted && userData) setUser(userData);
        } catch (_err) {
          if ((_err as Error).message === 'Your account has been deactivated' && mounted) setUser(null);
        }
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !mounted) return;
      const now = Date.now();
      if (now - lastVisibilityCheckRef.current < 2000 || visibilityCheckRef.current) return;
      visibilityCheckRef.current = true;
      lastVisibilityCheckRef.current = now;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          const expiresIn = (session.expires_at || 0) - Math.floor(Date.now() / 1000);
          if (expiresIn < 120 && expiresIn > 0) {
            try { await supabase.auth.refreshSession(); } catch { /* non-critical */ }
          }
          return;
        }
        if (isTransientError(error)) return;
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (isTransientError(refreshError) || refreshData?.session) return;
        if (isRefreshTokenError(refreshError) && mounted) { clearCache(); setUser(null); }
      } catch (_err) {
        if (isRefreshTokenError(_err as Error) && mounted) { clearCache(); setUser(null); }
      } finally {
        visibilityCheckRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUserData, clearCache]);

  // -- Inactivity auto-logout ------------------------------------------------
  const handleInactivityLogout = useCallback(() => {
    clearCache(); clearAllCache(); setUser(null);
  }, [clearCache]);
  useInactivityLogout(user, handleInactivityLogout);

  // -- Single-session enforcement + ban/deactivation -------------------------
  const handleForceLogout = useCallback(async () => {
    clearCache(); clearAllCache();
    localStorage.removeItem('ems_session_token');
    await clearAuthState();
    setUser(null);
  }, [clearCache]);
  const handleDeactivate = useCallback(() => {
    setUser(prev => prev ? { ...prev, is_active: false } : prev);
  }, []);
  useSessionEnforcement({ userId: user?.id, onForceLogout: handleForceLogout, onDeactivate: handleDeactivate });

  // -- Actions ---------------------------------------------------------------
  const resetSession = useCallback(async () => {
    setLoading(true);
    try {
      clearCache(); clearAllCache(); resetSessionHealth();
      await clearAuthState();
      await new Promise(resolve => setTimeout(resolve, 200));
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error && (error.message?.includes('AbortError') || error.name === 'AbortError')) {
        setUser(null); return;
      }
      setUser(session?.user ? await loadUserData(session.user) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadUserData, clearCache]);

  const signIn = async (email: string, password: string) => {
    clearCache(); clearAllCache(); updateLastActivity();

    const status = await getLoginAttemptStatus(email);
    if (!status.userId) throw new Error('EMAIL_NOT_FOUND');
    if (status.requiresOtp && status.otpSecondsLeft > 0) throw new Error('REQUIRES_OTP_ACTIVE');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const updated = await recordFailedAttempt(email);
      if (updated.requiresOtp) throw new Error('REQUIRES_OTP_NEW');
      if (updated.attemptsRemaining > 0 && updated.attemptsRemaining < 5) {
        throw new Error(`ATTEMPTS_REMAINING:${updated.attemptsRemaining}`);
      }
      throw error;
    }
    if (data.user) {
      await resetLoginAttempts(data.user.id).catch(() => {});
      const sessionToken = crypto.randomUUID();
      localStorage.setItem('ems_session_token', sessionToken);
      await supabase.rpc('set_own_session_token', { p_token: sessionToken });
      logActivity(data.user.id, 'user_login', 'user', data.user.id, { email: data.user.email });
    }
  };

  const signOut = async () => {
    if (user) {
      logActivity(user.id, 'user_logout', 'user', user.id);
      await supabase.rpc('clear_own_session_token'); // SECURITY DEFINER � bypasses RLS
    }
    localStorage.removeItem('ems_session_token');
    clearCache(); clearAllCache(); resetSessionHealth(); clearLastActivity();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, resetSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
