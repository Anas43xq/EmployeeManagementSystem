import { supabase } from './supabase';
import type { EmployeeBasic, EmployeeWithNumber } from './types';

export async function fetchActiveEmployees(includeNumber?: boolean): Promise<EmployeeBasic[] | EmployeeWithNumber[]> {
  if (includeNumber) {
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_number')
      .eq('status', 'active')
      .order('first_name');

    if (error) {
      console.error('Error loading employees:', error);
      return [];
    }
    return (data || []) as EmployeeWithNumber[];
  } else {
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('first_name');

    if (error) {
      console.error('Error loading employees:', error);
      return [];
    }
    return (data || []) as EmployeeBasic[];
  }
}
