import type { EmployeeBasic } from '../../types';

export interface Department {
  id: string;
  name: string;
  type: string;
  description: string;
  head_id: string | null;
  employees?: { count: number }[];
}

export interface DepartmentForm {
  name: string;
  type: string;
  description: string;
  head_id: string;
}

export type { EmployeeBasic as Employee };
