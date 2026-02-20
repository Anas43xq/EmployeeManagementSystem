import type { EmployeeWithNumber } from '../../types';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
  employees?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export type { EmployeeWithNumber as Employee };
