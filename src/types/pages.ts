


export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}


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


export interface Leave {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: string;
  created_at: string | null;
  employees?: {
    first_name: string;
    last_name: string;
    employee_number: string;
    email: string;
  };
}

export interface LeaveFormData {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  annual_total: number | null;
  annual_used: number | null;
  sick_total: number | null;
  sick_used: number | null;
  casual_total: number | null;
  casual_used: number | null;
}

export interface LeaveConflict {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}


export interface EmployeeFormData {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  position: string;
  department_id: string;
  employment_type: string;
  hire_date: string;
  qualifications: Array<{ degree: string; institution: string; year?: string }>;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}


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

export interface ReportLeave {
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

export interface ReportAttendance {
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
