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
  onSyncStatusChange?: (isSyncing: boolean, error?: string) => void;
}

function enforceSessionState(
  row: SessionEnforcementState | null,
  onForceLogout: () => Promise<void>,
  onDeactivate: () => void,
) {
  if (!row) return;

  if (row.bannedAt !== null && row.bannedAt !== undefined) {
    console.error('[useSessionEnforcement] User account is banned');
    void onForceLogout();
    return;
  }

  if (row.isActive === false) {
    console.warn('[useSessionEnforcement] User account deactivated');
    onDeactivate();
  }

  const localToken = localStorage.getItem('ems_session_token');
  if (localToken && row.currentSessionToken && row.currentSessionToken !== localToken) {
    console.error('[useSessionEnforcement] Session token mismatch, forcing logout');
    void onForceLogout();
  }
}

export function useSessionEnforcement({ userId, onForceLogout, onDeactivate, onSyncStatusChange }: UseSessionEnforcementParams) {
  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      try {
        const row = await getSessionEnforcementState(userId);
        enforceSessionState(row, onForceLogout, onDeactivate);
      } catch (err) {
        const errorMsg = String(err).toLowerCase();
        if (errorMsg.includes('failed to fetch') || errorMsg.includes('network') || errorMsg.includes('timeout')) {
          console.debug('[useSessionEnforcement] Transient error during status check, will retry:', err);
        } else {
          console.error('[useSessionEnforcement] Error during status check:', err);
        }
      }
    };

    const handleSubscriptionError = (error: Error) => {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('transient') || errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.debug('[useSessionEnforcement] Subscription transient error, attempting to recover:', error.message);
        onSyncStatusChange?.(false, 'reconnecting');
      } else {
        console.warn('[useSessionEnforcement] Subscription error:', error.message);
        onSyncStatusChange?.(false, 'sync_error');
      }
    };

    const unsubscribe = subscribeToSessionEnforcement(
      userId,
      (row) => {
        enforceSessionState(row, onForceLogout, onDeactivate);
        onSyncStatusChange?.(true);
      },
      handleSubscriptionError
    );

    const fallbackInterval = setInterval(checkStatus, 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(fallbackInterval);
    };
  }, [userId, onForceLogout, onDeactivate, onSyncStatusChange]);
}
