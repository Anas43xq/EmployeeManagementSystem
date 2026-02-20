import type { DepartmentBasic } from '../../lib/types';

export type { DepartmentBasic as Department };

export interface ReportEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  employment_type: string;
  status: string;
  hire_date: string;
  salary: number;
  departments: { name: string } | null;
}

export interface Leave {
  id: string;
  employees: {
    first_name: string;
    last_name: string;
    departments: { name: string } | null;
  };
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  reason: string | null;
}

export interface Attendance {
  id: string;
  employees: {
    first_name: string;
    last_name: string;
    departments: { name: string } | null;
  };
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

export interface DepartmentReport {
  id: string;
  name: string;
  type: string;
  description: string | null;
  employees: { count: number }[];
}

export interface PayrollReport {
  id: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_number: string;
    departments: { name: string } | null;
  };
  period_month: number;
  period_year: number;
  base_salary: number;
  total_bonuses: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  status: string;
}

export type ReportType = 'employee' | 'leave' | 'attendance' | 'department' | 'payroll';
