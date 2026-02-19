import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLog';
import { 
  validateAndRecoverSession, 
  clearAuthState, 
  recordAuthSuccess, 
  resetSessionHealth 
} from '../lib/sessionManager';
import { clearAllCache } from '../lib/apiCache';

const isRefreshTokenError = (error: AuthError | Error | null): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return message.includes('refresh token') || 
         message.includes('invalid token') ||
         message.includes('token not found') ||
         message.includes('session expired') ||
         message.includes('not found');
};

type UserRole = 'admin' | 'hr' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache user data to prevent redundant database calls
const userDataCache = new Map<string, { data: AuthUser; timestamp: number }>();
const USER_CACHE_TTL = 60000; // 1 minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);
  const loadingUserRef = useRef<string | null>(null);

  // Memoized loadUserData to prevent race conditions
  const loadUserData = useCallback(async (authUser: User): Promise<AuthUser | null> => {
    // Prevent concurrent loads for the same user
    if (loadingUserRef.current === authUser.id) {
      console.log('[Auth] Already loading user data, skipping...');
      return null;
    }
    
    // Check cache first
    const cached = userDataCache.get(authUser.id);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
      console.log('[Auth] Using cached user data');
      return cached.data;
    }
    
    loadingUserRef.current = authUser.id;
    
    try {
      // First try to get role from JWT metadata (fastest)
      const role = (authUser.app_metadata?.role || authUser.user_metadata?.role) as UserRole | undefined;
      
      // Fetch employee_id from database
      const { data, error } = await supabase
        .from('users')
        .select('role, employee_id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error loading user data:', error);
        // Fall back to JWT role or default
        const userData: AuthUser = {
          id: authUser.id,
          email: authUser.email || '',
          role: role || 'staff',
          employeeId: null,
        };
        return userData;
      }

      const userData: AuthUser = {
        id: authUser.id,
        email: authUser.email || '',
        role: (data?.role as UserRole) || role || 'staff',
        employeeId: data?.employee_id || null,
      };
      
      // Update cache
      userDataCache.set(authUser.id, { data: userData, timestamp: Date.now() });
      recordAuthSuccess();
      
      return userData;
    } catch (error) {
      console.error('[Auth] Unexpected error in loadUserData:', error);
      const userData: AuthUser = {
        id: authUser.id,
        email: authUser.email || '',
        role: 'staff',
        employeeId: null,
      };
      return userData;
    } finally {
      loadingUserRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;
    
    let mounted = true;
    const initTimeout = setTimeout(() => {
      // Safety timeout - if still loading after 10s, force complete
      if (mounted && loading) {
        console.warn('[Auth] Initialization timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);

    const initAuth = async () => {
      try {
        // Validate session first using session manager
        const isValid = await validateAndRecoverSession();
        
        if (!isValid) {
          console.log('[Auth] No valid session found');
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Get the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          console.log('[Auth] Session error or no user:', error?.message);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Load user data
        const userData = await loadUserData(session.user);
        if (mounted && userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
        if (isRefreshTokenError(error as Error)) {
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event);
      
      if (event === 'SIGNED_OUT') {
        userDataCache.clear();
        clearAllCache();
        if (mounted) {
          setUser(null);
        }
        return;
      }
      
      if (event === 'TOKEN_REFRESHED') {
        // Token refreshed, no need to reload user data
        console.log('[Auth] Token refreshed successfully');
        return;
      }
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const userData = await loadUserData(session.user);
        if (mounted && userData) {
          setUser(userData);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const resetSession = useCallback(async () => {
    console.log('[Auth] Manual session reset requested');
    setLoading(true);
    
    try {
      // Clear all caches
      userDataCache.clear();
      clearAllCache();
      resetSessionHealth();
      await clearAuthState();
      
      // Try to get fresh session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userData = await loadUserData(session.user);
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Reset error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    // Clear any stale state before signing in
    userDataCache.clear();
    clearAllCache();
    resetSessionHealth();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      logActivity(data.user.id, 'user_login', 'user', data.user.id, {
        email: data.user.email,
      });
    }
  };

  const signOut = async () => {
    if (user) {
      logActivity(user.id, 'user_logout', 'user', user.id);
    }

    // Clear caches before signing out
    userDataCache.clear();
    clearAllCache();
    resetSessionHealth();
    
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
