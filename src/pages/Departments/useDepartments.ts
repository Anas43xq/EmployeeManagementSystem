import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../services/activityLog';
import { useTranslation } from 'react-i18next';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../../services/departments';
import { fetchActiveEmployeesWithDefaults } from '../../services/employees';
import type { Department, DepartmentForm, Employee } from './types';

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<DepartmentForm>({
    name: '',
    type: 'academic',
    description: '',
    head_id: '',
  });
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const loadDepartments = useCallback(async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('[useDepartments] loadDepartments failed:', error);
      showNotification('error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await fetchActiveEmployeesWithDefaults();
      setEmployees(data as Employee[]);
    } catch (error) {
      console.error('[useDepartments] loadEmployees failed:', error);
      showNotification('error', t('common.failedToLoad', 'Failed to load employees'));
    }
  }, [showNotification, t]);

  useEffect(() => {
    loadDepartments();
    if (isAdminOrHR) loadEmployees();
  }, [isAdminOrHR, loadDepartments, loadEmployees]);

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', type: 'academic', description: '', head_id: '' });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      type: dept.type,
      description: dept.description || '',
      head_id: dept.head_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('error', 'Department name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim(),
        head_id: formData.head_id || null,
      };

      if (editingDept) {
        await updateDepartment(editingDept.id, payload);
        showNotification('success', t('departments.updatedSuccess'));

        if (user) {
          logActivity(user.id, 'department_updated', 'department', editingDept.id, {
            name: payload.name,
            type: payload.type,
          });
        }
      } else {
        const data = await createDepartment(payload);
        showNotification('success', t('departments.addedSuccess'));

        if (user && data) {
          logActivity(user.id, 'department_created', 'department', data.id, {
            name: payload.name,
            type: payload.type,
          });
        }
      }

      setShowModal(false);
      loadDepartments();
    } catch (_error: unknown) {
      showNotification('error', (_error as Error).message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    const empCount = dept.employees?.[0]?.count || 0;
    if (empCount > 0) {
      showNotification('error', `Cannot delete "${dept.name}" — it has ${empCount} employee(s). Reassign them first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${dept.name}"?`)) return;

    try {
      await deleteDepartment(dept.id);
      showNotification('success', t('departments.deletedSuccess'));

      if (user) {
        logActivity(user.id, 'department_deleted', 'department', dept.id, {
          name: dept.name,
        });
      }

      loadDepartments();
    } catch (_error: unknown) {
      showNotification('error', (_error as Error).message || 'Failed to delete department');
    }
  };

  const getHeadName = (headId: string | null) => {
    if (!headId) return t('departments.notAssigned');
    const emp = employees.find((e) => e.id === headId);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
  };

  return {
    departments,
    loading,
    showModal,
    setShowModal,
    editingDept,
    employees,
    submitting,
    formData,
    setFormData,
    isAdminOrHR,
    openAddModal,
    openEditModal,
    handleSubmit,
    handleDelete,
    getHeadName,
  };
}
