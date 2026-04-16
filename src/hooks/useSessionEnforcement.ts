import { useEffect } from 'react';
import {
  getSessionEnforcementState,
  subscribeToSessionEnforcement,
  type SessionEnforcementState,
} from '../services/session';

interface UseSessionEnforcementParams {
  userId: string | undefined;
  onForceLogout: () => Promise<void>;
  onDeactivate: () => void;
}

function enforceSessionState(
  row: SessionEnforcementState | null,
  onForceLogout: () => Promise<void>,
  onDeactivate: () => void,
) {
  if (!row) return;

  if (row.bannedAt !== null && row.bannedAt !== undefined) {
    void onForceLogout();
    return;
  }

  if (row.isActive === false) {
    onDeactivate();
  }

  const localToken = localStorage.getItem('ems_session_token');
  if (localToken && row.currentSessionToken && row.currentSessionToken !== localToken) {
    void onForceLogout();
  }
}

export function useSessionEnforcement({ userId, onForceLogout, onDeactivate }: UseSessionEnforcementParams) {
  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      try {
        const row = await getSessionEnforcementState(userId);
        enforceSessionState(row, onForceLogout, onDeactivate);
      } catch (err) {
        // ignore transient network errors in the fallback poll
        console.debug('[useSessionEnforcement] checkStatus failed:', err);
      }
    };

    // Realtime: kick this session the instant another device logs in or the user is banned.
    const unsubscribe = subscribeToSessionEnforcement(userId, (row) => {
      enforceSessionState(row, onForceLogout, onDeactivate);
    });

    // Fallback poll (1 min) in case the realtime channel is unavailable.
    const fallbackInterval = setInterval(checkStatus, 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(fallbackInterval);
    };
  }, [userId, onForceLogout, onDeactivate]);
}
