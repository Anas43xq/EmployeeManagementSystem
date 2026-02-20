import { useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../lib/dashboardConfig';
import type { Stats, RecentActivity, DepartmentData, LeaveStatusData } from './types';

export function useDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    totalDepartments: 0,
    pendingLeaves: 0,
    activeEmployees: 0,
    todayAttendance: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [leaveStatusData, setLeaveStatusData] = useState<LeaveStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role) {
      loadDashboardData(user.role, user.employeeId);
    }
  }, [user?.role, user?.employeeId]);

  const loadDashboardData = async (role: UserRole, employeeId: string | null) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      let pendingLeavesQuery = db.from('leaves').select('id', { count: 'exact' }).eq('status', 'pending');
      let approvedLeavesQuery = db.from('leaves').select('id', { count: 'exact' }).eq('status', 'approved');
      let rejectedLeavesQuery = db.from('leaves').select('id', { count: 'exact' }).eq('status', 'rejected');
      let attendanceQuery = db.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present');

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
        departmentNamesRes
      ] = await Promise.all([
        db.from('employees').select('id, status', { count: 'exact' }),
        db.from('departments').select('id', { count: 'exact' }),
        pendingLeavesQuery,
        approvedLeavesQuery,
        rejectedLeavesQuery,
        db.from('activity_logs').select('id, action, created_at, entity_type').order('created_at', { ascending: false }).limit(5),
        attendanceQuery,
        db.from('employees').select('department_id').eq('status', 'active'),
        db.from('departments').select('id, name'),
      ]);

      const activeEmployees = employeesRes.data?.filter((e: any) => e.status === 'active').length || 0;

      setStats({
        totalEmployees: employeesRes.count || 0,
        totalDepartments: departmentsRes.count || 0,
        pendingLeaves: pendingLeavesRes.count || 0,
        activeEmployees,
        todayAttendance: attendanceRes.count || 0,
        approvedLeaves: approvedLeavesRes.count || 0,
        rejectedLeaves: rejectedLeavesRes.count || 0,
      });

      setRecentActivities(activitiesRes.data || []);

      const deptMap: { [key: string]: string } = {};
      departmentNamesRes.data?.forEach((dept: any) => {
        deptMap[dept.id] = dept.name;
      });

      const deptCounts: { [key: string]: number } = {};
      departmentEmployeesRes.data?.forEach((emp: any) => {
        const deptName = emp.department_id ? (deptMap[emp.department_id] || 'Unassigned') : 'Unassigned';
        deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
      });

      const deptData = Object.entries(deptCounts).map(([name, count]) => ({
        name,
        count,
      }));
      setDepartmentData(deptData);

      const leaveStatusCounts = {
        Pending: pendingLeavesRes.count || 0,
        Approved: approvedLeavesRes.count || 0,
        Rejected: rejectedLeavesRes.count || 0,
      };

      const leaveData = Object.entries(leaveStatusCounts)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
        }));
      setLeaveStatusData(leaveData);

    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return { stats, recentActivities, departmentData, leaveStatusData, loading, user };
}

