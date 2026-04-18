import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { logActivity } from '../../services/activityLog';
import {
  getComplaints,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
  subscribeToComplaintChanges,
} from '../../services/complaints';
import { notifyHRAndAdmins, createNotification } from '../../services/notifications';
import { getEmployeeNameById, getUserAccountIdForEmployee } from '../../services/employees';
import type { EmployeeComplaint, ComplaintStatus, ComplaintFormData } from './types';
import { initialComplaintFormData } from './types';

export function useComplaints() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<EmployeeComplaint[]>([]);
  const [filter, setFilter] = useState<'all' | ComplaintStatus>('all');
  const [activeModal, setActiveModal] = useState<'create' | 'resolve' | null>(null);
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
    } catch (_error) {
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

    return subscribeToComplaintChanges(() => {
      loadComplaints();
    });
  }, [user, loadComplaints]);

  const filteredComplaints = complaints.filter(complaint => {
    if (filter === 'all') return true;
    return complaint.status === filter;
  });

  const handleOpenModal = () => {
    setFormData(initialComplaintFormData);
    setActiveModal('create');
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setFormData(initialComplaintFormData);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedComplaint(null);
    setResolutionNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) return;

    setSubmitting(true);
    try {
      const created = await createComplaint(formData, user.employeeId!);
      logActivity(user.id, 'complaint_created', 'complaint', created.id, {
        category: formData.category,
      });

      // Notify HR/Admin about new complaint with email
      const employeeName = (await getEmployeeNameById(user.employeeId)) || 'An employee';

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
    } catch (_error: unknown) {
      showNotification('error', ((_error as Error)?.message || t('complaints.createFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeReview = async (complaintId: string) => {
    if (!user) return;

    try {
      const complaint = complaints.find(c => c.id === complaintId);
      await updateComplaintStatus(complaintId, 'under_review', {
        assignedTo: user.id,
      });
      logActivity(user.id, 'complaint_reviewed', 'complaint', complaintId, {
        complaint_id: complaintId,
        old_status: complaint?.status,
        new_status: 'under_review',
        category: complaint?.category,
        subject: complaint?.subject,
      });
      showNotification('success', t('complaints.underReview'));
      loadComplaints();
    } catch (_error: unknown) {
      showNotification('error', ((_error as Error)?.message || t('complaints.reviewFailed')));
    }
  };

  const handleOpenResolveModal = (complaint: EmployeeComplaint, action: 'resolved' | 'dismissed') => {
    setSelectedComplaint(complaint);
    setResolveAction(action);
    setResolutionNotes('');
    setActiveModal('resolve');
  };

  const handleResolve = async () => {
    if (!selectedComplaint || !user) return;

    setSubmitting(true);
    try {
      await updateComplaintStatus(selectedComplaint.id, resolveAction, {
        resolutionNotes,
        resolvedBy: user.id,
      });
      logActivity(user.id, 'complaint_resolved', 'complaint', selectedComplaint.id, {
        status: resolveAction,
        resolution_notes: resolutionNotes,
      });

      const employeeUserId = await getUserAccountIdForEmployee(selectedComplaint.employee_id);

      if (employeeUserId) {
        await createNotification(
          employeeUserId,
          'Complaint Status Updated',
          `Your complaint has been ${resolveAction}. ${resolutionNotes ? 'Notes: ' + resolutionNotes : ''}`,
          'complaint',
          true
        );
      }

      showNotification('success', t(`complaints.${resolveAction}`));
      closeModal();
      loadComplaints();
    } catch (_error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      showNotification('error', (_error as Error).message || t('complaints.resolveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (complaintId: string) => {
    try {
      const complaint = complaints.find(c => c.id === complaintId);
      await deleteComplaint(complaintId);
      if (user) {
        logActivity(user.id, 'complaint_deleted', 'complaint', complaintId, {
          complaint_id: complaintId,
          subject: complaint?.subject,
          category: complaint?.category,
          status: complaint?.status,
        });
      }
      showNotification('success', t('complaints.deleteSuccess'));
      loadComplaints();
    } catch (_error: unknown) {
      showNotification('error', ((_error as Error)?.message || t('complaints.deleteFailed')));
    }
  };

  return {
    loading,
    complaints: filteredComplaints,
    filter,
    setFilter,
    activeModal,
    formData,
    setFormData,
    submitting,
    resolutionNotes,
    setResolutionNotes,
    resolveAction,
    isStaff,
    user,
    selectedComplaint,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleTakeReview,
    handleOpenResolveModal,
    handleResolve,
    handleDelete,
    closeModal,
  };
}

