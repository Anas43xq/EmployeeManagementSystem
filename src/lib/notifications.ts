export type NotificationEmailType =
  | 'leave_approved' | 'leave_rejected' | 'leave_pending'
  | 'leave' | 'attendance' | 'system' | 'warning' | 'task' | 'complaint' | 'performance'
  | 'general';

interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
  type: NotificationEmailType;
}

export async function sendEmailNotification(data: EmailNotificationData): Promise<boolean> {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!apiUrl || apiUrl === 'undefined/functions/v1/send-notification-email') {
      return false;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    return false;
  }
}

export async function notifyLeaveApproval(employeeEmail: string, leaveType: string, startDate: string, endDate: string) {
  await sendEmailNotification({
    to: employeeEmail,
    subject: 'Leave Request Approved',
    body: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been approved.`,
    type: 'leave_approved',
  });
}

export async function notifyLeaveRejection(employeeEmail: string, leaveType: string, startDate: string, endDate: string, reason?: string) {
  const reasonText = reason ? `<br><br><strong>Reason:</strong> ${reason}` : '';
  await sendEmailNotification({
    to: employeeEmail,
    subject: 'Leave Request Rejected',
    body: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been rejected.${reasonText}`,
    type: 'leave_rejected',
  });
}

export async function notifyLeavePending(hrEmail: string, employeeName: string, leaveType: string, startDate: string, endDate: string) {
  await sendEmailNotification({
    to: hrEmail,
    subject: 'New Leave Request Pending',
    body: `${employeeName} has submitted a new ${leaveType} leave request from ${startDate} to ${endDate} that requires your review.`,
    type: 'leave_pending',
  });
}
