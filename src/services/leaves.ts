import { supabase } from './supabase';
import { db } from '../lib/db';
import type { Leave, LeaveBalance, LeaveConflict } from '../types/pages';


export async function getLeaves(employeeId?: string): Promise<Leave[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db
    .from('leaves')
    .select(`*, employees (first_name, last_name, employee_number, email)`)
    .order('created_at', { ascending: false });

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}


export async function getLeaveBalance(employeeId: string, year: number): Promise<LeaveBalance | null> {
  const { data, error } = await db
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .single();

  if (error && error.code === 'PGRST116') {
    
    return null;
  }
  if (error) throw error;
  return data || null;
}


export async function createLeaveBalance(
  employeeId: string,
  year: number
): Promise<LeaveBalance> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('leave_balances') as any)
    .insert({
      employee_id: employeeId,
      year,
      annual_total: 20,
      annual_used: 0,
      sick_total: 10,
      sick_used: 0,
      casual_total: 10,
      casual_used: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}


export async function getOrCreateLeaveBalance(
  employeeId: string,
  year: number
): Promise<LeaveBalance> {
  const existing = await getLeaveBalance(employeeId, year);
  if (existing) return existing;
  return createLeaveBalance(employeeId, year);
}


export async function updateLeaveBalance(
  employeeId: string,
  year: number,
  fieldToUpdate: string,
  newValue: number
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('leave_balances') as any)
    .update({ [fieldToUpdate]: newValue })
    .eq('employee_id', employeeId)
    .eq('year', year);

  if (error) throw error;
}


export async function checkLeaveConflicts(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<LeaveConflict[]> {
  const { data, error } = await db
    .from('leaves')
    .select('id, leave_type, start_date, end_date, status')
    .eq('employee_id', employeeId)
    .in('status', ['approved', 'pending'])
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (error) throw error;

  return (
    (data || []).map((leave: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leaveData = leave as any;
      return {
        id: leaveData.id,
        leave_type: leaveData.leave_type,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
        status: leaveData.status,
      };
    }) || []
  );
}


export async function createLeave(leaveData: {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('leaves') as any).insert({
    ...leaveData,
    status: 'pending',
  });

  if (error) throw error;
}


export async function updateLeaveStatus(
  leaveId: string,
  status: 'approved' | 'rejected',
  approvedBy: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('leaves') as any)
    .update({
      status,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', leaveId)
    .eq('status', 'pending');

  if (error) throw error;
}


export async function getEmployeeForLeave(employeeId: string): Promise<{
  first_name: string;
  last_name: string;
} | null> {
  const { data, error } = await db
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .single();

  if (error && error.code === 'PGRST116') {
    return null;
  }
  if (error) throw error;
  return data;
}


export async function getUserIdForEmployee(employeeId: string): Promise<string | null> {
  const { data, error } = await db
    .from('users')
    .select('id')
    .eq('employee_id', employeeId)
    .single();

  if (error && error.code === 'PGRST116') {
    return null;
  }
  if (error) throw error;
  return data?.id || null;
}

export function subscribeToLeavesChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel(`leaves-realtime:${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToLeaveBalanceChanges(employeeId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`leave-balances-${employeeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_balances',
        filter: `employee_id=eq.${employeeId}`,
      },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

