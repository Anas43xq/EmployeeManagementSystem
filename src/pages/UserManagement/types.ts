import type { EmployeeSummary } from '../../lib/types';

export interface User {
  id: string;
  role: 'admin' | 'hr' | 'staff';
  employee_id: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  last_sign_in_at?: string;
  employees: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    position: string;
    department_id: string;
    departments?: {
      name: string;
    };
  };
}

export interface EmployeeWithoutAccess {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  position: string;
  status: string;
  departments?: {
    name: string;
  } | null;
}

export function getUserEmail(user: User): string {
  return user.employees?.email || '';
}

export function getUserDisplayName(user: User): string {
  if (user.employees) {
    return `${user.employees.first_name} ${user.employees.last_name}`;
  }
  return '';
}

export type { EmployeeSummary as Employee };

export interface GrantAccessFormData {
  employee_id: string;
  password: string;
  role: 'admin' | 'hr' | 'staff';
}

export interface EditUserFormData {
  role: 'admin' | 'hr' | 'staff';
}

export interface BanUserFormData {
  banDuration: 'permanent' | '24' | '168' | '720' | '8760'; // hours: 1 day, 1 week, 30 days, 1 year
  reason: string;
}

export type BanDurationOption = {
  value: BanUserFormData['banDuration'];
  label: string;
};
