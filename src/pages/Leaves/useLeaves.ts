import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createNotification, notifyHRAndAdmins } from '../../services/notifications/dbNotifications';
import { logActivity } from '../../services/activityLog';
import { calculateWorkingDays } from '../../utils/dateUtils';
import {
  getLeaves,
  getOrCreateLeaveBalance,
  updateLeaveBalance,
  checkLeaveConflicts,
  createLeave,
  updateLeaveStatus,
  getEmployeeForLeave,
  getUserIdForEmployee,
  subscribeToLeavesChanges,
  subscribeToLeaveBalanceChanges,
} from '../../services/leaves';
import type { Leave, LeaveBalance, LeaveFormData, LeaveConflict } from './types';

export function useLeaves() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  // Leaves state
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Balance state
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  // Form / actions state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [leaveConflicts, setLeaveConflicts] = useState<LeaveConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [processingLeaves, setProcessingLeaves] = useState<Set<string>>(new Set());

  // --- Leaves loading ---
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

  useEffect(() => { loadLeaves(); }, [user]);

  useEffect(() => {
    if (!user) return;

    return subscribeToLeavesChanges(() => { loadLeaves(); });
  }, [user]);

  // --- Leave balance ---
  const loadLeaveBalance = async () => {
    if (!user?.employeeId) return;
    const currentYear = new Date().getFullYear();
    try {
      const data = await getOrCreateLeaveBalance(user.employeeId, currentYear);
      setLeaveBalance(data);
    } catch {}
  };

  useEffect(() => { loadLeaveBalance(); }, [user]);

  useEffect(() => {
    if (!user?.employeeId) return;

    return subscribeToLeaveBalanceChanges(user.employeeId, () => { loadLeaveBalance(); });
  }, [user?.employeeId]);

  const getAvailableBalance = (leaveType: string): number => {
    if (!leaveBalance) return 0;
    switch (leaveType) {
      case 'annual': return (leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0);
      case 'sick': return (leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0);
      case 'casual': return (leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0);
      default: return 999;
    }
  };

  const updateLeaveBalanceField = async (employeeId: string, leaveType: string, days: number, action: 'add' | 'subtract') => {
    const currentYear = new Date().getFullYear();
    let fieldToUpdate = '';
    switch (leaveType) {
      case 'annual':
        fieldToUpdate = 'annual_used';
        break;
      case 'sick':
        fieldToUpdate = 'sick_used';
        break;
      case 'casual':
        fieldToUpdate = 'casual_used';
        break;
      default:
        return;
    }
    try {
      const balance = await getOrCreateLeaveBalance(employeeId, currentYear);
      const rec = balance as unknown as Record<string, number>;
      const newValue = action === 'add' ? (rec[fieldToUpdate] || 0) + days : Math.max(0, (rec[fieldToUpdate] || 0) - days);
      await updateLeaveBalance(employeeId, currentYear, fieldToUpdate, newValue);
    } catch {}
  };

  // --- Leave actions ---
  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    return calculateWorkingDays(startDate, endDate);
  };

  const checkLeaveConflictsHandler = async (startDate: string, endDate: string, employeeId?: string): Promise<LeaveConflict[]> => {
    const targetEmployeeId = employeeId || user?.employeeId;
    if (!targetEmployeeId || !startDate || !endDate) {
      setLeaveConflicts([]);
      return [];
    }
    setCheckingConflicts(true);
    try {
      const conflicts = await checkLeaveConflicts(targetEmployeeId, startDate, endDate);
      setLeaveConflicts(conflicts);
      return conflicts;
    } catch {
      setLeaveConflicts([]);
      return [];
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) {
      showNotification('error', 'Employee ID not found');
      return;
    }
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }
    const daysCount = calculateDays(formData.start_date, formData.end_date);
    if (daysCount <= 0) {
      showNotification('error', 'End date must be after start date');
      return;
    }
    const availableBalance = getAvailableBalance(formData.leave_type);
    if (daysCount > availableBalance && availableBalance !== 999) {
      showNotification(
        'error',
        `Insufficient ${formData.leave_type} leave balance. Available: ${availableBalance} days`
      );
      return;
    }
    const conflicts = await checkLeaveConflictsHandler(formData.start_date, formData.end_date);
    if (conflicts.length > 0) {
      showNotification('error', t('leaves.conflictDetected'));
      return;
    }

    setSubmitting(true);
    try {
      await createLeave({
        employee_id: user.employeeId,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_count: daysCount,
        reason: formData.reason,
      });

      showNotification('success', t('leaves.leaveSubmitted'));
      if (user)
        logActivity(user.id, 'leave_requested', 'leave', undefined, {
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: daysCount,
        });

      const employeeData = await getEmployeeForLeave(user.employeeId);
      const employeeName = employeeData
        ? `${employeeData.first_name} ${employeeData.last_name}`
        : 'An employee';
      await notifyHRAndAdmins(
        'New Leave Request',
        `${employeeName} has submitted a ${formData.leave_type} leave request (${formData.start_date} to ${formData.end_date})`,
        'leave',
        true,
        user.id
      );

      setFormData({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      setShowApplyModal(false);
      loadLeaves();
    } catch {
      showNotification('error', 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
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

  const filteredLeaves = leaves.filter(leave => filter === 'all' ? true : leave.status === filter);

  return {
    leaves,
    loading,
    user,
    filter,
    setFilter,
    filteredLeaves,
    leaveBalance,
    getAvailableBalance,
    showApplyModal,
    setShowApplyModal,
    submitting,
    formData,
    setFormData,
    leaveConflicts,
    checkingConflicts,
    checkLeaveConflicts: checkLeaveConflictsHandler,
    processingLeaves,
    calculateDays,
    handleApplyLeave,
    handleApprove,
    handleReject,
  };
}
