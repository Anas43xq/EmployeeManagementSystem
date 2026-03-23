/**
 * Activity logging service
 * Priority 1: SOLID - Dependency Inversion (accepts dbClient parameter)
 * Priority 4: SOLID - Centralized error handling (no silent swallows)
 */

import type { Database } from '../../types/database';
import type { DatabaseClient } from '../../types/interfaces';
import { supabase } from '../supabase';
import { dbClient } from '../shared/dbClient';
import { logError, extractError } from '../errorHandler';

type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

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

/**
 * Log single activity - internal DI version
 * @param dbClient - Database client (injected for testability)
 * @param userId - User performing the action
 * @param action - Action type
 * @param entityType - Type of entity affected
 * @param entityId - ID of affected entity
 * @param details - Additional context
 */
async function logActivityInternal(
  dbClient: DatabaseClient,
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const record: ActivityLogInsert = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details as any,
    };

    const { error } = await dbClient.insert({
      table: 'activity_logs',
      data: record,
    });

    if (error) {
      logError(error, 'logActivity');
    }
  } catch (err) {
    logError(extractError(err), 'logActivity');
  }
}

/**
 * Log single activity - PUBLIC API (backward compatible)
 * Uses global dbClient instance
 */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  return logActivityInternal(dbClient, userId, action, entityType, entityId, details);
}

/**
 * Log multiple activities in batch - internal DI version
 * @param dbClient - Database client (injected for testability)
 * @param activities - Array of activity records
 */
async function logActivitiesInternal(
  dbClient: DatabaseClient,
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>,
): Promise<void> {
  try {
    const records: ActivityLogInsert[] = activities.map((a) => ({
      user_id: a.userId,
      action: a.action,
      entity_type: a.entityType,
      entity_id: a.entityId || null,
      details: a.details as any,
    }));

    const { error } = await dbClient.insert({
      table: 'activity_logs',
      data: records,
    });

    if (error) {
      logError(error, 'logActivities');
    }
  } catch (err) {
    logError(extractError(err), 'logActivities');
  }
}

/**
 * Log multiple activities in batch - PUBLIC API (backward compatible)
 * Uses global dbClient instance
 */
export async function logActivities(
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>,
): Promise<void> {
  return logActivitiesInternal(dbClient, activities);
}

/**
 * DI versions for testing/advanced usage
 * Allow injecting custom dbClient
 */
export async function logActivityWithDI(
  dbClient: DatabaseClient,
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  return logActivityInternal(dbClient, userId, action, entityType, entityId, details);
}

export async function logActivitiesWithDI(
  dbClient: DatabaseClient,
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>,
): Promise<void> {
  return logActivitiesInternal(dbClient, activities);
}
