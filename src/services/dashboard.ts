

// File: dashboardConfig.ts

import type { UserRole } from './auth';

export interface DashboardWidget {
  id: string;
  label: string;
  visibleFor: UserRole[];
  isChart?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  to: string;
  color: string;
  visibleFor: UserRole[];
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'totalEmployees', label: 'Total Employees', visibleFor: ['admin', 'hr'] },
  { id: 'activeEmployees', label: 'Active Employees', visibleFor: ['admin', 'hr'] },
  { id: 'departments', label: 'Departments', visibleFor: ['admin', 'hr'] },
  { id: 'pendingLeaves', label: 'Pending Leaves', visibleFor: ['admin', 'hr', 'staff'] },
  { id: 'todayAttendance', label: "Today's Attendance", visibleFor: ['admin', 'hr', 'staff'] },
  { id: 'approvedLeaves', label: 'Approved Leaves', visibleFor: ['admin', 'hr'] },
  { id: 'rejectedLeaves', label: 'Rejected Leaves', visibleFor: ['admin', 'hr'] },
  { id: 'employeeOfWeek', label: 'Employee of the Week', visibleFor: ['admin', 'hr', 'staff'] },
  { id: 'performanceChart', label: 'Performance Chart', visibleFor: ['admin', 'hr'] },
  { id: 'departmentChart', label: 'Employees by Department', visibleFor: ['admin', 'hr'], isChart: true },
  { id: 'leaveChart', label: 'Leave Status Distribution', visibleFor: ['admin', 'hr', 'staff'], isChart: true },
  { id: 'recentActivities', label: 'Recent Activities', visibleFor: ['admin'] },
  { id: 'announcements', label: 'Announcements', visibleFor: ['admin', 'hr', 'staff'] },
];

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'addEmployee',
    label: 'Add Employee',
    icon: 'Users',
    to: '/employees?action=add',
    color: 'blue',
    visibleFor: ['admin', 'hr'],
  },
  {
    id: 'applyLeave',
    label: 'Apply Leave',
    icon: 'Calendar',
    to: '/leaves?action=apply',
    color: 'green',
    visibleFor: ['admin', 'hr', 'staff'],
  },
  {
    id: 'markAttendance',
    label: 'Mark Attendance',
    icon: 'Clock',
    to: '/attendance',
    color: 'teal',
    visibleFor: ['admin', 'hr'],
  },
  {
    id: 'viewReports',
    label: 'View Reports',
    icon: 'TrendingUp',
    to: '/reports',
    color: 'orange',
    visibleFor: ['admin', 'hr'],
  },
];

export function getVisibleWidgets(role: UserRole): DashboardWidget[] {
  return DASHBOARD_WIDGETS.filter(widget => widget.visibleFor.includes(role));
}


export function getVisibleQuickActions(role: UserRole): QuickAction[] {
  return QUICK_ACTIONS.filter(action => action.visibleFor.includes(role));
}

export function isWidgetVisible(widgetId: string, role: UserRole): boolean {
  const widget = DASHBOARD_WIDGETS.find(w => w.id === widgetId);
  return widget ? widget.visibleFor.includes(role) : false;
}


// File: dashboardQueries.ts

import { db } from '../lib/db';
import type { EmployeePerformance, EmployeeOfWeek } from '../types';
import { getEmployeeOfWeek, getTopPerformers } from './performance';

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
  employeeOfWeek: EmployeeOfWeek | null;
  topPerformers: EmployeePerformance[];
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
    employeeOfWeekData,
    topPerfomersData,
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
    // Fetch employee of week (may trigger calculation if empty)
    (async () => {
      try {
        return await getEmployeeOfWeek();
      } catch (_error) {
        return null;
      }
    })(),
    // Fetch top performers (may trigger calculation if empty)
    (async () => {
      try {
        return await getTopPerformers();
      } catch (_error) {
        return [];
      }
    })(),
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
    employeeOfWeek: employeeOfWeekData || null,
    topPerformers: topPerfomersData || [],
  };
}

