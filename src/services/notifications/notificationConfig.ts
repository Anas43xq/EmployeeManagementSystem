/**
 * Notification service configuration
 * Priority 2: SOLID - Open/Closed (configuration instead of hardcoded strings)
 * 
 * Centralizes notification endpoints and settings
 * Allows easy extension without modifying service code
 */

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
