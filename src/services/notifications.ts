/**
 * Notifications Service - merged from multiple files
 * Combines database operations, configuration, and email notification logic
 */

import { supabase, db } from './supabase';
import type { Database } from '../types/database';
import { extractError, logError, type AppError } from '../lib/errorHandler';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface NotificationConfig {
  supabaseUrl: string;
  anonKey: string;
  emailFunctionName: string;
  emailFunctionVersion: string;
}

/**
 * Get notification configuration from environment
 * Validates that required env variables are present
 */
export function getNotificationConfig(): NotificationConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase environment variables for notifications');
  }

  return {
    supabaseUrl,
    anonKey,
    emailFunctionName: 'send-notification-email',
    emailFunctionVersion: 'v1',
  };
}

/**
 * Build notification endpoint URL from config
 * Abstraction for URL construction
 */
export function buildNotificationEndpoint(config: NotificationConfig, endpoint: string): string {
  return `${config.supabaseUrl}/functions/${config.emailFunctionVersion}/${endpoint}`;
}

/**
 * Notification types registry
 * Extensible structure for adding new notification types
 */
export const NOTIFICATION_TYPES = {
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  LEAVE_PENDING: 'leave_pending',
  WARNING_ISSUED: 'warning',
  TASK_ASSIGNED: 'task',
  COMPLAINT_FILED: 'complaint',
  PERFORMANCE_UPDATE: 'performance',
  GENERAL: 'general',
} as const;

export type NotificationEmailType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ─── Email Sending ────────────────────────────────────────────────────────────

interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
  type: NotificationEmailType;
}

export async function sendEmailNotification(data: EmailNotificationData): Promise<{ success: boolean; error?: AppError }> {
  try {
    const config = getNotificationConfig();
    const apiUrl = buildNotificationEndpoint(config, config.emailFunctionName);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: AppError = {
        message: `Email notification failed with status ${response.status}`,
        status: response.status,
        code: 'EMAIL_SEND_FAILED',
      };
      logError(error, 'sendEmailNotification');
      return { success: false, error };
    }

    await response.json();
    return { success: true };
  } catch (err) {
    const error = extractError(err);
    error.code = error.code || 'EMAIL_SEND_ERROR';
    logError(error, 'sendEmailNotification');
    return { success: false, error };
  }
}

// ─── Database Notifications ───────────────────────────────────────────────────

export type NotificationType = 'leave' | 'attendance' | 'system' | 'warning' | 'task' | 'complaint' | 'performance';

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

const EMAIL_TYPE_MAP: Record<NotificationType, NotificationEmailType> = {
  leave: NOTIFICATION_TYPES.LEAVE_PENDING,
  attendance: NOTIFICATION_TYPES.GENERAL,
  system: NOTIFICATION_TYPES.GENERAL,
  warning: NOTIFICATION_TYPES.WARNING_ISSUED,
  task: NOTIFICATION_TYPES.TASK_ASSIGNED,
  complaint: NOTIFICATION_TYPES.COMPLAINT_FILED,
  performance: NOTIFICATION_TYPES.PERFORMANCE_UPDATE,
};

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
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const { data: userData, error: userError } = await db
      .from('users')
      .select('employee_id')
      .eq('id', userId)
      .single();

    if (userError) {
      return { success: false };
    }

    if (!userData?.employee_id) {
      return { success: false };
    }

    const { data: employee, error: empError } = await db
      .from('employees')
      .select('email')
      .eq('id', userData.employee_id)
      .single();

    if (empError) {
      return { success: false };
    }

    if (!employee?.email) {
      return { success: false };
    }

    const sent = await sendEmailNotification({
      to: employee.email,
      subject: title,
      body: message,
      type: EMAIL_TYPE_MAP[type],
    });

    return sent;
  } catch (err) {
    return { success: false, error: err };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('notifications') as any).insert(record);

    if (!error) {
      notificationSaved = true;
    }

    if (sendEmail) {
      const emailResult = await sendNotificationEmail(userId, title, message, type);
      emailSent = emailResult.success;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: emailData, error: emailError } = await (supabase.rpc as any)('get_role_user_emails', emailRpcParams);

        if (!emailError && emailData) {
          // Map internal NotificationType to email types for consistency
          for (const row of emailData as unknown as { user_id: string; email: string }[]) {
            await sendEmailNotification({
              to: row.email,
              subject: title,
              body: message,
              type: EMAIL_TYPE_MAP[type],
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
  } catch (_err) {
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
  } catch (_err) {
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
  } catch (_err) {
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
  } catch (_err) {
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
  } catch (_err) {
  }
}

export interface NotificationSubscriptionCallbacks {
  onInsert: (notification: DbNotification) => void;
  onUpdate: (notification: DbNotification) => void;
  onDelete: (oldId: string) => void;
}

/**
 * Subscribes to real-time INSERT/UPDATE/DELETE events on the notifications table
 * for the given user. Returns an unsubscribe function.
 */
export function subscribeToUserNotifications(
  userId: string,
  callbacks: NotificationSubscriptionCallbacks,
): () => void {
  const channelName = `notifications-${userId}-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => callbacks.onInsert(payload.new as DbNotification),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => callbacks.onUpdate(payload.new as DbNotification),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => callbacks.onDelete((payload.old as { id: string }).id),
    )
    .subscribe();

  return () => {
    void channel.unsubscribe();
  };
}
