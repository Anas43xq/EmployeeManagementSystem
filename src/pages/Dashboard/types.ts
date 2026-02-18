export interface Stats {
  totalEmployees: number;
  totalDepartments: number;
  pendingLeaves: number;
  activeEmployees: number;
  todayAttendance: number;
  approvedLeaves: number;
  rejectedLeaves: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  created_at: string;
  entity_type: string;
}

export interface DepartmentData {
  name: string;
  count: number;
}

export interface LeaveStatusData {
  name: string;
  value: number;
}
