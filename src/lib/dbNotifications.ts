import { supabase } from './supabase';
import type { Database } from './database.types';

export type NotificationType = 'leave' | 'attendance' | 'system';

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

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
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
      console.error('Failed to create notification:', error);
    }
  } catch (err) {
    console.error('Error creating notification:', err);
  }
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
      console.error('Failed to create notifications:', error);
    }
  } catch (err) {
    console.error('Error creating notifications:', err);
  }
}

export async function notifyHRAndAdmins(
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'hr']);

    if (fetchError) {
      console.error('Failed to fetch HR/Admin users:', fetchError);
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
    console.error('Error notifying HR/Admins:', err);
  }
}

export async function fetchUnreadNotifications(
  userId: string
): Promise<DbNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return (data || []) as DbNotification[];
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

export async function fetchNotifications(
  userId: string,
  limit: number = 50
): Promise<DbNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return (data || []) as DbNotification[];
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const update: NotificationUpdate = { is_read: true };
    const { error } = await (supabase
      .from('notifications') as any)
      .update(update)
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    }
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const update: NotificationUpdate = { is_read: true };
    const { error } = await (supabase
      .from('notifications') as any)
      .update(update)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to delete notification:', error);
    }
  } catch (err) {
    console.error('Error deleting notification:', err);
  }
}
