import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase, db } from '../../services/supabase';
import {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createTaskNotification,
} from '../../services/performanceQueries';
import { notifyHRAndAdmins } from '../../services/dbNotifications';
import type { EmployeeTask, TaskStatus, TaskFormData } from './types';
import { initialTaskFormData } from './types';
import type { EmployeeBasic } from '../../types';

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
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

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

  // Real-time subscription for employee_tasks table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_tasks',
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadTasks]);

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
        
        const { data: targetUser, error: userLookupError } = await db
          .from('users')
          .select('id')
          .eq('employee_id', formData.employee_id)
          .maybeSingle() as { data: { id: string } | null; error: any };

        if (!userLookupError && targetUser) {
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
    if (processingTasks.has(taskId)) return;
    setProcessingTasks(prev => new Set(prev).add(taskId));
    try {
      const task = tasks.find(t => t.id === taskId);
      await updateTaskStatus(taskId, newStatus);
      showNotification('success', t('tasks.statusUpdated'));

      // Notify admin/HR when staff changes task status
      if (isStaff && task) {
        const statusLabel = newStatus === 'in_progress' ? 'started' : newStatus;
        const employeeName = task.employees
          ? `${task.employees.first_name} ${task.employees.last_name}`
          : 'An employee';

        await notifyHRAndAdmins(
          newStatus === 'completed' ? 'Task Completed' : 'Task Status Updated',
          `${employeeName} has ${statusLabel} the task: "${task.title}"`,
          'task',
          false
        ).catch(() => {});
      }

      loadTasks();
    } catch (error: any) {
      showNotification('error', error.message || t('tasks.statusUpdateFailed'));
    } finally {
      setProcessingTasks(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (processingTasks.has(taskId)) return;
    setProcessingTasks(prev => new Set(prev).add(taskId));
    try {
      await deleteTask(taskId);
      showNotification('success', t('tasks.deleteSuccess'));
      loadTasks();
    } catch (error: any) {
      showNotification('error', error.message || t('tasks.deleteFailed'));
    } finally {
      setProcessingTasks(prev => { const s = new Set(prev); s.delete(taskId); return s; });
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
    processingTasks,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleStatusChange,
    handleDelete,
  };
}

