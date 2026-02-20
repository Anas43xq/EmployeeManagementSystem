import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { db } from '../../services/supabase';
import {
  getWarnings,
  createWarning,
  acknowledgeWarning,
  resolveWarning,
  deleteWarning,
  createWarningNotification,
} from '../../services/performanceQueries';
import type { EmployeeWarning, WarningStatus, WarningFormData } from './types';
import { initialWarningFormData } from './types';
import type { EmployeeBasic } from '../../types';

export function useWarnings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState<EmployeeWarning[]>([]);
  const [employees, setEmployees] = useState<(EmployeeBasic & { employee_number: string })[]>([]);
  const [filter, setFilter] = useState<'all' | WarningStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<WarningFormData>(initialWarningFormData);
  const [selectedWarning, setSelectedWarning] = useState<EmployeeWarning | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const isStaff = user?.role === 'staff';

  const loadWarnings = useCallback(async () => {
    try {
      const filters = isStaff && user?.employeeId ? { employeeId: user.employeeId } : undefined;
      const data = await getWarnings(filters);
      setWarnings(data);
    } catch (error) {
      showNotification('error', t('warnings.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, isStaff, showNotification, t]);

  const loadEmployees = useCallback(async () => {
    if (isStaff) return;
    
    try {
      const { data, error } = await db
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
    }
  }, [isStaff]);

  useEffect(() => {
    loadWarnings();
    loadEmployees();
  }, [loadWarnings, loadEmployees]);

  const filteredWarnings = warnings.filter(warning => {
    if (filter === 'all') return true;
    return warning.status === filter;
  });

  const handleOpenModal = () => {
    setFormData(initialWarningFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialWarningFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      await createWarning(formData, user.id);
      
      const { data: targetUser, error: userLookupError } = await db
        .from('users')
        .select('id')
        .eq('employee_id', formData.employee_id)
        .maybeSingle() as { data: { id: string } | null; error: any };

      if (!userLookupError && targetUser) {
        await createWarningNotification(targetUser.id, formData.severity);
      }

      showNotification('success', t('warnings.createSuccess'));
      handleCloseModal();
      loadWarnings();
    } catch (error: any) {
      showNotification('error', error.message || t('warnings.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (warningId: string) => {
    try {
      await acknowledgeWarning(warningId);
      showNotification('success', t('warnings.acknowledged'));
      loadWarnings();
    } catch (error: any) {
      showNotification('error', error.message || t('warnings.acknowledgeFailed'));
    }
  };

  const handleOpenResolveModal = (warning: EmployeeWarning) => {
    setSelectedWarning(warning);
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!selectedWarning) return;

    setSubmitting(true);
    try {
      await resolveWarning(selectedWarning.id, resolutionNotes);
      showNotification('success', t('warnings.resolved'));
      setShowResolveModal(false);
      setSelectedWarning(null);
      setResolutionNotes('');
      loadWarnings();
    } catch (error: any) {
      showNotification('error', error.message || t('warnings.resolveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (warningId: string) => {
    try {
      await deleteWarning(warningId);
      showNotification('success', t('warnings.deleteSuccess'));
      loadWarnings();
    } catch (error: any) {
      showNotification('error', error.message || t('warnings.deleteFailed'));
    }
  };

  return {
    loading,
    warnings: filteredWarnings,
    employees,
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
    isStaff,
    user,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleAcknowledge,
    handleOpenResolveModal,
    handleResolve,
    handleDelete,
  };
}


