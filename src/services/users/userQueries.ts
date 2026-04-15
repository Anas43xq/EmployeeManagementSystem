import { db } from '../supabase';
import type { User, EmployeeWithoutAccess } from '../../pages/UserManagement/types';

interface RawUserRecord {
  id: string;
  role: User['role'];
  employee_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  last_sign_in_at?: string | null;
  employees: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    position: string;
    department_id: string | null;
    departments?: User['employees']['departments'] | null;
  } | null;
}

interface RawEmployeeRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  position: string;
  status: EmployeeWithoutAccess['status'];
  departments: { name: string } | null;
}

type GrantUserAccessRequest = {
  email: string;
  password: string;
  role: User['role'];
  employeeId: string;
};

type GrantUserAccessResponse = {
  success: boolean;
  user?: { id: string };
  message?: string;
  error?: string;
  details?: string;
};

const mapUser = (raw: RawUserRecord): User => ({
  id: raw.id,
  role: raw.role,
  employeeId: raw.employee_id ?? '',
  createdAt: raw.created_at ?? '',
  updatedAt: raw.updated_at ?? '',
  isActive: raw.is_active,
  bannedAt: raw.banned_at,
  banReason: raw.ban_reason,
  lastSignInAt: raw.last_sign_in_at ?? undefined,
  employees: {
    id: raw.employees?.id ?? '',
    email: raw.employees?.email ?? '',
    firstName: raw.employees?.first_name ?? '',
    lastName: raw.employees?.last_name ?? '',
    employeeNumber: raw.employees?.employee_number ?? '',
    position: raw.employees?.position ?? '',
    departmentId: raw.employees?.department_id ?? '',
    departments: raw.employees?.departments ?? undefined,
  },
});

const mapEmployee = (raw: RawEmployeeRecord): EmployeeWithoutAccess => ({
  id: raw.id,
  email: raw.email,
  firstName: raw.first_name,
  lastName: raw.last_name,
  employeeNumber: raw.employee_number,
  position: raw.position,
  status: raw.status,
  departments: raw.departments,
});

export async function getManagedUsers(): Promise<User[]> {
  const { data, error } = await db
    .from('users')
    .select(`
      *,
      employees!inner (
        id,
        email,
        first_name,
        last_name,
        employee_number,
        position,
        department_id,
        departments!employees_department_id_fkey (
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((record) => mapUser(record as RawUserRecord));
}

export async function getEmployeesWithoutUserAccess(): Promise<EmployeeWithoutAccess[]> {
  const { data: allEmployees, error: empError } = await db
    .from('employees')
    .select(`
      id,
      email,
      first_name,
      last_name,
      employee_number,
      position,
      status,
      departments!employees_department_id_fkey (
        name
      )
    `)
    .eq('status', 'active')
    .order('first_name');

  if (empError) throw empError;

  const { data: usersData, error: usersError } = await db
    .from('users')
    .select('employee_id');

  if (usersError) throw usersError;

  const employeesWithAccess = new Set(
    (usersData || []).map((u: { employee_id: string }) => u.employee_id)
  );

  return (allEmployees || [])
    .filter((emp): emp is RawEmployeeRecord => !employeesWithAccess.has(emp.id))
    .map(mapEmployee);
}

const getGrantUserAccessFunctionUrl = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }
  return `${supabaseUrl}/functions/v1/grant-user-access`;
};

const buildGrantUserAccessPayload = (request: GrantUserAccessRequest) => ({
  email: request.email.trim(),
  password: request.password.trim(),
  role: request.role.trim(),
  employee_id: request.employeeId.trim(),
});

export async function grantUserAccess(request: GrantUserAccessRequest): Promise<GrantUserAccessResponse> {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  if (!request.email?.trim()) {
    throw new Error('Email is required');
  }
  if (!request.password || !request.password.trim()) {
    console.error('[grantUserAccess] Password validation failed:', {
      password: request.password,
      trimmed: request.password?.trim(),
    });
    throw new Error('Password is required and cannot be empty');
  }
  if (!request.role?.trim()) {
    throw new Error('Role is required');
  }
  if (!request.employeeId?.trim()) {
    throw new Error('Employee ID is required');
  }

  const requestBody = buildGrantUserAccessPayload(request);
  const functionUrl = getGrantUserAccessFunctionUrl();

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json()) as GrantUserAccessResponse;

    if (!response.ok) {
      console.error('[grantUserAccess] Edge function HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        error: data?.error,
        details: data?.details,
      });
      throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (!data?.success) {
      console.error('[grantUserAccess] Edge function returned error:', {
        error: data?.error,
        details: data?.details,
        received: data,
      });
      throw new Error(data?.error || 'Failed to grant access');
    }

    return data;
  } catch (error) {
    console.error('[grantUserAccess] Request failed:', {
      message: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : typeof error,
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function updateManagedUserRole(userId: string, role: User['role']): Promise<void> {
  const { error } = await db
    .from('users')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function revokeManagedUserAccess(userId: string): Promise<void> {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }
  
  const functionUrl = `${supabaseUrl}/functions/v1/revoke-user-access`;
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[revokeManagedUserAccess] Error response:', errorData);
    throw new Error(errorData.error || `Failed to revoke user access: ${response.statusText}`);
  }
}

export async function requestManagedUserPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export interface ManageUserStatusResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: unknown;
}

async function invokeManageUserStatus(request: {
  action: 'ban' | 'unban' | 'deactivate' | 'activate' | 'get-status';
  userId: string;
  banDuration?: string;
  reason?: string;
}): Promise<ManageUserStatusResult> {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return { success: false, error: 'Supabase URL not configured' };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/manage-user-status`;

    const requestBody = {
      action: request.action,
      userId: request.userId,
      ...(request.banDuration ? { banDuration: request.banDuration } : {}),
      ...(request.reason ? { reason: request.reason } : {}),
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: request.action === 'get-status'
          ? 'User management service is not available.'
          : 'User management service is not available. Please contact your administrator.',
      };
    }

    return data as ManageUserStatusResult;
  } catch (_error: unknown) {
    return {
      success: false,
      error: (_error as Error).message || `Failed to ${request.action} user`,
    };
  }
}

export function banManagedUser(userId: string, banDuration: string, reason?: string) {
  return invokeManageUserStatus({ action: 'ban', userId, banDuration, reason });
}

export function unbanManagedUser(userId: string) {
  return invokeManageUserStatus({ action: 'unban', userId });
}

export function deactivateManagedUser(userId: string) {
  return invokeManageUserStatus({ action: 'deactivate', userId });
}

export function activateManagedUser(userId: string) {
  return invokeManageUserStatus({ action: 'activate', userId });
}

export function getManagedUserStatus(userId: string) {
  return invokeManageUserStatus({ action: 'get-status', userId });
}