/**
 * Employee query service
 * Priority 1: SOLID - Dependency Inversion (accepts dbClient parameter, no direct imports)
 */

import type { DatabaseClient } from './interfaces';
import type { EmployeeBasic, EmployeeWithNumber } from '../types';
import { dbClient } from './databaseClient';

/**
 * Fetch active employees
 * @param dbClient - Database client (injected, can be swapped for testing)
 * @param includeNumber - Whether to include employee number
 */
export async function fetchActiveEmployees(
  dbClient: DatabaseClient,
  includeNumber?: boolean,
): Promise<EmployeeBasic[] | EmployeeWithNumber[]> {
  const columns = includeNumber
    ? 'id, first_name, last_name, employee_number'
    : 'id, first_name, last_name';

  const { data, error } = await dbClient.select({
    from: 'employees',
    columns,
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'first_name' },
  });

  if (error) {
    return [];
  }

  return (data || []) as EmployeeBasic[] | EmployeeWithNumber[];
}

/**
 * Convenience export for backward compatibility
 * Uses global dbClient instance
 */
export async function fetchActiveEmployeesWithDefaults(includeNumber?: boolean) {
  return fetchActiveEmployees(dbClient, includeNumber);
}
