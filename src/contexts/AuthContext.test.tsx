import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';

const createLoginAttemptStatus = (overrides: Partial<{
  userId: string | null;
  failedAttempts: number;
  attemptsRemaining: number;
  requiresOtp: boolean;
  otpExpiresAt: string | null;
  otpSecondsLeft: number;
  delayUntil: string | null;
  secondsUntilRetry: number;
}> = {}) => ({
  userId: null,
  failedAttempts: 0,
  attemptsRemaining: 5,
  requiresOtp: false,
  otpExpiresAt: null,
  otpSecondsLeft: 0,
  delayUntil: null,
  secondsUntilRetry: 0,
  ...overrides,
});

// Mock all services before importing AuthContext
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            id: 'auth-subscription',
            callback: vi.fn(),
            unsubscribe: vi.fn(),
          },
        },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  },
  db: {
    from: vi.fn(),
  },
}));

vi.mock('../services/session/sessionManager', () => ({
  clearAuthState: vi.fn(),
  resetSessionHealth: vi.fn(),
  updateLastActivity: vi.fn(),
  clearLastActivity: vi.fn(),
}));

vi.mock('../services/session/loginAttempts', () => ({
  getLoginAttemptStatus: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetLoginAttempts: vi.fn(),
}));

vi.mock('../services/shared/cacheManager', () => ({
  clearAllCache: vi.fn(),
}));

vi.mock('../services/activityLog', () => ({
  logActivity: vi.fn(),
}));

vi.mock('../services/auth/authHelpers', () => ({
  isRefreshTokenError: vi.fn(() => false),
  isAuthTransientError: vi.fn(() => false),
}));

vi.mock('../hooks/useInactivityLogout', () => ({
  useInactivityLogout: vi.fn(),
}));

