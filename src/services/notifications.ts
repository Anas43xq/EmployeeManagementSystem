/**
 * Notification service
 * Priority 2: SOLID - Open/Closed (uses config, no hardcoded URLs)
 * Priority 4: SOLID - Centralized error handling (throws AppError, no silent swallows)
 */

import { getNotificationConfig, buildNotificationEndpoint, NOTIFICATION_TYPES, type NotificationEmailType } from './notificationConfig';
import { extractError, logError, type AppError } from './errorHandler';

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

export async function notifyLeaveApproval(employeeEmail: string, leaveType: string, startDate: string, endDate: string) {
  return sendEmailNotification({
    to: employeeEmail,
    subject: 'Leave Request Approved',
    body: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been approved.`,
    type: NOTIFICATION_TYPES.LEAVE_APPROVED,
  });
}

export async function notifyLeaveRejection(employeeEmail: string, leaveType: string, startDate: string, endDate: string, reason?: string) {
  const reasonText = reason ? `<br><br><strong>Reason:</strong> ${reason}` : '';
  return sendEmailNotification({
    to: employeeEmail,
    subject: 'Leave Request Rejected',
    body: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been rejected.${reasonText}`,
    type: NOTIFICATION_TYPES.LEAVE_REJECTED,
  });
}

export async function notifyLeavePending(hrEmail: string, employeeName: string, leaveType: string, startDate: string, endDate: string) {
  return sendEmailNotification({
    to: hrEmail,
    subject: 'New Leave Request Pending',
    body: `${employeeName} has submitted a new ${leaveType} leave request from ${startDate} to ${endDate} that requires your review.`,
    type: NOTIFICATION_TYPES.LEAVE_PENDING,
  });
}

export async function notifyWarningIssued(employeeEmail: string, severity: string) {
  return sendEmailNotification({
    to: employeeEmail,
    subject: `${severity.charAt(0).toUpperCase() + severity.slice(1)} Warning Issued`,
    body: `You have received a <strong>${severity}</strong> warning. Please log in to the system to review the details and acknowledge it.`,
    type: NOTIFICATION_TYPES.WARNING_ISSUED,
  });
}
