import { supabase } from './supabase';
import type { Database } from '../types/database';

type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

export type ActivityAction =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_employee_linked'
  | 'user_employee_unlinked'
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
  | 'leave_cancelled'
  | 'department_created'
  | 'department_updated'
  | 'department_deleted'
  | 'attendance_checked_in'
  | 'attendance_checked_out'
  | 'attendance_recorded'
  | 'announcement_created'
  | 'announcement_updated'
  | 'announcement_deleted'
  | 'announcement_toggled'
  | 'user_login'
  | 'user_logout';

export type EntityType =
  | 'user'
  | 'employee'
  | 'leave'
  | 'department'
  | 'attendance'
  | 'announcement';

export async function logActivity(
  userId: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown>
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
    const { error } = await (supabase
      .from('activity_logs') as any).insert(record);

    if (error) {
    }
  } catch (err) {
  }
}

export async function logActivities(
  activities: Array<{
    userId: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }>
): Promise<void> {
  try {
    const records: ActivityLogInsert[] = activities.map((a) => ({
      user_id: a.userId,
      action: a.action,
      entity_type: a.entityType,
      entity_id: a.entityId || null,
      details: a.details as any,
    }));

    const { error } = await (supabase
      .from('activity_logs') as any).insert(records);

    if (error) {
    }
  } catch (err) {
  }
}
