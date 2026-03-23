import { createNotification } from '../notifications/dbNotifications';

export async function createTaskNotification(
  userId: string,
  taskTitle: string,
  type: 'assigned' | 'completed' | 'overdue'
) {
  const titles: Record<string, string> = {
    assigned: 'New Task Assigned',
    completed: 'Task Completed',
    overdue: 'Task Overdue',
  };
  const messages: Record<string, string> = {
    assigned: `You have been assigned a new task: "${taskTitle}"`,
    completed: `Task "${taskTitle}" has been marked as completed`,
    overdue: `Task "${taskTitle}" is now overdue`,
  };

  return await createNotification(userId, titles[type], messages[type], 'task');
}