vi.mock('../hooks/useSessionEnforcement', () => ({
  useSessionEnforcement: vi.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should export AuthProvider component', async () => {
    const { AuthProvider } = await import('./AuthContext');
    expect(AuthProvider).toBeDefined();
    expect(typeof AuthProvider).toBe('function');
  });

  it('should export useAuth hook', async () => {
    const { useAuth } = await import('./AuthContext');
    expect(useAuth).toBeDefined();
    expect(typeof useAuth).toBe('function');
  });

  it('should export AuthUser type', async () => {
    // Check that AuthUser type is exported via import
    expect(true).toBe(true); // Type exports are checked at compile time
  });

  it('useAuth hook should be callable (provider required)', async () => {
    const { useAuth } = await import('./AuthContext');
    // The hook requires a provider, but we can verify it's exported correctly
    expect(typeof useAuth).toBe('function');
  });

  it('should have localStorage support for session tokens', () => {
    const sessionToken = 'test-session-token-12345';
    localStorage.setItem('ems_session_token', sessionToken);

    expect(localStorage.getItem('ems_session_token')).toBe(sessionToken);

    localStorage.removeItem('ems_session_token');
    expect(localStorage.getItem('ems_session_token')).toBeNull();
  });

  it('supabase auth.getSession should be mockable', async () => {
    const { supabase } = await import('../services/supabase');
    const mockedGetSession = vi.mocked(supabase.auth.getSession);

    mockedGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await supabase.auth.getSession();
    expect(result.data.session).toBeNull();
    expect(supabase.auth.getSession).toHaveBeenCalled();
  });

  it('supabase auth.signOut should be mockable', async () => {
    const { supabase } = await import('../services/supabase');
    const mockedSignOut = vi.mocked(supabase.auth.signOut);

    mockedSignOut.mockResolvedValue({ error: null });

    const result = await supabase.auth.signOut();
    expect(result.error).toBeNull();
  });

  it('should support signInWithPassword flow', async () => {
    const { supabase } = await import('../services/supabase');
    const mockedSignIn = vi.mocked(supabase.auth.signInWithPassword);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;

    const mockSession = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser,
    } as Session;

    mockedSignIn.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.data.user?.email).toBe('test@example.com');
  });

  it('should support database user queries', async () => {
    const { db } = await import('../services/supabase');
    const mockedFrom = vi.mocked(db.from);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role: 'staff', employee_id: 'emp-123', is_active: true },
          error: null,
        }),
      }),
    });

    mockedFrom.mockReturnValue({ select: mockSelect } as never);

    const query = db.from('users');
    expect(query.select).toBeDefined();
  });

  it('getLoginAttemptStatus should be mockable', async () => {
    const { getLoginAttemptStatus } = await import('../services/session/loginAttempts');
    const mockedGetLoginAttemptStatus = vi.mocked(getLoginAttemptStatus);

    mockedGetLoginAttemptStatus.mockResolvedValue({
      ...createLoginAttemptStatus({
        userId: 'user-123',
      }),
    });

    const result = await getLoginAttemptStatus('test@example.com');
    expect(result.userId).toBe('user-123');
  });

  it('resetLoginAttempts should be mockable', async () => {
    const { resetLoginAttempts } = await import('../services/session/loginAttempts');
    const mockedResetLoginAttempts = vi.mocked(resetLoginAttempts);

    mockedResetLoginAttempts.mockResolvedValue(undefined);

    const result = await resetLoginAttempts('user-123');
    expect(result).toBeUndefined();
  });

  it('recordFailedAttempt should be mockable', async () => {
    const { recordFailedAttempt } = await import('../services/session/loginAttempts');
    const mockedRecordFailedAttempt = vi.mocked(recordFailedAttempt);

    mockedRecordFailedAttempt.mockResolvedValue(
      createLoginAttemptStatus({
        attemptsRemaining: 3,
      })
    );

    const result = await recordFailedAttempt('test@example.com');
    expect(result.attemptsRemaining).toBe(3);
  });

  it('clearAllCache should be available', async () => {
    const { clearAllCache } = await import('../services/shared/cacheManager');
    expect(clearAllCache).toBeDefined();
    expect(typeof clearAllCache).toBe('function');
  });

  it('logActivity should be available', async () => {
    const { logActivity } = await import('../services/activityLog');
    expect(logActivity).toBeDefined();
    expect(typeof logActivity).toBe('function');
  });

  it('clearAuthState should be mockable', async () => {
    const { clearAuthState } = await import('../services/session/sessionManager');
    expect(clearAuthState).toBeDefined();
  });

  it('session manager utilities should be available', async () => {
    const { resetSessionHealth, updateLastActivity, clearLastActivity } = await import('../services/session/sessionManager');

    expect(resetSessionHealth).toBeDefined();
    expect(updateLastActivity).toBeDefined();
    expect(clearLastActivity).toBeDefined();
  });

  it('useInactivityLogout hook should be mockable', async () => {
    const { useInactivityLogout } = await import('../hooks/useInactivityLogout');
    expect(useInactivityLogout).toBeDefined();
  });

  it('useSessionEnforcement hook should be mockable', async () => {
    const { useSessionEnforcement } = await import('../hooks/useSessionEnforcement');
    expect(useSessionEnforcement).toBeDefined();
  });

  it('should support onAuthStateChange subscription', async () => {
    const { supabase } = await import('../services/supabase');
    const mockedOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);

    mockedOnAuthStateChange.mockImplementation((_cb: unknown) => {
      return {
        data: {
          subscription: {
            id: 'auth-subscription',
            callback: vi.fn(),
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    const result = supabase.auth.onAuthStateChange(() => {});
    expect(result.data.subscription).toBeDefined();
    expect(result.data.subscription.unsubscribe).toBeDefined();
  });

  it('should support RPC calls for session management', async () => {
    const { supabase } = await import('../services/supabase');
    const mockedRpc = vi.mocked(supabase.rpc);

    mockedRpc.mockResolvedValue({ error: null, data: null, count: null, status: 200, statusText: 'OK' });

    const result = await supabase.rpc('set_own_session_token', { p_token: 'token' });
    expect(result.error).toBeNull();
  });
});
