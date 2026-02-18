import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLog';
import { useTranslation } from 'react-i18next';
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

  useEffect(() => {
    loadDepartments();
    if (isAdminOrHR) loadEmployees();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await (supabase
        .from('departments') as any)
        .select(`
          *,
          employees!employees_department_id_fkey (count)
        `)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      showNotification('error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await (supabase
        .from('employees') as any)
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

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
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim(),
        head_id: formData.head_id || null,
      };

      if (editingDept) {
        const { error } = await (supabase
          .from('departments') as any)
          .update(payload)
          .eq('id', editingDept.id);

        if (error) throw error;
        showNotification('success', t('departments.updatedSuccess'));

        if (user) {
          logActivity(user.id, 'department_updated', 'department', editingDept.id, {
            name: payload.name,
            type: payload.type,
          });
        }
      } else {
        const { data, error } = await (supabase
          .from('departments') as any)
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
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
    } catch (error: any) {
      console.error('Error saving department:', error);
      showNotification('error', error.message || 'Failed to save department');
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
      const { error } = await (supabase
        .from('departments') as any)
        .delete()
        .eq('id', dept.id);

      if (error) throw error;
      showNotification('success', t('departments.deletedSuccess'));

      if (user) {
        logActivity(user.id, 'department_deleted', 'department', dept.id, {
          name: dept.name,
        });
      }

      loadDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      showNotification('error', error.message || 'Failed to delete department');
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
