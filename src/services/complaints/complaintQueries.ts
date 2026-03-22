import { db } from '../supabase';
import type { EmployeeComplaint, EmployeeComplaintCreate, ComplaintStatus } from '../../types';

export async function getComplaints(filters?: {
  employeeId?: string;
  status?: ComplaintStatus;
  assignedTo?: string;
}) {
  let query = db
    .from('employee_complaints')
    .select(`
      *,
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
      *,
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
  const updateData: Record<string, any> = { status }; // eslint-disable-line @typescript-eslint/no-explicit-any
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
