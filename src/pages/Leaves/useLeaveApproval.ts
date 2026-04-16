import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getLeaves,
  updateLeaveStatus,
  getUserIdForEmployee,
  subscribeToLeavesChanges,
} from '../../services/leaves';
import { createNotification } from '../../services/notifications';
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

  const loadLeaves = useCallback(async () => {
    try {
      const data = await getLeaves(
        user?.role === 'staff' && user?.employeeId ? user.employeeId : undefined
      );
      setLeaves(data);
    } catch (err) {
      console.error('[useLeaveApproval] loadLeaves failed:', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    if (!user) return;

    return subscribeToLeavesChanges(loadLeaves);
  }, [user, loadLeaves]);

  const filteredLeaves = leaves.filter((leave) =>
    filter === 'all' ? true : leave.status === filter
  );

  const handleLeaveDecision = async (
    leaveId: string,
    decision: 'approved' | 'rejected',
    updateLeaveBalanceField: (empId: string, type: string, days: number, action: 'add' | 'subtract') => Promise<void>
  ) => {
    if (processingLeaves.has(leaveId)) return;
    try {
      setProcessingLeaves((prev) => new Set(prev).add(leaveId));
      const leave = leaves.find((l) => l.id === leaveId);
      if (!leave) return;
      if (leave.status === decision) {
        showNotification('info', `Leave request is already ${decision}`);
        return;
      }
      if (leave.status !== 'pending') {
        showNotification('error', 'Can only action pending leave requests');
        return;
      }

      await updateLeaveStatus(leaveId, decision, user?.id || '');

      if (decision === 'approved') {
        await updateLeaveBalanceField(
          leave.employee_id,
          leave.leave_type,
          leave.days_count,
          'add'
        );
      }

      const successKey =
        decision === 'approved' ? 'leaves.leaveApproved' : 'leaves.leaveRejected';
      showNotification('success', t(successKey));

      if (user)
        logActivity(user.id, `leave_${decision}`, 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });

      const employeeUserId = await getUserIdForEmployee(leave.employee_id);
      if (employeeUserId) {
        await createNotification(
          employeeUserId,
          decision === 'approved' ? 'Leave Approved' : 'Leave Rejected',
          `Your ${leave.leave_type} leave request (${new Date(
            leave.start_date
          ).toLocaleDateString()} - ${new Date(
            leave.end_date
          ).toLocaleDateString()}) has been ${decision}.`,
          'leave',
          true
        );
      }
      loadLeaves();
    } catch (err) {
      console.error(`[useLeaveApproval] handleLeaveDecision(${decision}) failed:`, err);
      showNotification('error', `Failed to ${decision} leave request`);
    } finally {
      setProcessingLeaves((prev) => {
        const s = new Set(prev);
        s.delete(leaveId);
        return s;
      });
    }
  };

  const handleApprove = (
    leaveId: string,
    updateLeaveBalanceField: (empId: string, type: string, days: number, action: 'add' | 'subtract') => Promise<void>
  ) => handleLeaveDecision(leaveId, 'approved', updateLeaveBalanceField);

  const handleReject = (
    leaveId: string,
    updateLeaveBalanceField: (empId: string, type: string, days: number, action: 'add' | 'subtract') => Promise<void>
  ) => handleLeaveDecision(leaveId, 'rejected', updateLeaveBalanceField);

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
