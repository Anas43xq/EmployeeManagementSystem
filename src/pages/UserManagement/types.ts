import type { EmployeeSummary } from '../../types';

export interface User {
  id: string;
  role: 'admin' | 'hr' | 'staff';
  employeeId: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  lastSignInAt?: string;
  employees: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position: string;
    departmentId: string;
    departments?: {
      name: string;
    };
  };
}

export interface EmployeeWithoutAccess {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
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
    return `${user.employees.firstName} ${user.employees.lastName}`;
  }
  return '';
}

export type { EmployeeSummary as Employee };

export interface GrantAccessFormData {
  employeeId: string;
  password: string;
  role: 'admin' | 'hr' | 'staff';
}

export interface EditUserFormData {
  role: 'admin' | 'hr' | 'staff';
}

export interface BanUserFormData {
  banDuration: 'permanent' | '24' | '168' | '720' | '8760'; 
  reason: string;
}

export type BanDurationOption = {
  value: BanUserFormData['banDuration'];
  label: string;
};
