

// File: departmentQueries.ts

import { db } from '../lib/db';
import type { Department } from '../types';

interface DepartmentPayload {
  name: string;
  type: string;
  description: string;
  head_id: string | null;
}

/** Fetches all departments with employee count, ordered by name. */
export async function getDepartments(): Promise<Department[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('departments') as any)
    .select(`*, employees!employees_department_id_fkey (count)`)
    .order('name');

  if (error) throw error;
  return (data || []) as Department[];
}

/** Creates a new department and returns the created record. */
export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('departments') as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Department;
}

/** Updates an existing department by ID. */
export async function updateDepartment(id: string, payload: DepartmentPayload): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('departments') as any)
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

/** Deletes a department by ID. */
export async function deleteDepartment(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('departments') as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

