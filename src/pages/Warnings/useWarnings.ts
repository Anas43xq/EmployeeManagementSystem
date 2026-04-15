import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { extractError, getErrorMessage, logError } from '../../services/errorHandler';
import { logActivity } from '../../services/activityLog';
import {
  getWarnings,
  createWarning,
  acknowledgeWarning,
  resolveWarning,
  deleteWarning,
  createWarningNotification,
  subscribeToWarningChanges,
} from '../../services/warnings';
import { fetchActiveEmployeesWithDefaults, getUserAccountIdForEmployee } from '../../services/employees';
import type { EmployeeWarning, WarningStatus, WarningFormData } from './types';
import { initialWarningFormData } from './types';
import type { EmployeeBasic } from '../../types';

/** Manages warning records, employee lookups, and warning resolution workflows. */
export function useWarnings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState<EmployeeWarning[]>([]);
  const [employees, setEmployees] = useState<(EmployeeBasic & { employee_number: string })[]>([]);
  const [filter, setFilter] = useState<'all' | WarningStatus>('all');
  const [activeModal, setActiveModal] = useState<'create' | 'resolve' | null>(null);
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
    } catch (_error) {
      showNotification('error', t('warnings.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, isStaff, showNotification, t]);

  const loadEmployees = useCallback(async () => {
    if (isStaff) return;
    try {
      const data = await fetchActiveEmployeesWithDefaults(true);
      setEmployees(data as (EmployeeBasic & { employee_number: string })[]);
    } catch (_error) {
      logError(extractError(_error), 'useWarnings.loadEmployees');
      showNotification('error', t('common.failedToLoad', 'Failed to load employees'));
    }
  }, [isStaff, showNotification, t]);

  useEffect(() => {
    loadWarnings();
    loadEmployees();
  }, [loadWarnings, loadEmployees]);

  // Real-time subscription for employee_warnings table
  useEffect(() => {
    if (!user) return;

    return subscribeToWarningChanges(() => {
      loadWarnings();
    });
  }, [user, loadWarnings]);

  const filteredWarnings = warnings.filter(warning => {
    if (filter === 'all') return true;
    return warning.status === filter;
  });

  const handleOpenModal = () => {
    setFormData(initialWarningFormData);
    setActiveModal('create');
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setFormData(initialWarningFormData);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedWarning(null);
    setResolutionNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const created = await createWarning(formData, user.id);
      logActivity(user.id, 'warning_created', 'warning', created.id, {
        employee_id: formData.employee_id,
        severity: formData.severity,
      });

      const targetUserId = await getUserAccountIdForEmployee(formData.employee_id);

      if (targetUserId) {
        await createWarningNotification(targetUserId, formData.severity);
      }

      showNotification('success', t('warnings.createSuccess'));
      handleCloseModal();
      loadWarnings();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useWarnings.handleSubmit');
      showNotification('error', getErrorMessage(_error, t('warnings.createFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (warningId: string) => {
    try {
      await acknowledgeWarning(warningId);
      if (user) {
        logActivity(user.id, 'warning_acknowledged', 'warning', warningId);
      }
      showNotification('success', t('warnings.acknowledged'));
      loadWarnings();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useWarnings.handleAcknowledge');
      showNotification('error', getErrorMessage(_error, t('warnings.acknowledgeFailed')));
    }
  };

  const handleOpenResolveModal = (warning: EmployeeWarning) => {
    setSelectedWarning(warning);
    setResolutionNotes('');
    setActiveModal('resolve');
  };

  const handleResolve = async () => {
    if (!selectedWarning) return;

    setSubmitting(true);
    try {
      await resolveWarning(selectedWarning.id, resolutionNotes);
      if (user) {
        logActivity(user.id, 'warning_resolved', 'warning', selectedWarning.id, {
          resolution_notes: resolutionNotes,
        });
      }
      showNotification('success', t('warnings.resolved'));
      closeModal();
      loadWarnings();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useWarnings.handleResolve');
      showNotification('error', getErrorMessage(_error, t('warnings.resolveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (warningId: string) => {
    try {
      await deleteWarning(warningId);
      if (user) {
        logActivity(user.id, 'warning_deleted', 'warning', warningId);
      }
      showNotification('success', t('warnings.deleteSuccess'));
      loadWarnings();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useWarnings.handleDelete');
      showNotification('error', getErrorMessage(_error, t('warnings.deleteFailed')));
    }
  };

  return {
    loading,
    warnings: filteredWarnings,
    employees,
    filter,
    setFilter,
    activeModal,
    formData,
    setFormData,
    submitting,
    resolutionNotes,
    setResolutionNotes,
    isStaff,
    user,
    selectedWarning,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleAcknowledge,
    handleOpenResolveModal,
    handleResolve,
    handleDelete,
    closeModal,
  };
}


