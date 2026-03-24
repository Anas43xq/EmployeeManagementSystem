import { db } from '../shared/dbClient';
import type { UserRole } from '../auth/authHelpers';

interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  pendingLeaves: number;
  activeEmployees: number;
  todayAttendance: number;
  approvedLeaves: number;
  rejectedLeaves: number;
}

interface RecentActivity {
  id: string;
  action: string;
  created_at: string;
  entity_type: string;
}

interface DepartmentEmployee {
  department_id: string | null;
}

interface DepartmentRecord {
  id: string;
  name: string;
}

/** Fetches comprehensive dashboard data for the authenticated user. */
export async function getDashboardData(
  role: UserRole,
  employeeId: string | null,
): Promise<{
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  departmentData: Array<{ name: string; count: number }>;
  leaveStatusData: Array<{ name: string; value: number }>;
}> {
  const today = new Date().toISOString().split('T')[0];

  let pendingLeavesQuery = db.from('leaves').select('id', { count: 'exact' }).eq('status', 'pending');
  let approvedLeavesQuery = db.from('leaves').select('id', { count: 'exact' }).eq('status', 'approved');
  let rejectedLeavesQuery = db.from('leaves').select('id', { count: 'exact' }).eq('status', 'rejected');
  let attendanceQuery = db
    .from('attendance')
    .select('id', { count: 'exact' })
    .eq('date', today)
    .eq('status', 'present');

  if (role === 'staff' && employeeId) {
    pendingLeavesQuery = pendingLeavesQuery.eq('employee_id', employeeId);
    approvedLeavesQuery = approvedLeavesQuery.eq('employee_id', employeeId);
    rejectedLeavesQuery = rejectedLeavesQuery.eq('employee_id', employeeId);
    attendanceQuery = attendanceQuery.eq('employee_id', employeeId);
  }

  const [
    employeesRes,
    departmentsRes,
    pendingLeavesRes,
    approvedLeavesRes,
    rejectedLeavesRes,
    activitiesRes,
    attendanceRes,
    departmentEmployeesRes,
    departmentNamesRes,
  ] = await Promise.all([
    db.from('employees').select('id, status', { count: 'exact' }),
    db.from('departments').select('id', { count: 'exact' }),
    pendingLeavesQuery,
    approvedLeavesQuery,
    rejectedLeavesQuery,
    // Only admin read activity_logs
    role === 'admin'
      ? db.from('activity_logs').select('id, action, created_at, entity_type').order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    attendanceQuery,
    db.from('employees').select('department_id').eq('status', 'active'),
    db.from('departments').select('id, name'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeEmployees = employeesRes.data?.filter((e: unknown) => (e as any).status === 'active').length || 0;

  const stats: DashboardStats = {
    totalEmployees: employeesRes.count || 0,
    totalDepartments: departmentsRes.count || 0,
    pendingLeaves: pendingLeavesRes.count || 0,
    activeEmployees,
    todayAttendance: attendanceRes.count || 0,
    approvedLeaves: approvedLeavesRes.count || 0,
    rejectedLeaves: rejectedLeavesRes.count || 0,
  };

  const deptMap: { [key: string]: string } = {};
  departmentNamesRes.data?.forEach((dept: unknown) => {
    const deptData = dept as DepartmentRecord;
    deptMap[deptData.id] = deptData.name;
  });

  const deptCounts: { [key: string]: number } = {};
  departmentEmployeesRes.data?.forEach((emp: unknown) => {
    const empData = emp as DepartmentEmployee;
    const deptName = empData.department_id ? deptMap[empData.department_id] || 'Unassigned' : 'Unassigned';
    deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
  });

  const departmentData = Object.entries(deptCounts).map(([name, count]) => ({
    name,
    count,
  }));

  const leaveStatusCounts = {
    Pending: pendingLeavesRes.count || 0,
    Approved: approvedLeavesRes.count || 0,
    Rejected: rejectedLeavesRes.count || 0,
  };

  const leaveStatusData = Object.entries(leaveStatusCounts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
    }));

  return {
    stats,
    recentActivities: (activitiesRes.data || []) as RecentActivity[],
    departmentData,
    leaveStatusData,
  };
}
