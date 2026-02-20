import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase, db } from '../lib/supabase';
import { logActivity } from '../lib/activityLog';
import { 
  clearAuthState, 
  recordAuthSuccess, 
  resetSessionHealth 
} from '../lib/sessionManager';
import { clearAllCache } from '../lib/apiCache';

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

const userDataCache = new Map<string, { data: AuthUser; timestamp: number }>();
const USER_CACHE_TTL = 60000; // 1 minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);
  const loadingUserRef = useRef<string | null>(null);

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
        .select('role, employee_id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
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
        role: data?.role || role || 'staff',
        employeeId: data?.employee_id || null,
      };
      
      userDataCache.set(authUser.id, { data: userData, timestamp: Date.now() });
      recordAuthSuccess();
      
      return userData;
    } catch (error) {
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
        const userData = await loadUserData(session.user);
        if (mounted && userData) {
          setUser(userData);
        }
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !mounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!session || error) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            if (mounted) {
              userDataCache.clear();
              setUser(null);
            }
          }
          return;
        }

        const expiresAt = session.expires_at || 0;
        const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
        if (expiresIn < 120) {
          await supabase.auth.refreshSession();
        }
      } catch {
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
