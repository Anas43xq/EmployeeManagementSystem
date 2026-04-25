

import { supabase } from './supabase';
import { logError, extractError } from '../lib/errorHandler';


function isFunctionNotFoundError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('could not find the function') || msg.includes('function is not found');
  }
  return false;
}

export type ActivityAction =
  | 'user_password_reset'
  | 'user_access_granted'
  | 'user_access_revoked'
  | 'user_role_changed'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_deactivated'
  | 'user_activated'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_deleted'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  | 'department_created'
  | 'department_updated'
  | 'department_deleted'
  | 'attendance_checked_in'
  | 'attendance_checked_out'
  | 'attendance_manual_entry'
  | 'announcement_created'
  | 'announcement_updated'
  | 'announcement_deleted'
  | 'announcement_toggled'
  | 'user_login'
  | 'user_logout'
  | 'user_login_failed'
  | 'session_timeout'
  | 'warning_created'
  | 'warning_acknowledged'
  | 'warning_resolved'
  | 'warning_deleted'
  | 'complaint_created'
  | 'complaint_reviewed'
  | 'complaint_resolved'
  | 'complaint_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_deleted'
  | 'payroll_generated'
  | 'payroll_approved'
  | 'payroll_paid';

export type EntityType =
  | 'user'
  | 'employee'
  | 'leave'
  | 'department'
  | 'attendance'
  | 'announcement'
  | 'login_attempt'
  | 'warning'
  | 'complaint'
  | 'task'
  | 'payroll';

export interface ActivityLogRecord {
  id: string;
  action: string;
  created_at: string;
}

function mapActivityLogRecord(record: {
  id: string;
  action: string;
  created_at: string | null;
}): ActivityLogRecord {
  return {
    id: record.id,
    action: record.action,
    created_at: record.created_at ?? ''
  };
}

/**
 * Log single activity - internal DI version
 * @param userId - User performing the action
 * @param action - Action type
 * @param entityType - Type of entity affected
 * @param entityId - ID of affected entity
 * @param details - Additional context
 */
async function logActivityInternal(
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('log_activity', {
      p_user_id: userId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_details: details ? JSON.stringify(details) : null,
    });

    if (error) {
      
      if (isFunctionNotFoundError(error)) {
        return;
      }
      logError({
        message: error.message || 'logActivity error',
        details: typeof error.details === 'string' ? { raw: error.details } : (error.details as Record<string, unknown>),
      }, 'logActivity');
    }
  } catch (err) {
    
    if (isFunctionNotFoundError(err)) {
      return;
    }
    logError(extractError(err), 'logActivity');
  }
}


export async function logActivity(
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  return logActivityInternal(userId, action, entityType, entityId, details);
}

export async function getRecentActivityLogs(limit = 200): Promise<ActivityLogRecord[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapActivityLogRecord);
}

/**
 * Log multiple activities in batch - internal DI version
 * @param activities - Array of activity records
 */
async function logActivitiesInternal(
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = supabase.rpc as any;
    await Promise.all(
      activities.map((a) =>
        rpc('log_activity', {
          p_user_id: a.userId,
          p_action: a.action,
          p_entity_type: a.entityType,
          p_entity_id: a.entityId || null,
          p_details: a.details ? JSON.stringify(a.details) : null,
        }),
      ),
    );
  } catch (err) {
    
    if (isFunctionNotFoundError(err)) {
      return;
    }
    logError(extractError(err), 'logActivities');
  }
}


export async function logActivities(
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>,
): Promise<void> {
  return logActivitiesInternal(activities);
}


export async function logActivityWithDI(
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  return logActivityInternal(userId, action, entityType, entityId, details);
}

export async function logActivitiesWithDI(
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>,
): Promise<void> {
  return logActivitiesInternal(activities);
}

