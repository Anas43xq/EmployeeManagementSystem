import type { 
  EmployeeWarning, 
  WarningSeverity, 
  WarningStatus 
} from '../../types';

export interface WarningFormData {
  employee_id: string;
  reason: string;
  description: string;
  severity: WarningSeverity;
}

export const initialWarningFormData: WarningFormData = {
  employee_id: '',
  reason: '',
  description: '',
  severity: 'minor',
};

export const severityColors: Record<WarningSeverity, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  major: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
};

export const statusColors: Record<WarningStatus, string> = {
  active: 'bg-red-100 text-red-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  appealed: 'bg-purple-100 text-purple-800',
};

export type { EmployeeWarning, WarningSeverity, WarningStatus };
