/**
 * Employee query service
 * Priority 1: SOLID - Dependency Inversion (accepts dbClient parameter, no direct imports)
 */

import { extractError } from '../errorHandler';
import type { DatabaseClient } from '../../types/interfaces';
import type { EmployeeBasic, EmployeeListItem, EmployeeWithNumber } from '../../types';
import { dbClient } from '../shared/dbClient';
import { supabase } from '../supabase';

/**
 * Fetch active employees
 * @param dbClient - Database client (injected, can be swapped for testing)
 * @param includeNumber - Whether to include employee number
 */
export async function fetchActiveEmployees(
  _dbClient: DatabaseClient,
  includeNumber?: boolean,
): Promise<EmployeeBasic[] | EmployeeWithNumber[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('first_name', { ascending: true });

  if (error) {
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((emp: any) =>
    includeNumber
      ? {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          employee_number: emp.employee_number,
        }
      : {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
        }
  );
}

/**
 * Convenience export for backward compatibility
 * Uses global dbClient instance
 */
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
  const { data, error } = await dbClient.raw(async (client) => {
    const queryClient = client as {
      from(table: 'employees'): {
        select(columns: string): {
          eq(column: string, value: string): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };

    const response = await queryClient
      .from('employees')
      .select('*, departments!department_id (name)')
      .eq('id', employeeId)
      .maybeSingle();

    return {
      data: response.data,
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
    from: 'employees',
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
  const { data, error } = await dbClient.raw(async (client) => {
    const queryClient = client as {
      from(table: 'employees'): {
        select(columns: string): {
          order(column: string, options: { ascending: boolean }): Promise<{ data: unknown; error: unknown }>;
        };
      };
    };

    const response = await queryClient
      .from('employees')
      .select(`
        *,
        departments!employees_department_id_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false });

    return {
      data: response.data,
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
