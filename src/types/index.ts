export interface Employee {
  id: string;
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
  department_id: string;
  position: string;
  employment_type: string;
  status: string;
  hire_date: string;
  termination_date: string | null;
  salary: number;
  qualifications: any[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url?: string | null;
  departments?: {
    name: string;
  };
}

export type EmployeeBasic = Pick<Employee, 'id' | 'first_name' | 'last_name'>;
export type EmployeeWithNumber = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_number'>;
export type EmployeeSummary = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_number' | 'email' | 'position' | 'department_id'> & {
  departments?: { name: string };
};
export type EmployeeListItem = Pick<Employee, 'id' | 'employee_number' | 'first_name' | 'last_name' | 'email' | 'position' | 'department_id' | 'status' | 'employment_type' | 'hire_date'> & {
  departments?: { name: string };
};

export interface Department {
  id: string;
  name: string;
  type: string;
  description: string;
  head_id: string | null;
  employees?: { count: number }[];
}

export type DepartmentBasic = Pick<Department, 'id' | 'name'>;

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface EmployeeTask {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  completed_at: string | null;
  assigned_by: string;
  points: number;
  penalty_points: number;
  created_at: string;
  updated_at: string;
  employees?: EmployeeBasic & { photo_url?: string | null };
  assigned_by_user?: { employees?: EmployeeBasic };
}

export type EmployeeTaskCreate = Pick<EmployeeTask, 'employee_id' | 'title' | 'description' | 'priority' | 'deadline' | 'points' | 'penalty_points'>;

export type WarningSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type WarningStatus = 'active' | 'acknowledged' | 'resolved' | 'appealed';

export interface EmployeeWarning {
  id: string;
  employee_id: string;
  issued_by: string;
  reason: string;
  description: string;
  severity: WarningSeverity;
  status: WarningStatus;
  acknowledged_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  employees?: EmployeeBasic & { photo_url?: string | null };
  issued_by_user?: { employees?: EmployeeBasic };
}

export type EmployeeWarningCreate = Pick<EmployeeWarning, 'employee_id' | 'reason' | 'description' | 'severity'>;

export type ComplaintCategory = 'general' | 'workplace' | 'harassment' | 'safety' | 'policy' | 'other';
export type ComplaintStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type ComplaintPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface EmployeeComplaint {
  id: string;
  employee_id: string;
  subject: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  employees?: EmployeeBasic & { photo_url?: string | null };
  assigned_user?: { employees?: EmployeeBasic };
}

export type EmployeeComplaintCreate = Pick<EmployeeComplaint, 'subject' | 'description' | 'category' | 'priority'>;

export interface EmployeePerformance {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  attendance_score: number;
  task_score: number;
  warning_deduction: number;
  total_score: number;
  tasks_completed: number;
  tasks_overdue: number;
  attendance_days: number;
  absent_days: number;
  late_days: number;
  notes: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
  employees?: EmployeeBasic & { photo_url?: string | null; position?: string };
}

export interface EmployeeOfWeek {
  id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  score: number;
  reason: string;
  is_auto_selected: boolean;
  selected_by: string | null;
  created_at: string;
  employees?: Employee;
}
