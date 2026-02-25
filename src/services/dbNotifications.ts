import { supabase, db } from './supabase';
import type { Database } from '../types/database';
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
      return false;
    }

    if (!userData?.employee_id) {
      return false;
    }

    const { data: employee, error: empError } = await db
      .from('employees')
      .select('email')
      .eq('id', userData.employee_id)
      .single();

    if (empError) {
      return false;
    }

    if (!employee?.email) {
      return false;
    }

    const sent = await sendEmailNotification({
      to: employee.email,
      subject: title,
      body: message,
      type,
    });

    return sent;
  } catch {
    return false;
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  sendEmail: boolean = false
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

    if (!error) {
      notificationSaved = true;
    }

    if (sendEmail) {
      emailSent = await sendNotificationEmail(userId, title, message, type);
    }
  } catch {
    // ignore
  }

  return { notificationSaved, emailSent };
}

export async function createNotifications(
  notifications: Array<{
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    sendEmail?: boolean;
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

    if (!error) {
      for (const n of notifications) {
        if (n.sendEmail) {
          await sendNotificationEmail(n.userId, n.title, n.message, n.type);
        }
      }
    }
  } catch {
    // ignore
  }
}

export async function notifyHRAndAdmins(
  title: string,
  message: string,
  type: NotificationType,
  sendEmail: boolean = true,
  excludeUserId?: string
): Promise<void> {
  try {
    const rpcParams: Record<string, unknown> = {
      p_title: title,
      p_message: message,
      p_type: type,
      p_roles: ['admin', 'hr'],
    };
    if (excludeUserId) {
      rpcParams.p_exclude_user_id = excludeUserId;
    }

    const { error: rpcError } = await (supabase.rpc as any)('notify_role_users', rpcParams);

    if (rpcError) return;

    if (sendEmail) {
      try {
        const emailRpcParams: Record<string, unknown> = {
          p_roles: ['admin', 'hr'],
        };
        if (excludeUserId) {
          emailRpcParams.p_exclude_user_id = excludeUserId;
        }

        const { data: emailData, error: emailError } = await (supabase.rpc as any)('get_role_user_emails', emailRpcParams);

        if (!emailError && emailData) {
          for (const row of emailData as unknown as { user_id: string; email: string }[]) {
            await sendEmailNotification({
              to: row.email,
              subject: title,
              body: message,
              type,
            });
          }
        }
      } catch {
        // Email sending is best-effort — don't block on failure
      }
    }
  } catch {
    // ignore
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
