import type { 
  EmployeeComplaint, 
  ComplaintCategory, 
  ComplaintStatus,
  ComplaintPriority 
} from '../../types';

export interface ComplaintFormData {
  subject: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
}

export const initialComplaintFormData: ComplaintFormData = {
  subject: '',
  description: '',
  category: 'general',
  priority: 'normal',
};

export const categoryColors: Record<ComplaintCategory, string> = {
  general: 'bg-gray-100 text-gray-800',
  workplace: 'bg-primary-100 text-primary-800',
  harassment: 'bg-red-100 text-red-800',
  safety: 'bg-orange-100 text-orange-800',
  policy: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
};

export const statusColors: Record<ComplaintStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-primary-100 text-primary-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

export const priorityColors: Record<ComplaintPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-primary-100 text-primary-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export type { EmployeeComplaint, ComplaintCategory, ComplaintStatus, ComplaintPriority };
