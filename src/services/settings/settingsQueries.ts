import { db } from '../supabase';
import type { Database } from '../../types/database';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

export interface NotificationPreferenceState {
  leave_approvals: boolean;
  attendance_reminders: boolean;
  warnings: boolean;
  tasks: boolean;
  complaints: boolean;
}

export async function getUserNotificationPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await db
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as UserPreferences | null;
}

export async function saveUserNotificationPreferences(
  userId: string,
  preferences: NotificationPreferenceState,
): Promise<void> {
  const { error } = await db
    .from('user_preferences')
    .upsert({
      user_id: userId,
      email_leave_approvals: preferences.leave_approvals,
      email_attendance_reminders: preferences.attendance_reminders,
      email_warnings: preferences.warnings,
      email_tasks: preferences.tasks,
      email_complaints: preferences.complaints,
    });

  if (error) throw error;
}

export async function requestUserEmailUpdate(newEmail: string, emailRedirectTo: string): Promise<void> {
  const { error } = await db.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo }
  );

  if (error) throw error;
}