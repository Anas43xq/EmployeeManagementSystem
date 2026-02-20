export type UserRole = 'admin' | 'hr' | 'staff';

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
