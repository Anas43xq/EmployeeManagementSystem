import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createNotification, notifyHRAndAdmins } from '../../lib/dbNotifications';
import { logActivity } from '../../lib/activityLog';
import type { Leave, LeaveFormData, LeaveBalance } from './types';

export function useLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadLeaves();
    loadLeaveBalance();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(() => {
      loadLeaves();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [user]);

  const loadLeaveBalance = async () => {
    if (!user?.employeeId) return;

    const currentYear = new Date().getFullYear();
    try {
      const { data, error } = await db
        .from('leave_balances')
        .select('*')
        .eq('employee_id', user.employeeId)
        .eq('year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') {
        return;
      }

      if (data) {
        setLeaveBalance(data);
      } else {
        const { data: newBalance, error: insertError } = await (db.from('leave_balances') as any)
          .insert({
            employee_id: user.employeeId,
            year: currentYear,
            annual_total: 20,
            annual_used: 0,
            sick_total: 10,
            sick_used: 0,
            casual_total: 10,
            casual_used: 0,
          })
          .select()
          .single();

        if (!insertError && newBalance) {
          setLeaveBalance(newBalance);
        }
      }
    } catch (error) {
    }
  };

  const getAvailableBalance = (leaveType: string): number => {
    if (!leaveBalance) return 0;
    switch (leaveType) {
      case 'annual':
        return (leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0);
      case 'sick':
        return (leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0);
      case 'casual':
        return (leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0);
      default:
        return 999;
    }
  };

  const loadLeaves = async () => {
    try {
      let query = db
        .from('leaves')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_number,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (user?.role === 'staff' && user?.employeeId) {
        query = query.eq('employee_id', user.employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeaves(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const updateLeaveBalance = async (employeeId: string, leaveType: string, days: number, action: 'add' | 'subtract') => {
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
      const { data: currentBalance } = await db
        .from('leave_balances')
        .select(fieldToUpdate)
        .eq('employee_id', employeeId)
        .eq('year', currentYear)
        .single();

      if (currentBalance) {
        const balanceRecord = currentBalance as unknown as Record<string, number>;
        const currentValue = balanceRecord[fieldToUpdate] || 0;
        const newValue = action === 'add' ? currentValue + days : Math.max(0, currentValue - days);

        await (db.from('leave_balances') as any)
          .update({ [fieldToUpdate]: newValue })
          .eq('employee_id', employeeId)
          .eq('year', currentYear);
      }
    } catch (error) {
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
        'leave'
      );

      setFormData({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
      });
      setShowApplyModal(false);
      loadLeaves();
    } catch (error) {
      showNotification('error', 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) return;

      const { error } = await (db.from('leaves') as any)
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', leaveId);

      if (error) throw error;

      await updateLeaveBalance(leave.employee_id, leave.leave_type, leave.days_count, 'add');

      showNotification('success', t('leaves.leaveApproved'));

      if (user) {
        logActivity(user.id, 'leave_approved', 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });
      }

      const { data: employeeUser } = await db
        .from('users')
        .select('id')
        .eq('employee_id', leave.employee_id)
        .single() as { data: { id: string } | null };

      if (employeeUser) {
        await createNotification(
          employeeUser.id,
          'Leave Approved',
          `Your ${leave.leave_type} leave request (${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()}) has been approved.`,
          'leave'
        );
      } else {
      }

      loadLeaves();
    } catch (error) {
      showNotification('error', 'Failed to approve leave request');
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) return;

      const { error } = await (db.from('leaves') as any)
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', leaveId);

      if (error) throw error;

      showNotification('success', t('leaves.leaveRejected'));

      if (user) {
        logActivity(user.id, 'leave_rejected', 'leave', leaveId, {
          employee_id: leave.employee_id,
          leave_type: leave.leave_type,
        });
      }

      const { data: employeeUser } = await db
        .from('users')
        .select('id')
        .eq('employee_id', leave.employee_id)
        .single() as { data: { id: string } | null };

      if (employeeUser) {
        await createNotification(
          employeeUser.id,
          'Leave Rejected',
          `Your ${leave.leave_type} leave request (${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()}) has been rejected.`,
          'leave'
        );
      } else {
      }

      loadLeaves();
    } catch (error) {
      showNotification('error', 'Failed to reject leave request');
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'all') return true;
    return leave.status === filter;
  });

  return {
    leaves,
    loading,
    user,
    filter,
    setFilter,
    showApplyModal,
    setShowApplyModal,
    submitting,
    leaveBalance,
    formData,
    setFormData,
    filteredLeaves,
    handleApplyLeave,
    handleApprove,
    handleReject,
    calculateDays,
    getAvailableBalance,
  };
}

