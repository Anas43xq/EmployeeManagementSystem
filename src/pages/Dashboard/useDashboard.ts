import { useAuth } from '../../contexts/AuthContext';
import { getDashboardData } from '../../services/dashboard';
import { useAsync } from '../../hooks/useAsync';
import type { Stats, RecentActivity, DepartmentData, LeaveStatusData } from './types';

const DEFAULT_STATS: Stats = {
  totalEmployees: 0,
  totalDepartments: 0,
  pendingLeaves: 0,
  activeEmployees: 0,
  todayAttendance: 0,
  approvedLeaves: 0,
  rejectedLeaves: 0,
};

export function useDashboard() {
  const { user } = useAuth();

  const { data, loading } = useAsync(
    () => user?.role
      ? getDashboardData(user.role, user.employeeId)
      : Promise.resolve(null)
  );

  const stats: Stats = data?.stats ?? DEFAULT_STATS;
  const recentActivities: RecentActivity[] = data?.recentActivities ?? [];
  const departmentData: DepartmentData[] = data?.departmentData ?? [];
  const leaveStatusData: LeaveStatusData[] = data?.leaveStatusData ?? [];

  return { stats, recentActivities, departmentData, leaveStatusData, loading };
}

