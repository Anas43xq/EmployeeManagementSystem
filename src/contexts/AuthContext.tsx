import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase, db } from '../services/supabase';
import { logActivity } from '../services/activityLog';
import { 
  clearAuthState, 
  recordAuthSuccess,
  recordAuthFailure,
  resetSessionHealth,
  updateLastActivity,
  getLastActivity,
  getInactivityTimeoutMs,
  clearLastActivity
} from '../services/sessionManager';
import { clearAllCache } from '../services/apiCache';

const isRefreshTokenError = (error: AuthError | Error | null): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  if (name === 'aborterror' || message.includes('aborterror') || message.includes('signal is aborted')) {
    return false;
  }
  
  return message.includes('refresh token') || 
         message.includes('invalid token') ||
         message.includes('token not found') ||
         message.includes('session expired') ||
         message.includes('not found');
};

// Check if error is a transient network error that shouldn't clear the session
const isTransientError = (error: AuthError | Error | null): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  return name === 'aborterror' || 
         message.includes('aborterror') || 
         message.includes('signal is aborted') ||
         message.includes('network') ||
         message.includes('fetch') ||
         message.includes('timeout') ||
         message.includes('failed to fetch');
};

type UserRole = 'admin' | 'hr' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const userDataCache = new Map<string, { data: AuthUser; timestamp: number }>();
const USER_CACHE_TTL = 60000; // 1 minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);
  const loadingUserRef = useRef<string | null>(null);
  const visibilityCheckRef = useRef(false);
  const lastVisibilityCheckRef = useRef(0);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);

  const loadUserData = useCallback(async (authUser: User): Promise<AuthUser | null> => {
    const cached = userDataCache.get(authUser.id);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
      return cached.data;
    }

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
        const userData: AuthUser = {
          id: authUser.id,
          email: authUser.email || '',
          role: role || 'staff',
          employeeId: null,
          is_active: false,
        };
        return userData;
      }

      // Only force sign out for BANNED users.
      // Deactivated (is_active === false) users are allowed to stay authenticated
      // so they can see the "Account Deactivated" screen inside the app.
      if (data?.banned_at !== null && data?.banned_at !== undefined) {
        console.log('User is banned, forcing sign out');
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
      recordAuthSuccess();
      
      return userData;
    } catch (error) {
      // If the user is banned, propagate so the caller can handle it
      if ((error as Error).message === 'Your account has been banned') {
        throw error;
      }
      const userData: AuthUser = {
        id: authUser.id,
        email: authUser.email || '',
        role: 'staff',
        employeeId: null,
        is_active: false,
      };
      return userData;
    } finally {
      loadingUserRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    let mounted = true;
    const initTimeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 8000);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        const userData = await loadUserData(session.user);
        if (mounted && userData) {
          setUser(userData);
        }
      } catch (error) {
        if ((error as Error).message === 'Your account has been deactivated') {
          if (mounted) setUser(null);
        } else if (isRefreshTokenError(error as Error)) {
          await clearAuthState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        clearTimeout(initTimeout);
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        userDataCache.clear();
        clearAllCache();
        if (mounted) {
          setUser(null);
        }
        return;
      }
      
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        try {
          const userData = await loadUserData(session.user);
          if (mounted && userData) {
            setUser(userData);
          }
        } catch (err) {
          if ((err as Error).message === 'Your account has been deactivated') {
            if (mounted) setUser(null);
          }
        }
      }
    });

    const handleVisibilityChange = async () => {
      // Skip if not visible, not mounted, or check already in progress
      if (document.visibilityState !== 'visible' || !mounted) return;
      
      // Debounce: skip if checked within last 2 seconds
      const now = Date.now();
      if (now - lastVisibilityCheckRef.current < 2000) return;
      
      // Skip if another check is in progress
      if (visibilityCheckRef.current) return;
      
      visibilityCheckRef.current = true;
      lastVisibilityCheckRef.current = now;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If we have a valid session, just check if refresh is needed
        if (session && !error) {
          const expiresAt = session.expires_at || 0;
          const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
          
          // Only refresh if token is about to expire (within 2 minutes)
          if (expiresIn < 120 && expiresIn > 0) {
            try {
              await supabase.auth.refreshSession();
            } catch {
              // Ignore refresh errors as long as we still have a valid session
            }
          }
          return;
        }
        
        // If error is transient (network), don't clear the session
        if (isTransientError(error)) {
          return;
        }
        
        // No session - try to refresh once
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        // If refresh failed with a transient error, keep the user logged in
        if (isTransientError(refreshError)) {
          return;
        }
        
        // If refresh succeeded, we're good
        if (refreshData?.session) {
          return;
        }
        
        // Only clear user if this is a confirmed auth failure (not a transient error)
        if (isRefreshTokenError(refreshError) && mounted) {
          userDataCache.clear();
          setUser(null);
        }
      } catch (err) {
        // Don't clear session on unexpected errors - they're likely transient
        if (isRefreshTokenError(err as Error) && mounted) {
          userDataCache.clear();
          setUser(null);
        }
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
  }, [loadUserData]);

  // Inactivity timeout - auto logout after 8 minutes
  useEffect(() => {
    if (!user || isLoggingOutRef.current) return;

    const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    const CHECK_INTERVAL = 30000; // Check every 30 seconds
    
    // Initialize last activity on mount
    updateLastActivity();

    const handleActivity = () => {
      if (!isLoggingOutRef.current) {
        updateLastActivity();
      }
    };

    const checkInactivity = async () => {
      if (isLoggingOutRef.current) return;
      
      const lastActivity = getLastActivity();
      const timeSinceActivity = Date.now() - lastActivity;
      const timeoutMs = getInactivityTimeoutMs();
      
      if (timeSinceActivity >= timeoutMs) {
        isLoggingOutRef.current = true;
        console.log('Session expired due to inactivity (8 minutes)');
        
        // Log activity before signing out
        if (user) {
          logActivity(user.id, 'session_timeout', 'user', user.id, {
            reason: 'inactivity',
            inactiveMinutes: Math.floor(timeSinceActivity / 60000)
          });
        }
        
        // Clear everything and sign out
        userDataCache.clear();
        clearAllCache();
        clearLastActivity();
        
        try {
          await supabase.auth.signOut();
        } catch {
          // Force clear user even if signOut fails
        }
        
        setUser(null);
        isLoggingOutRef.current = false;
      }
    };

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start periodic check
    inactivityTimerRef.current = setInterval(checkInactivity, CHECK_INTERVAL);
    
    // Also check immediately on visibility change (tab becomes visible)
    const handleVisibilityForInactivity = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityForInactivity);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityForInactivity);
    };
  }, [user]);

  // Real-time single-session enforcement + ban/deactivation safety net
  useEffect(() => {
    if (!user) return;

    const forceSignOut = async () => {
      userDataCache.clear();
      clearAllCache();
      localStorage.removeItem('ems_session_token');
      // Skip the network signOut call — the server-side session token was already
      // overwritten by the new login. Just wipe local auth state so nothing lingers
      // in memory or localStorage, then redirect to login.
      await clearAuthState();
      setUser(null);
    };

    const checkStatus = async () => {
      try {
        const { data, error } = await db
          .from('users')
          .select('is_active, banned_at, current_session_token')
          .eq('id', user.id)
          .single();

        if (error) return;

        if (data?.banned_at !== null && data?.banned_at !== undefined) {
          console.log('User was banned — forcing sign out');
          await forceSignOut();
          return;
        }

        if (data?.is_active === false) {
          setUser(prev => prev ? { ...prev, is_active: false } : prev);
        }

        const localToken = localStorage.getItem('ems_session_token');
        if (localToken && data?.current_session_token && data.current_session_token !== localToken) {
          console.log('Another session signed in — signing out this session');
          await forceSignOut();
        }
      } catch (err) {
        console.error('Error checking user status:', err);
      }
    };

    // ── Realtime subscription: fires immediately when the user row changes ──
    const channel = supabase
      .channel(`user-session:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { current_session_token?: string; banned_at?: string | null; is_active?: boolean };

          // Another session overwrote the token
          const localToken = localStorage.getItem('ems_session_token');
          if (localToken && updated.current_session_token && updated.current_session_token !== localToken) {
            console.log('Realtime: another session signed in — signing out');
            forceSignOut();
            return;
          }

          if (updated.banned_at) {
            console.log('Realtime: user was banned — signing out');
            forceSignOut();
            return;
          }

          if (updated.is_active === false) {
            setUser(prev => prev ? { ...prev, is_active: false } : prev);
          }
        }
      )
      .subscribe();

    // ── Fallback interval (1 min) in case realtime is unavailable ──
    const fallbackInterval = setInterval(checkStatus, 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [user?.id]);

  const resetSession = useCallback(async () => {
    setLoading(true);
    
    try {
      userDataCache.clear();
      clearAllCache();
      resetSessionHealth();
      await clearAuthState();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error && (error.message?.includes('AbortError') || error.name === 'AbortError')) {
        setUser(null);
        return;
      }
      
      if (session?.user) {
        const userData = await loadUserData(session.user);
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      if (error instanceof Error && (error.message?.includes('AbortError') || error.name === 'AbortError')) {
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    userDataCache.clear();
    clearAllCache();
    updateLastActivity();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Count this failure; throw a lockout signal once the threshold is reached
      if (recordAuthFailure()) {
        throw new Error('TOO_MANY_ATTEMPTS');
      }
      throw error;
    }

    if (data.user) {
      // Always claim the session with a new unique token via SECURITY DEFINER RPC.
      // If another device was already signed in, the realtime channel will detect
      // the token mismatch and force-sign it out automatically — no blocking needed.
      const sessionToken = crypto.randomUUID();
      localStorage.setItem('ems_session_token', sessionToken);
      await supabase.rpc('set_own_session_token', { p_token: sessionToken });

      logActivity(data.user.id, 'user_login', 'user', data.user.id, { email: data.user.email });
    }
  };

  const signOut = async () => {
    if (user) {
      logActivity(user.id, 'user_logout', 'user', user.id);
      // Clear the session token via SECURITY DEFINER RPC (bypasses RLS)
      await supabase.rpc('clear_own_session_token');
    }

    localStorage.removeItem('ems_session_token');
    userDataCache.clear();
    clearAllCache();
    resetSessionHealth();
    clearLastActivity();

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
