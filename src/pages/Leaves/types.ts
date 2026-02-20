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
