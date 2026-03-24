import { db } from '../shared/dbClient';
import type { EmployeeFormData } from '../../pages/EmployeeEdit/types';

type EmployeeWritePayload = Omit<EmployeeFormData, 'employee_number' | 'date_of_birth' | 'salary'> & {
  date_of_birth: string | null;
  salary: number | null;
  updated_at: string;
};

type EmployeeUpdatePayload = Record<string, unknown> & {
  updated_at: string;
};

/**
 * Generates the next employee number in the EMP001, EMP002 format.
 */
export async function getNextEmployeeNumber(): Promise<string> {
  const { data, error } = await db
    .from('employees')
    .select('employee_number')
    .order('employee_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    throw error;
  }

  let preview = 'EMP001';
  if (data?.employee_number) {
    const match = (data.employee_number as string).match(/^EMP(\d+)$/);
    if (match) {
      const next = parseInt(match[1], 10) + 1;
      preview = 'EMP' + String(next).padStart(3, '0');
    }
  }
  return preview;
}

/**
 * Fetches a specific employee by ID.
 */
export async function getEmployeeById(employeeId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
}

/**
 * Creates a new employee record.
 */
export async function createEmployee(
  data: EmployeeWritePayload
): Promise<{ id: string; employee_number: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newEmployee, error } = await (db.from('employees') as any)
    .insert([data])
    .select('id, employee_number')
    .single();

  if (error) throw error;
  return newEmployee;
}

/**
 * Updates an existing employee record.
 */
export async function updateEmployee(
  employeeId: string,
  data: EmployeeUpdatePayload
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('employees') as any)
    .update(data)
    .eq('id', employeeId);

  if (error) throw error;
}

export async function terminateEmployeeRecord(employeeId: string): Promise<void> {
  await updateEmployee(employeeId, {
    termination_date: new Date().toISOString().split('T')[0],
    status: 'inactive',
    updated_at: new Date().toISOString(),
  });
}

export async function updateEmployeeProfile(
  employeeId: string,
  data: {
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  }
): Promise<void> {
  await updateEmployee(employeeId, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}
