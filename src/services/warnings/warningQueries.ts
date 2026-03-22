import { db } from '../supabase';
import type { EmployeeWarning, EmployeeWarningCreate, WarningStatus } from '../../types';

export async function getWarnings(filters?: {
  employeeId?: string;
  status?: WarningStatus;
  issuedBy?: string;
}) {
  let query = db
    .from('employee_warnings')
    .select(`
      *,
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
      *,
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
