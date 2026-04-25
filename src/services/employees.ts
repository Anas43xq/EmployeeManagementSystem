



import { db } from '../lib/db';
import type { EmployeeFormData } from '../types/pages';
import { extractCore, extractProfile } from '../utils/employeeMappers';

type EmployeeWritePayload = Omit<EmployeeFormData, 'employee_number' | 'date_of_birth' | 'salary'> & {
  date_of_birth: string | null;
  salary: number | null;
  updated_at: string;
};

type EmployeeUpdatePayload = Record<string, unknown> & {
  updated_at: string;
};


export async function getNextEmployeeNumber(): Promise<string> {
  const { data, error } = await db
    .from('employees')
    .select('employee_number')
    .order('employee_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    
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


export async function getEmployeeById(employeeId: string): Promise<Record<string, unknown> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('employee_full')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
}


export async function createEmployee(
  data: EmployeeWritePayload
): Promise<{ id: string; employee_number: string }> {
  const coreData = extractCore(data);
  const profileData = extractProfile(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newEmployee, error } = await (db.from('employees') as any)
    .insert([coreData])
    .select('id, employee_number')
    .single();

  if (error) throw error;

  if (Object.keys(profileData).length > 0) {
    profileData.employee_id = newEmployee.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (db as any).from('employee_profiles')
      .insert([profileData]);
    if (profileError) throw profileError;
  }

  return newEmployee;
}


export async function updateEmployee(
  employeeId: string,
  data: EmployeeUpdatePayload
): Promise<void> {
  const coreData = extractCore(data);
  const profileData = extractProfile(data);

  if (Object.keys(coreData).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from('employees') as any)
      .update(coreData)
      .eq('id', employeeId);
    if (error) throw error;
  }

  if (Object.keys(profileData).length > 0) {
    profileData.employee_id = employeeId;
    if (data.updated_at) profileData.updated_at = data.updated_at;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('employee_profiles')
      .upsert(profileData, { onConflict: 'employee_id' });
    if (error) throw error;
  }
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






import { extractError } from '../lib/errorHandler';
import type { DatabaseClient } from '../types/interfaces';
import type { EmployeeBasic, EmployeeListItem, EmployeeWithNumber } from '../types';
import { dbClient } from '../lib/db';
import { supabase } from './supabase';

/**
 * Fetch active employees
 * @param dbClient - Database client (injected, can be swapped for testing)
 * @param includeNumber - Whether to include employee number
 */
export async function fetchActiveEmployees(
  _dbClient: DatabaseClient,
  includeNumber?: boolean,
): Promise<EmployeeBasic[] | EmployeeWithNumber[]> {
  const { data, error } = await (supabase as any)
    .from('employee_full')
    .select('*')
    .order('first_name', { ascending: true });

  if (error) {
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((emp: Record<string, unknown>) =>
    includeNumber
      ? {
          id: emp.id as string,
          first_name: emp.first_name as string,
          last_name: emp.last_name as string,
          employee_number: emp.employee_number as string,
        }
      : {
          id: emp.id as string,
          first_name: emp.first_name as string,
          last_name: emp.last_name as string,
        }
  );
}


export async function fetchActiveEmployeesWithDefaults(includeNumber?: boolean) {
  return fetchActiveEmployees(dbClient, includeNumber);
}

export async function getEmployeeIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await dbClient.select({
    from: 'users',
    columns: 'employee_id',
    filters: [{ column: 'id', operator: 'eq', value: userId }],
    limit: 1,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const userRecord = data[0] as { employee_id?: string | null };
  return userRecord.employee_id ?? null;
}

export async function getEmployeeProfileById(employeeId: string) {
  const { data, error } = await dbClient.raw(async (client: unknown) => {
    const queryClient = client as {
      from(table: string): {
        select(columns: string): {
          eq(column: string, value: string): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };

    const response = await queryClient
      .from('employees')
      .select('*, employee_profiles(*), departments(name)')
      .eq('id', employeeId)
      .maybeSingle();

    let mappedData = response.data as any;
    if (mappedData) {
      const { employee_profiles, ...rest } = mappedData;
      mappedData = { ...rest, ...(employee_profiles || {}) };
    }

    return {
      data: mappedData,
      error: response.error ? extractError(response.error) : null,
    };
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getEmployeeNameById(employeeId: string): Promise<string | null> {
  const { data, error } = await dbClient.select({
    from: 'employee_full',
    columns: 'first_name, last_name',
    filters: [{ column: 'id', operator: 'eq', value: employeeId }],
    limit: 1,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const employee = data[0] as { first_name?: string; last_name?: string };
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim();
  return fullName || null;
}

export async function getUserAccountIdForEmployee(employeeId: string): Promise<string | null> {
  const { data, error } = await dbClient.select({
    from: 'users',
    columns: 'id',
    filters: [{ column: 'employee_id', operator: 'eq', value: employeeId }],
    limit: 1,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return (data[0] as { id?: string }).id ?? null;
}

export async function getEmployeesWithDepartments(): Promise<EmployeeListItem[]> {
  const { data, error } = await dbClient.raw(async (client: unknown) => {
    const queryClient = client as {
      from(table: string): {
        select(columns: string): {
          order(column: string, options: { ascending: boolean }): Promise<{ data: unknown; error: unknown }>;
        };
      };
    };

    const response = await queryClient
      .from('employees')
      .select(`
        *,
        employee_profiles(phone),
        departments(name)
      `)
      .order('created_at', { ascending: false });

    const mappedData = (response.data as any[])?.map((emp) => {
      const { employee_profiles, ...rest } = emp;
      return { ...rest, phone: employee_profiles?.phone || '' };
    });

    return {
      data: mappedData,
      error: response.error ? extractError(response.error) : null,
    };
  });

  if (error) throw error;
  return (data || []) as EmployeeListItem[];
}

export async function deactivateEmployee(employeeId: string): Promise<void> {
  const { error } = await dbClient.update({
    table: 'employees',
    data: { status: 'inactive' },
    filters: [{ column: 'id', operator: 'eq', value: employeeId }],
  });

  if (error) throw error;
}

