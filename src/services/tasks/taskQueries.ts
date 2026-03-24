import { db, supabase } from '../supabase';
import { applyFilter } from '../shared/queryUtils';
import type { EmployeeTask, EmployeeTaskCreate, TaskStatus } from '../../types';

export async function getTasks(filters?: {
  employeeId?: string;
  status?: TaskStatus;
  assignedBy?: string;
}) {
  let query = db
    .from('employee_tasks')
    .select(`
      *,
      employees!employee_tasks_employee_id_fkey (id, first_name, last_name, photo_url),
      assigned_by_user:users!employee_tasks_assigned_by_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .order('deadline', { ascending: true });

  query = applyFilter(query, 'employee_id', filters?.employeeId);
  query = applyFilter(query, 'status', filters?.status);
  query = applyFilter(query, 'assigned_by', filters?.assignedBy);

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeeTask[];
}

export async function getTaskById(id: string) {
  const { data, error } = await db
    .from('employee_tasks')
    .select(`
      *,
      employees!employee_tasks_employee_id_fkey (id, first_name, last_name, photo_url),
      assigned_by_user:users!employee_tasks_assigned_by_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as EmployeeTask;
}

export async function createTask(task: EmployeeTaskCreate, assignedBy: string) {
  const { data, error } = await db
    .from('employee_tasks')
    .insert([{ ...task, assigned_by: assignedBy }])
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeTask;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const updateData: Record<string, any> = { status }; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from('employee_tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeTask;
}

export async function updateTask(id: string, updates: Partial<EmployeeTask>) {
  const { data, error } = await db
    .from('employee_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeTask;
}

export async function deleteTask(id: string) {
  const { error } = await db
    .from('employee_tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function subscribeToTaskChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel(`tasks-realtime:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'employee_tasks',
      },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
