import { createNotification } from '../notifications/dbNotifications';

/**
 * Performance-related notifications
 */
export async function createPerformanceNotification(
  userId: string,
  type: 'warning_updated' | 'employee_of_week',
  details?: { severity?: string; weekDate?: string }
) {
  if (type === 'warning_updated') {
    return await createNotification(
      userId,
      'Performance Warning',
      `Your performance score has been affected due to a ${details?.severity || 'recent'} warning.`,
      'performance'
    );
  } else if (type === 'employee_of_week') {
    return await createNotification(
      userId,
      'Congratulations! 🎉',
      `You have been selected as the Employee of the Week for ${details?.weekDate || 'this week'}!`,
      'performance'
    );
  }
}
