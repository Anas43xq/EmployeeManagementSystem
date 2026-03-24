import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getLeaves,
  updateLeaveStatus,
  getUserIdForEmployee,
  subscribeToLeavesChanges,
} from '../../services/leaves';
import { createNotification } from '../../services/notifications/dbNotifications';
import { logActivity } from '../../services/activityLog';
import type { Leave } from './types';

/**
 * Hook: HR leave approval workflow
 * Owns: leaves list, approval/rejection actions, filtering and loading state
 */
export function useLeaveApproval() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processingLeaves, setProcessingLeaves] = useState<Set<string>>(new Set());

  const loadLeaves = async () => {
    try {
      const data = await getLeaves(
        user?.role === 'staff' && user?.employeeId ? user.employeeId : undefined
      );
      setLeaves(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    return subscribeToLeavesChanges(() => {
      loadLeaves();
    });
  }, [user]);

  const filteredLeaves = leaves.filter((leave) =>
    filter === 'all' ? true : leave.status === filter
  );

  const handleApprove = async (
    leaveId: string,
    updateLeaveBalanceField: (empId: string, type: string, days: number, action: 'add' | 'subtract') => Promise<void>
  ) => {
    if (processingLeaves.has(leaveId)) return;
    try {
      setProcessingLeaves((prev) => new Set(prev).add(leaveId));
      const leave = leaves.find((l) => l.id === leaveId);
      if (!leave) return;
      if (leave.status === 'approved') {
        showNotification('info', 'Leave request is already approved');
        return;
      }
      if (leave.status !== 'pending') {
        showNotification('error', 'Can only approve pending leave requests');
        return;
      }

      await updateLeaveStatus(leaveId, 'approved', user?.id || '');
      await updateLeaveBalanceField(leave.employee_id, leave.leave_type, leave.days_count, 'add');
      showNotification('success', t('leaves.leaveApproved'));
      if (user)
        logActivity(user.id, 'leave_approved', 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });

      const employeeUserId = await getUserIdForEmployee(leave.employee_id);
      if (employeeUserId) {
        await createNotification(
          employeeUserId,
          'Leave Approved',
          `Your ${leave.leave_type} leave request (${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()}) has been approved.`,
          'leave',
          true
        );
      }
      loadLeaves();
    } catch {
      showNotification('error', 'Failed to approve leave request');
    } finally {
      setProcessingLeaves((prev) => {
        const s = new Set(prev);
        s.delete(leaveId);
        return s;
      });
    }
  };

  const handleReject = async (leaveId: string) => {
    if (processingLeaves.has(leaveId)) return;
    try {
      setProcessingLeaves((prev) => new Set(prev).add(leaveId));
      const leave = leaves.find((l) => l.id === leaveId);
      if (!leave) return;
      if (leave.status === 'rejected') {
        showNotification('info', 'Leave request is already rejected');
        return;
      }
      if (leave.status !== 'pending') {
        showNotification('error', 'Can only reject pending leave requests');
        return;
      }

      await updateLeaveStatus(leaveId, 'rejected', user?.id || '');
      showNotification('success', t('leaves.leaveRejected'));
      if (user)
        logActivity(user.id, 'leave_rejected', 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });

      const employeeUserId = await getUserIdForEmployee(leave.employee_id);
      if (employeeUserId) {
        await createNotification(
          employeeUserId,
          'Leave Rejected',
          `Your ${leave.leave_type} leave request (${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()}) has been rejected.`,
          'leave',
          true
        );
      }
      loadLeaves();
    } catch {
      showNotification('error', 'Failed to reject leave request');
    } finally {
      setProcessingLeaves((prev) => {
        const s = new Set(prev);
        s.delete(leaveId);
        return s;
      });
    }
  };

  return {
    leaves,
    loading,
    filter,
    setFilter,
    filteredLeaves,
    processingLeaves,
    handleApprove,
    handleReject,
  };
}
