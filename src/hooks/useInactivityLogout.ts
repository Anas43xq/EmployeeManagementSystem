import { useEffect, useRef } from 'react';
import { logActivity } from '../services/activityLog';
import {
  updateLastActivity,
  getLastActivity,
  getInactivityTimeoutMs,
  clearLastActivity,
  signOutCurrentSession,
} from '../services/session';
import type { AuthUser } from '../services/auth';

export function useInactivityLogout(user: AuthUser | null, onLogout: () => void) {
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    if (!user || isLoggingOutRef.current) return;

    const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    const CHECK_INTERVAL = 30000;

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

        logActivity(user.id, 'session_timeout', 'user', user.id, {
          reason: 'inactivity',
          inactiveMinutes: Math.floor(timeSinceActivity / 60000),
        });

        clearLastActivity();

        try {
          await signOutCurrentSession();
        } catch (err) {
          // ensure user is cleared even if the network call fails
          console.error('[useInactivityLogout] signOutCurrentSession failed:', err);
        }

        onLogout();
        isLoggingOutRef.current = false;
      }
    };

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const timer = setInterval(checkInactivity, CHECK_INTERVAL);

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
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityForInactivity);
    };
  }, [user, onLogout]);
}
