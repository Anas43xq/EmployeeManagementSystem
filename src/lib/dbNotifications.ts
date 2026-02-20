import { supabase, db } from './supabase';
import type { Database } from './database.types';
import { sendEmailNotification } from './notifications';

export type NotificationType = 'leave' | 'attendance' | 'system' | 'warning' | 'task' | 'complaint' | 'performance';

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

async function sendNotificationEmail(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await db
      .from('users')
      .select('employee_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Email] Failed to look up user (possible RLS restriction):', userError.message);
      return false;
    }

    if (!userData?.employee_id) {
      console.warn('[Email] No employee_id found for user:', userId);
      return false;
    }

    const { data: employee, error: empError } = await db
      .from('employees')
      .select('email')
      .eq('id', userData.employee_id)
      .single();

    if (empError) {
      console.error('[Email] Failed to look up employee email:', empError.message);
      return false;
    }

    if (!employee?.email) {
      console.warn('[Email] No email found for employee:', userData.employee_id);
      return false;
    }

    const sent = await sendEmailNotification({
      to: employee.email,
      subject: title,
      body: message,
      type,
    });

    if (!sent) {
      console.error('[Email] sendEmailNotification returned false for:', employee.email);
    }
    return sent;
  } catch (err) {
    console.error('[Email] sendNotificationEmail error:', err);
    return false;
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<{ notificationSaved: boolean; emailSent: boolean }> {
  let notificationSaved = false;
  let emailSent = false;

  try {
    const record: NotificationInsert = {
      user_id: userId,
      title,
      message,
      type,
    };
    const { error } = await (supabase
      .from('notifications') as any).insert(record);

    if (error) {
      console.error('[Notification] Insert error:', error);
    } else {
      notificationSaved = true;
    }

    emailSent = await sendNotificationEmail(userId, title, message, type);
  } catch (err) {
    console.error('[Notification] createNotification error:', err);
  }

  return { notificationSaved, emailSent };
}

export async function createNotifications(
  notifications: Array<{
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
  }>
): Promise<void> {
  try {
    const records: NotificationInsert[] = notifications.map((n) => ({
      user_id: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
    }));

    const { error } = await (supabase
      .from('notifications') as any).insert(records);

    if (error) {
      console.error('[Notification] Bulk insert error:', error);
    }

    for (const n of notifications) {
      const sent = await sendNotificationEmail(n.userId, n.title, n.message, n.type);
      if (!sent) {
        console.warn('[Notification] Email failed for user:', n.userId);
      }
    }
  } catch (err) {
    console.error('[Notification] createNotifications error:', err);
  }
}

export async function notifyHRAndAdmins(
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    const { data: users, error: fetchError } = await db
      .from('users')
      .select('id')
      .in('role', ['admin', 'hr']);

    if (fetchError) {
      return;
    }

    if (!users || users.length === 0) return;

    const notifications = (users as { id: string }[]).map((user) => ({
      userId: user.id,
      title,
      message,
      type,
    }));

    await createNotifications(notifications);
  } catch (err) {
  }
}

export async function fetchUnreadNotifications(
  userId: string
): Promise<DbNotification[]> {
  try {
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []) as DbNotification[];
  } catch (err) {
    return [];
  }
}

export async function fetchNotifications(
  userId: string,
  limit: number = 50
): Promise<DbNotification[]> {
  try {
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data || []) as DbNotification[];
  } catch (err) {
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const update: NotificationUpdate = { is_read: true };
    const { error } = await db
      .from('notifications')
      .update(update)
      .eq('id', notificationId);

    if (error) {
    }
  } catch (err) {
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const update: NotificationUpdate = { is_read: true };
    const { error } = await db
      .from('notifications')
      .update(update)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
    }
  } catch (err) {
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await db
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
    }
  } catch (err) {
  }
}
