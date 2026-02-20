import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { db } from '../../lib/supabase';
import {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createTaskNotification,
} from '../../lib/performanceQueries';
import type { EmployeeTask, TaskStatus, TaskFormData } from './types';
import { initialTaskFormData } from './types';
import type { EmployeeBasic } from '../../lib/types';

export function useTasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [employees, setEmployees] = useState<(EmployeeBasic & { employee_number: string })[]>([]);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(initialTaskFormData);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);

  const isStaff = user?.role === 'staff';

  const loadTasks = useCallback(async () => {
    try {
      const filters = isStaff && user?.employeeId ? { employeeId: user.employeeId } : undefined;
      const data = await getTasks(filters);
      setTasks(data);
    } catch (error) {
      showNotification('error', t('tasks.loadFailed'));
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
    loadTasks();
    loadEmployees();
  }, [loadTasks, loadEmployees]);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const handleOpenModal = (task?: EmployeeTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        employee_id: task.employee_id,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        deadline: task.deadline,
        points: task.points,
        penalty_points: task.penalty_points,
      });
    } else {
      setEditingTask(null);
      setFormData(initialTaskFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData(initialTaskFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          deadline: formData.deadline,
          points: formData.points,
          penalty_points: formData.penalty_points,
        });

        showNotification('success', t('tasks.updateSuccess'));
      } else {
        await createTask(formData, user.id);
        
        const { data: targetUser } = await db
          .from('users')
          .select('id')
          .eq('employee_id', formData.employee_id)
          .maybeSingle() as { data: { id: string } | null };

        if (targetUser) {
          await createTaskNotification(targetUser.id, formData.title, 'assigned');
        }

        showNotification('success', t('tasks.createSuccess'));
      }

      handleCloseModal();
      loadTasks();
    } catch (error: any) {
      showNotification('error', error.message || t('tasks.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      showNotification('success', t('tasks.statusUpdated'));
      loadTasks();
    } catch (error: any) {
      showNotification('error', error.message || t('tasks.statusUpdateFailed'));
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      showNotification('success', t('tasks.deleteSuccess'));
      loadTasks();
    } catch (error: any) {
      showNotification('error', error.message || t('tasks.deleteFailed'));
    }
  };

  return {
    loading,
    tasks: filteredTasks,
    employees,
    filter,
    setFilter,
    showModal,
    setShowModal,
    formData,
    setFormData,
    submitting,
    editingTask,
    isStaff,
    user,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleStatusChange,
    handleDelete,
  };
}

