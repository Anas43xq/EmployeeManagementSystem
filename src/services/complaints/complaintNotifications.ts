import { createNotification } from '../dbNotifications';

export async function createComplaintNotification(
  userId: string,
  type: 'submitted' | 'status_change',
  status?: string
) {
  const title = type === 'submitted' ? 'Complaint Submitted' : 'Complaint Status Updated';
  const message = type === 'submitted'
    ? 'Your complaint has been submitted and is under review.'
    : `Your complaint status has been updated to: ${status}`;

  return await createNotification(userId, title, message, 'complaint');
}
