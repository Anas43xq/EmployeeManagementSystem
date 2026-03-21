import { useEffect } from 'react';
import { supabase, db } from '../services/supabase';

interface UseSessionEnforcementParams {
  userId: string | undefined;
  onForceLogout: () => Promise<void>;
  onDeactivate: () => void;
}

export function useSessionEnforcement({ userId, onForceLogout, onDeactivate }: UseSessionEnforcementParams) {
  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await db
          .from('users')
          .select('is_active, banned_at, current_session_token')
          .eq('id', userId)
          .single();

        if (error) return;

        if (data?.banned_at !== null && data?.banned_at !== undefined) {
          await onForceLogout();
          return;
        }

        if (data?.is_active === false) {
          onDeactivate();
        }

        const localToken = localStorage.getItem('ems_session_token');
        if (localToken && data?.current_session_token && data.current_session_token !== localToken) {
          await onForceLogout();
        }
      } catch {
        // ignore transient network errors in the fallback poll
      }
    };

    // Realtime: kick this session the instant another device logs in or the user is banned.
    const channel = supabase
      .channel(`user-session:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as {
            current_session_token?: string;
            banned_at?: string | null;
            is_active?: boolean;
          };
          const localToken = localStorage.getItem('ems_session_token');

          if (localToken && updated.current_session_token && updated.current_session_token !== localToken) {
            onForceLogout();
            return;
          }

          if (updated.banned_at) {
            onForceLogout();
            return;
          }

          if (updated.is_active === false) {
            onDeactivate();
          }
        }
      )
      .subscribe();

    // Fallback poll (1 min) in case the realtime channel is unavailable.
    const fallbackInterval = setInterval(checkStatus, 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [userId, onForceLogout, onDeactivate]);
}
