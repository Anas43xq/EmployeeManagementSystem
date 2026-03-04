import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createNotification, notifyHRAndAdmins } from '../../services/dbNotifications';
import { logActivity } from '../../services/activityLog';
import { calculateWorkingDays } from '../../utils/dateUtils';
import type { Leave, LeaveFormData, LeaveConflict } from './types';

interface UseLeaveActionsOptions {
  leaves: Leave[];
  getAvailableBalance: (leaveType: string) => number;
  updateLeaveBalance: (employeeId: string, leaveType: string, days: number, action: 'add' | 'subtract') => Promise<void>;
  loadLeaves: () => Promise<void>;
}

export function useLeaveActions({
  leaves,
  getAvailableBalance,
  updateLeaveBalance,
  loadLeaves,
}: UseLeaveActionsOptions) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

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

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    return calculateWorkingDays(startDate, endDate);
  };

  const checkLeaveConflicts = async (startDate: string, endDate: string, employeeId?: string): Promise<LeaveConflict[]> => {
    const targetEmployeeId = employeeId || user?.employeeId;
    if (!targetEmployeeId || !startDate || !endDate) {
      setLeaveConflicts([]);
      return [];
    }

    setCheckingConflicts(true);
    try {
      const { data, error } = await db
        .from('leaves')
        .select('id, leave_type, start_date, end_date, status')
        .eq('employee_id', targetEmployeeId)
        .in('status', ['approved', 'pending'])
        .lte('start_date', endDate)
        .gte('end_date', startDate);

      if (error) {
        setLeaveConflicts([]);
        return [];
      }

      const conflicts: LeaveConflict[] = (data || []).map((leave: any) => ({
        id: leave.id,
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        status: leave.status,
      }));

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
      showNotification('error', `Insufficient ${formData.leave_type} leave balance. Available: ${availableBalance} days`);
      return;
    }

    const conflicts = await checkLeaveConflicts(formData.start_date, formData.end_date);
    if (conflicts.length > 0) {
      showNotification('error', t('leaves.conflictDetected'));
      return;
    }

    setSubmitting(true);
    try {
      const { data: employeeData } = await db
        .from('employees')
        .select('first_name, last_name')
        .eq('id', user.employeeId)
        .single() as { data: { first_name: string; last_name: string } | null };

      const { error } = await (db.from('leaves') as any)
        .insert({
          employee_id: user.employeeId,
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: daysCount,
          reason: formData.reason,
          status: 'pending',
        });

      if (error) throw error;

      showNotification('success', t('leaves.leaveSubmitted'));

      if (user) {
        logActivity(user.id, 'leave_requested', 'leave', undefined, {
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: daysCount,
        });
      }

      const employeeName = employeeData ? `${employeeData.first_name} ${employeeData.last_name}` : 'An employee';
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
      setProcessingLeaves(prev => new Set(prev).add(leaveId));

      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) return;

      if (leave.status === 'approved') {
        showNotification('info', 'Leave request is already approved');
        return;
      }
      if (leave.status !== 'pending') {
        showNotification('error', 'Can only approve pending leave requests');
        return;
      }

      const { error } = await (db.from('leaves') as any)
        .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', leaveId)
        .eq('status', 'pending');

      if (error) throw error;

      await updateLeaveBalance(leave.employee_id, leave.leave_type, leave.days_count, 'add');

      showNotification('success', t('leaves.leaveApproved'));

      if (user) {
        logActivity(user.id, 'leave_approved', 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });
      }

      const { data: employeeUser, error: userLookupError } = await db
        .from('users')
        .select('id')
        .eq('employee_id', leave.employee_id)
        .single() as { data: { id: string } | null; error: any };

      if (!userLookupError && employeeUser) {
        await createNotification(
          employeeUser.id,
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
      setProcessingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveId);
        return newSet;
      });
    }
  };

  const handleReject = async (leaveId: string) => {
    if (processingLeaves.has(leaveId)) return;

    try {
      setProcessingLeaves(prev => new Set(prev).add(leaveId));

      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) return;

      if (leave.status === 'rejected') {
        showNotification('info', 'Leave request is already rejected');
        return;
      }
      if (leave.status !== 'pending') {
        showNotification('error', 'Can only reject pending leave requests');
        return;
      }

      const { error } = await (db.from('leaves') as any)
        .update({ status: 'rejected', approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', leaveId)
        .eq('status', 'pending');

      if (error) throw error;

      showNotification('success', t('leaves.leaveRejected'));

      if (user) {
        logActivity(user.id, 'leave_rejected', 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });
      }

      const { data: employeeUser, error: userLookupError } = await db
        .from('users')
        .select('id')
        .eq('employee_id', leave.employee_id)
        .single() as { data: { id: string } | null; error: any };

      if (!userLookupError && employeeUser) {
        await createNotification(
          employeeUser.id,
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
      setProcessingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveId);
        return newSet;
      });
    }
  };

  return {
    showApplyModal,
    setShowApplyModal,
    submitting,
    formData,
    setFormData,
    leaveConflicts,
    checkingConflicts,
    checkLeaveConflicts,
    processingLeaves,
    calculateDays,
    handleApplyLeave,
    handleApprove,
    handleReject,
  };
}
