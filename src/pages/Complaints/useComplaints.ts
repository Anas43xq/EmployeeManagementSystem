import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { db } from '../../lib/supabase';
import {
  getComplaints,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
  createComplaintNotification,
} from '../../lib/performanceQueries';
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
      await createComplaintNotification(user.id, 'submitted');

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

      const { data: employeeUser } = await db
        .from('users')
        .select('id')
        .eq('employee_id', selectedComplaint.employee_id)
        .maybeSingle() as { data: { id: string } | null };

      if (employeeUser) {
        await createComplaintNotification(employeeUser.id, 'status_change', resolveAction);
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

