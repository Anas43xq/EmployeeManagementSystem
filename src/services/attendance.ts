



import { db } from '../lib/db';
import type { AttendanceRecord } from '../types/pages';
import type { EmployeeWithNumber as Employee } from '../types';


export async function getAttendanceEmployees(): Promise<Employee[]> {
  const { data, error } = await db
    .from('employees')
    .select('id, first_name, last_name, employee_number')
    .eq('status', 'active')
    .order('first_name');

  if (error) throw error;
  return data || [];
}


export async function getAttendanceRecords(
  date: string,
  employeeId?: string
): Promise<AttendanceRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db
    .from('attendance')
    .select(
      `
        *,
        employees (
          first_name,
          last_name,
          employee_number
        )
      `
    )
    .eq('date', date)
    .order('created_at', { ascending: false });

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}


export async function checkAttendanceExists(
  employeeId: string,
  date: string
): Promise<{ id: string; check_in: string | null } | null> {
  const { data, error } = await db
    .from('attendance')
    .select('id, check_in')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}


export async function markAttendance(
  employeeId: string,
  date: string,
  checkInTime: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('attendance') as any).insert({
    employee_id: employeeId,
    date,
    check_in: checkInTime,
    status: 'present',
  });

  if (error) throw error;
}


export async function updateCheckOut(
  recordId: string,
  employeeId: string,
  checkOutTime: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('attendance') as any)
    .update({ check_out: checkOutTime })
    .eq('id', recordId)
    .eq('employee_id', employeeId);

  if (error) throw error;
}


export async function createAttendanceRecord(data: {
  employee_id: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('attendance') as any).insert({
    employee_id: data.employee_id,
    date: data.date,
    check_in: data.check_in || null,
    check_out: data.check_out || null,
    status: data.status,
    notes: data.notes || null,
  });

  if (error) throw error;
}


export async function attendanceRecordExists(
  employeeId: string,
  date: string
): Promise<boolean> {
  const { data, error } = await db
    .from('attendance')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

