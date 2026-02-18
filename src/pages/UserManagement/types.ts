import type { EmployeeSummary } from '../../lib/types';

export interface User {
  id: string;
  role: 'admin' | 'hr' | 'staff';
  employee_id: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
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
  };
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
