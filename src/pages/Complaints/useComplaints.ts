import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase, db } from '../../services/supabase';
import {
  getComplaints,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
} from '../../services/performanceQueries';
import { notifyHRAndAdmins, createNotification } from '../../services/dbNotifications';
import type { EmployeeComplaint, ComplaintStatus, ComplaintFormData } from './types';
import { initialComplaintFormData } from './types';

export function useComplaints() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<EmployeeComplaint[]>([]);
  const [filter, setFilter] = useState<'all' | ComplaintStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ComplaintFormData>(initialComplaintFormData);
  const [selectedComplaint, setSelectedComplaint] = useState<EmployeeComplaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveAction, setResolveAction] = useState<'resolved' | 'dismissed'>('resolved');

  const isStaff = user?.role === 'staff';

  const loadComplaints = useCallback(async () => {
    try {
      const filters = isStaff && user?.employeeId ? { employeeId: user.employeeId } : undefined;
      const data = await getComplaints(filters);
      setComplaints(data);
    } catch (error) {
      showNotification('error', t('complaints.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, isStaff, showNotification, t]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Real-time subscription for employee_complaints table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('complaints-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_complaints',
        },
        () => {
          loadComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadComplaints]);

  const filteredComplaints = complaints.filter(complaint => {
    if (filter === 'all') return true;
    return complaint.status === filter;
  });

  const handleOpenModal = () => {
    setFormData(initialComplaintFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialComplaintFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) return;

    setSubmitting(true);
    try {
      await createComplaint(formData, user.employeeId);

      // Notify HR/Admin about new complaint with email
      const { data: employeeData } = await db
        .from('employees')
        .select('first_name, last_name')
        .eq('id', user.employeeId)
        .single() as { data: { first_name: string; last_name: string } | null };

      const employeeName = employeeData
        ? `${employeeData.first_name} ${employeeData.last_name}`
        : 'An employee';

      await notifyHRAndAdmins(
        'New Complaint Submitted',
        `${employeeName} has submitted a ${formData.category} complaint.`,
        'complaint',
        true,
        user.id
      );

      showNotification('success', t('complaints.createSuccess'));
      handleCloseModal();
      loadComplaints();
    } catch (error: any) {
      showNotification('error', error.message || t('complaints.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeReview = async (complaintId: string) => {
    if (!user) return;

    try {
      await updateComplaintStatus(complaintId, 'under_review', {
        assignedTo: user.id,
      });
      showNotification('success', t('complaints.underReview'));
      loadComplaints();
    } catch (error: any) {
      showNotification('error', error.message || t('complaints.reviewFailed'));
    }
  };

  const handleOpenResolveModal = (complaint: EmployeeComplaint, action: 'resolved' | 'dismissed') => {
    setSelectedComplaint(complaint);
    setResolveAction(action);
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!selectedComplaint || !user) return;

    setSubmitting(true);
    try {
      await updateComplaintStatus(selectedComplaint.id, resolveAction, {
        resolutionNotes,
        resolvedBy: user.id,
      });

      const { data: employeeUser, error: userLookupError } = await db
        .from('users')
        .select('id')
        .eq('employee_id', selectedComplaint.employee_id)
        .maybeSingle() as { data: { id: string } | null; error: any };

      if (!userLookupError && employeeUser) {
        await createNotification(
          employeeUser.id,
          'Complaint Status Updated',
          `Your complaint has been ${resolveAction}. ${resolutionNotes ? 'Notes: ' + resolutionNotes : ''}`,
          'complaint',
          true
        );
      }

      showNotification('success', t(`complaints.${resolveAction}`));
      setShowResolveModal(false);
      setSelectedComplaint(null);
      setResolutionNotes('');
      loadComplaints();
    } catch (error: any) {
      showNotification('error', error.message || t('complaints.resolveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (complaintId: string) => {
    try {
      await deleteComplaint(complaintId);
      showNotification('success', t('complaints.deleteSuccess'));
      loadComplaints();
    } catch (error: any) {
      showNotification('error', error.message || t('complaints.deleteFailed'));
    }
  };

  return {
    loading,
    complaints: filteredComplaints,
    filter,
    setFilter,
    showModal,
    showResolveModal,
    setShowResolveModal,
    formData,
    setFormData,
    submitting,
    resolutionNotes,
    setResolutionNotes,
    resolveAction,
    isStaff,
    user,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleTakeReview,
    handleOpenResolveModal,
    handleResolve,
    handleDelete,
  };
}

