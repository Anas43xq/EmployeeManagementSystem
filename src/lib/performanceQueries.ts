import { supabase } from './supabase';
import type {
  EmployeeTask,
  EmployeeTaskCreate,
  EmployeeWarning,
  EmployeeWarningCreate,
  EmployeeComplaint,
  EmployeeComplaintCreate,
  EmployeePerformance,
  EmployeeOfWeek,
  TaskStatus,
  WarningStatus,
  ComplaintStatus,
} from './types';

const db = supabase as any;


export async function getTasks(filters?: {
  employeeId?: string;
  status?: TaskStatus;
  assignedBy?: string;
}) {
  let query = db
    .from('employee_tasks')
    .select(`
      employees!employee_tasks_employee_id_fkey (id, first_name, last_name, photo_url),
      assigned_by_user:users!employee_tasks_assigned_by_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .order('deadline', { ascending: true });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignedBy) {
    query = query.eq('assigned_by', filters.assignedBy);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeeTask[];
}

export async function getTaskById(id: string) {
  const { data, error } = await db
    .from('employee_tasks')
    .select(`
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
  const updateData: Record<string, any> = { status };
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


export async function getWarnings(filters?: {
  employeeId?: string;
  status?: WarningStatus;
  issuedBy?: string;
}) {
  let query = db
    .from('employee_warnings')
    .select(`
      employees!employee_warnings_employee_id_fkey (id, first_name, last_name, photo_url),
      issued_by_user:users!employee_warnings_issued_by_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.issuedBy) {
    query = query.eq('issued_by', filters.issuedBy);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeeWarning[];
}

export async function getWarningById(id: string) {
  const { data, error } = await db
    .from('employee_warnings')
    .select(`
      employees!employee_warnings_employee_id_fkey (id, first_name, last_name, photo_url),
      issued_by_user:users!employee_warnings_issued_by_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as EmployeeWarning;
}

export async function createWarning(warning: EmployeeWarningCreate, issuedBy: string) {
  const { data, error } = await db
    .from('employee_warnings')
    .insert([{ ...warning, issued_by: issuedBy }])
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeWarning;
}

export async function acknowledgeWarning(id: string) {
  const { data, error } = await db
    .from('employee_warnings')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeWarning;
}

export async function resolveWarning(id: string, resolutionNotes: string) {
  const { data, error } = await db
    .from('employee_warnings')
    .update({
      status: 'resolved',
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeWarning;
}

export async function deleteWarning(id: string) {
  const { error } = await db
    .from('employee_warnings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


export async function getComplaints(filters?: {
  employeeId?: string;
  status?: ComplaintStatus;
  assignedTo?: string;
}) {
  let query = db
    .from('employee_complaints')
    .select(`
      employees!employee_complaints_employee_id_fkey (id, first_name, last_name, photo_url),
      assigned_user:users!employee_complaints_assigned_to_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeeComplaint[];
}

export async function getComplaintById(id: string) {
  const { data, error } = await db
    .from('employee_complaints')
    .select(`
      employees!employee_complaints_employee_id_fkey (id, first_name, last_name, photo_url),
      assigned_user:users!employee_complaints_assigned_to_fkey (
        employees (id, first_name, last_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as EmployeeComplaint;
}

export async function createComplaint(complaint: EmployeeComplaintCreate, employeeId: string) {
  const { data, error } = await db
    .from('employee_complaints')
    .insert([{ ...complaint, employee_id: employeeId }])
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeComplaint;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  updates?: { assignedTo?: string; resolutionNotes?: string; resolvedBy?: string }
) {
  const updateData: Record<string, any> = { status };
  if (updates?.assignedTo) updateData.assigned_to = updates.assignedTo;
  if (updates?.resolutionNotes) updateData.resolution_notes = updates.resolutionNotes;
  if (updates?.resolvedBy) updateData.resolved_by = updates.resolvedBy;
  if (status === 'resolved' || status === 'dismissed') {
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from('employee_complaints')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeComplaint;
}

export async function deleteComplaint(id: string) {
  const { error } = await db
    .from('employee_complaints')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


export async function getPerformanceRecords(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = db
    .from('employee_performance')
    .select(`
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, photo_url, position)
    `)
    .order('period_start', { ascending: false });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.startDate) {
    query = query.gte('period_start', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('period_end', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeePerformance[];
}

export async function getLatestPerformance(limit: number = 10) {
  const { data, error } = await db
    .from('employee_performance')
    .select(`
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, photo_url, position)
    `)
    .order('period_start', { ascending: false })
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as EmployeePerformance[];
}

export async function getTopPerformers(weekStart?: string) {
  let query = db
    .from('employee_performance')
    .select(`
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, photo_url, position)
    `);

  if (weekStart) {
    query = query.eq('period_start', weekStart);
  } else {
    const { data: latestPeriod } = await db
      .from('employee_performance')
      .select('period_start')
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (latestPeriod?.period_start) {
      query = query.eq('period_start', latestPeriod.period_start);
    }
  }

  const { data, error } = await query
    .order('total_score', { ascending: false })
    .limit(10);

  if (error) {
    return [];
  }
  return (data || []) as EmployeePerformance[];
}


export async function getEmployeeOfWeek(weekStart?: string) {
  let query = db
    .from('employee_of_week')
    .select(`
      employees (*)
    `);

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  } else {
    query = query.order('week_start', { ascending: false }).limit(1);
  }

  const { data, error } = await query;
  if (error) {
    return null;
  }
  return data?.[0] as EmployeeOfWeek | null;
}

export async function getEmployeeOfWeekHistory(limit: number = 10) {
  const { data, error } = await db
    .from('employee_of_week')
    .select(`
      employees (*)
    `)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as EmployeeOfWeek[];
}

export async function setEmployeeOfWeek(
  employeeId: string,
  weekStart: string,
  reason: string,
  selectedBy: string
) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data, error } = await db
    .from('employee_of_week')
    .upsert([{
      employee_id: employeeId,
      week_start: weekStart,
      week_end: weekEnd.toISOString().split('T')[0],
      reason,
      is_auto_selected: false,
      selected_by: selectedBy,
      score: 0,
    }], { onConflict: 'week_start' })
    .select(`
      employees (*)
    `)
    .single();

  if (error) throw error;
  return data as EmployeeOfWeek;
}


export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}


export async function createTaskNotification(
  userId: string,
  taskTitle: string,
  type: 'assigned' | 'completed' | 'overdue'
) {
  const titles: Record<string, string> = {
    assigned: 'New Task Assigned',
    completed: 'Task Completed',
    overdue: 'Task Overdue',
  };
  const messages: Record<string, string> = {
    assigned: `You have been assigned a new task: "${taskTitle}"`,
    completed: `Task "${taskTitle}" has been marked as completed`,
    overdue: `Task "${taskTitle}" is now overdue`,
  };

  await db
    .from('notifications')
    .insert([{
      user_id: userId,
      title: titles[type],
      message: messages[type],
      type: 'task',
    }]);

}

export async function createWarningNotification(userId: string, severity: string) {
  await db
    .from('notifications')
    .insert([{
      user_id: userId,
      title: 'New Warning Issued',
      message: `You have received a ${severity} warning. Please review and acknowledge it.`,
      type: 'warning',
    }]);

}

export async function createComplaintNotification(
  userId: string,
  type: 'submitted' | 'status_change',
  status?: string
) {
  const title = type === 'submitted' ? 'Complaint Submitted' : 'Complaint Status Updated';
  const message = type === 'submitted'
    ? 'Your complaint has been submitted and is under review.'
    : `Your complaint status has been updated to: ${status}`;

  await db
    .from('notifications')
    .insert([{
      user_id: userId,
      title,
      message,
      type: 'complaint',
    }]);

}
