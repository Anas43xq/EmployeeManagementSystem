import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createLeave, checkLeaveConflicts, getEmployeeForLeave } from '../../services/leaves';
import { notifyHRAndAdmins } from '../../services/notifications';
import { logActivity } from '../../services/activityLog';
import type { LeaveFormData, LeaveConflict } from './types';

/**
 * Hook: Staff leave application workflow
 * Owns: apply form state, conflict detection, submission, UI modals
 */
export function useLeaveApply() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [leaveConflicts, setLeaveConflicts] = useState<LeaveConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    } catch (err) {
      console.error('[useLeaveApply] checkLeaveConflictsHandler failed:', err);
      setLeaveConflicts([]);
      return [];
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleApplyLeave = async (
    e: React.FormEvent,
    calculateDays: (start: string, end: string) => number,
    getAvailableBalance: (type: string) => number
  ) => {
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
    } catch (err) {
      console.error('[useLeaveApply] handleApplyLeave failed:', err);
      showNotification('error', 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    showApplyModal,
    setShowApplyModal,
    formData,
    setFormData,
    submitting,
    leaveConflicts,
    checkingConflicts,
    checkLeaveConflicts: checkLeaveConflictsHandler,
    handleApplyLeave,
  };
}
