import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { logActivity } from '../../lib/activityLog';
import type { User, EmployeeWithoutAccess, GrantAccessFormData, EditUserFormData } from './types';
import { getUserEmail } from './types';

export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [employeesWithoutAccess, setEmployeesWithoutAccess] = useState<EmployeeWithoutAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevokeAccessModal, setShowRevokeAccessModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  const [grantAccessForm, setGrantAccessForm] = useState<GrantAccessFormData>({
    employee_id: '',
    password: '',
    role: 'staff',
  });

  const [editForm, setEditForm] = useState<EditUserFormData>({
    role: 'staff',
  });

  useEffect(() => {
    loadUsers();
    loadEmployeesWithoutAccess();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
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
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('error', t('userManagement.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeesWithoutAccess = async () => {
    try {
      const { data: allEmployees, error: empError } = await supabase
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

      const { data: usersData } = await supabase
        .from('users')
        .select('employee_id');
      
      const employeesWithAccess = new Set(
        (usersData || []).map((u: { employee_id: string }) => u.employee_id)
      );

      const withoutAccess = (allEmployees || []).filter(
        (emp: EmployeeWithoutAccess) => !employeesWithAccess.has(emp.id)
      );
      
      setEmployeesWithoutAccess(withoutAccess);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!grantAccessForm.employee_id || !grantAccessForm.password) {
      showNotification('error', t('userManagement.selectEmployeeAndPassword'));
      return;
    }

    if (grantAccessForm.password.length < 6) {
      showNotification('error', t('userManagement.passwordMinLength'));
      return;
    }

    const selectedEmployee = employeesWithoutAccess.find(
      emp => emp.id === grantAccessForm.employee_id
    );
    
    if (!selectedEmployee) {
      showNotification('error', t('userManagement.employeeNotFound'));
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: selectedEmployee.email,
        password: grantAccessForm.password,
        options: {
          data: {
            role: grantAccessForm.role,
          },
        },
      });

      if (authError) throw authError;

      await new Promise(resolve => setTimeout(resolve, 500));

      if (authData.user) {
        await (supabase
          .from('users') as any)
          .update({ role: grantAccessForm.role })
          .eq('id', authData.user.id);
      }

      showNotification('success', t('userManagement.accessGrantedSuccess'));
      
      if (authData.user && currentUser) {
        logActivity(currentUser.id, 'user_access_granted', 'user', authData.user.id, {
          employee_id: grantAccessForm.employee_id,
          employee_email: selectedEmployee.email,
          role: grantAccessForm.role,
        });
      }

      setShowGrantAccessModal(false);
      setGrantAccessForm({ employee_id: '', password: '', role: 'staff' });
      loadUsers();
      loadEmployeesWithoutAccess();
    } catch (error: any) {
      console.error('Error granting access:', error);
      showNotification('error', error.message || t('userManagement.failedToGrantAccess'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const { error } = await (supabase
        .from('users') as any)
        .update({
          role: editForm.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      showNotification('success', t('userManagement.userUpdated'));
      
      if (currentUser) {
        logActivity(currentUser.id, 'user_role_changed', 'user', selectedUser.id, {
          employee_email: getUserEmail(selectedUser),
          old_role: selectedUser.role,
          new_role: editForm.role,
        });
      }

      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      showNotification('error', error.message || t('userManagement.failedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      showNotification('error', t('userManagement.cannotRevokeSelf'));
      return;
    }

    setSubmitting(true);
    try {
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (dbError) throw dbError;

      showNotification('success', t('userManagement.accessRevoked'));
      
      if (currentUser) {
        logActivity(currentUser.id, 'user_access_revoked', 'user', selectedUser.id, {
          employee_email: getUserEmail(selectedUser),
          employee_name: `${selectedUser.employees.first_name} ${selectedUser.employees.last_name}`,
        });
      }

      setShowRevokeAccessModal(false);
      setSelectedUser(null);
      loadUsers();
      loadEmployeesWithoutAccess();
    } catch (error: any) {
      console.error('Error revoking access:', error);
      showNotification('error', error.message || t('userManagement.failedToRevokeAccess'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const userEmail = getUserEmail(selectedUser);
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) throw error;

      showNotification('success', t('userManagement.resetEmailSent'));
      
      if (currentUser) {
        logActivity(currentUser.id, 'user_password_reset', 'user', selectedUser.id, {
          email: userEmail,
        });
      }

      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      showNotification('error', error.message || t('userManagement.failedToResetPassword'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({ role: user.role });
    setShowEditModal(true);
  };

  const openRevokeAccessModal = (user: User) => {
    setSelectedUser(user);
    setShowRevokeAccessModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

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
  };

  return {
    users,
    employeesWithoutAccess,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    showGrantAccessModal,
    setShowGrantAccessModal,
    showEditModal,
    setShowEditModal,
    showRevokeAccessModal,
    setShowRevokeAccessModal,
    showResetPasswordModal,
    setShowResetPasswordModal,
    selectedUser,
    setSelectedUser,
    submitting,
    showPassword,
    setShowPassword,
    grantAccessForm,
    setGrantAccessForm,
    editForm,
    setEditForm,
    currentUserId: currentUser?.id,

    loadUsers,
    loadEmployeesWithoutAccess,
    handleGrantAccess,
    handleEditUser,
    handleRevokeAccess,
    handleResetPassword,
    openEditModal,
    openRevokeAccessModal,
    openResetPasswordModal,

    filteredUsers,
    stats,
  };
}
