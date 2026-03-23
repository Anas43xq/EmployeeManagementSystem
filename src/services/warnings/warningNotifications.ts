import { createNotification } from '../notifications/dbNotifications';

export async function createWarningNotification(userId: string, severity: string) {
  return await createNotification(
    userId,
    'New Warning Issued',
    `You have received a ${severity} warning. Please review and acknowledge it.`,
    'warning'
  );
}
