import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logActivity, type ActivityAction, type EntityType } from '../lib/activityLog';

export default function useActivityLogger() {
  const { user } = useAuth();

  const log = useCallback(
    (action: ActivityAction, entityType: EntityType, entityId?: string | null, details?: Record<string, unknown>) => {
      if (user?.id) {
        logActivity(user.id, action, entityType, entityId, details);
      }
    },
    [user?.id]
  );

  return log;
}
