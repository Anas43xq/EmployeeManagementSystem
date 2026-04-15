import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { getManagedUsers, getEmployeesWithoutUserAccess } from '../../services/users';
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
      const data = await getManagedUsers();
      setUsers(data);
    } catch (_error) {
      showNotification('error', t('userManagement.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeesWithoutAccess = async () => {
    try {
      const data = await getEmployeesWithoutUserAccess();
      setEmployeesWithoutAccess(data);
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
      user.employees?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employees?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employees?.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    hr: users.filter(u => u.role === 'hr').length,
    employees: users.filter(u => u.role === 'staff').length,
    withoutAccess: employeesWithoutAccess.length,
    banned: users.filter(u => u.bannedAt).length,
    inactive: users.filter(u => u.isActive === false).length,
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
