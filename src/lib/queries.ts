import { supabase } from './supabase';
import type { EmployeeBasic, EmployeeWithNumber } from './types';

export async function fetchActiveEmployees(includeNumber?: boolean): Promise<EmployeeBasic[] | EmployeeWithNumber[]> {
  const fields = includeNumber ? 'id, first_name, last_name, employee_number' : 'id, first_name, last_name';
  const { data, error } = await supabase
    .from('employees')
    .select(fields)
    .eq('status', 'active')
    .order('first_name');

  if (error) {
    console.error('Error loading employees:', error);
    return [];
  }
  return data || [];
}
