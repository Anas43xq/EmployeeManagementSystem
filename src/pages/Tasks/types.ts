import type { 
  EmployeeTask, 
  TaskPriority, 
  TaskStatus 
} from '../../types';

export interface TaskFormData {
  employee_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  points: number;
  penalty_points: number;
}

export const initialTaskFormData: TaskFormData = {
  employee_id: '',
  title: '',
  description: '',
  priority: 'normal',
  deadline: '',
  points: 10,
  penalty_points: 5,
};

export const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-primary-100 text-primary-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-primary-100 text-primary-800',
  completed: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export type { EmployeeTask, TaskPriority, TaskStatus };
