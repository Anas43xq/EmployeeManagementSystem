import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useUserActions } from './useUserActions';
import type { User, EmployeeWithoutAccess } from './types';
import { getUserEmail } from './types';

export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [employeesWithoutAccess, setEmployeesWithoutAccess] = useState<EmployeeWithoutAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  useEffect(() => {
    loadUsers();
    loadEmployeesWithoutAccess();
  }, []);

  const loadUsers = async () => {
    try {
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
      setUsers((data || []) as User[]);
    } catch (_error) {
      showNotification('error', t('userManagement.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeesWithoutAccess = async () => {
    try {
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

      const { data: usersData } = await db
        .from('users')
        .select('employee_id');

      const employeesWithAccess = new Set(
        (usersData || []).map((u: { employee_id: string }) => u.employee_id)
      );

      const withoutAccess = (allEmployees || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (emp: unknown) => !employeesWithAccess.has((emp as any).id)
      ) as EmployeeWithoutAccess[];

      setEmployeesWithoutAccess(withoutAccess);
    } catch {
      // silent
    }
  };

  // --- Actions hook ---
  const actions = useUserActions({
    employeesWithoutAccess,
    loadUsers,
    loadEmployeesWithoutAccess,
  });

  // --- Filtered users ---
  const filteredUsers = users.filter(user => {
    const userEmail = getUserEmail(user);
    const matchesSearch =
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employees?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employees?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employees?.employee_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    hr: users.filter(u => u.role === 'hr').length,
    employees: users.filter(u => u.role === 'staff').length,
    withoutAccess: employeesWithoutAccess.length,
    banned: users.filter(u => u.banned_at).length,
    inactive: users.filter(u => u.is_active === false).length,
  };

  return {
    users,
    employeesWithoutAccess,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    stats,
    loadUsers,
    loadEmployeesWithoutAccess,
    ...actions,
  };
}
