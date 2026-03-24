import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractError, getErrorMessage, logError } from '../../services/errorHandler';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { logActivity } from '../../services/activityLog';
import {
  grantUserAccess,
  updateManagedUserRole,
  revokeManagedUserAccess,
  requestManagedUserPasswordReset,
} from '../../services/users';
import type { User, EmployeeWithoutAccess, GrantAccessFormData, EditUserFormData, BanUserFormData } from './types';
import { getUserEmail } from './types';
import { banUser, unbanUser, deactivateUser, activateUser } from './userStatusApi';

interface UseUserActionsOptions {
  employeesWithoutAccess: EmployeeWithoutAccess[];
  loadUsers: () => Promise<void>;
  loadEmployeesWithoutAccess: () => Promise<void>;
}

type ModalType = 'grantAccess' | 'edit' | 'revokeAccess' | 'resetPassword' | 'ban' | 'unban' | null;

/** Manages user-access modals and account administration actions for user management. */
export function useUserActions({ employeesWithoutAccess, loadUsers, loadEmployeesWithoutAccess }: UseUserActionsOptions) {
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  // --- Modal state (consolidated) ---
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Form state ---
  const [grantAccessForm, setGrantAccessForm] = useState<GrantAccessFormData>({
    employeeId: '',
    password: '',
    role: 'staff',
  });

  const [editForm, setEditForm] = useState<EditUserFormData>({
    role: 'staff',
  });

  const [banForm, setBanForm] = useState<BanUserFormData>({
    banDuration: '24',
    reason: '',
  });

  // --- Modal openers (set activeModal instead of individual booleans) ---
  const openGrantAccessModal = () => {
    setActiveModal('grantAccess');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({ role: user.role });
    setActiveModal('edit');
  };

  const openRevokeAccessModal = (user: User) => {
    setSelectedUser(user);
    setActiveModal('revokeAccess');
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setActiveModal('resetPassword');
  };

  const openBanModal = (user: User) => {
    setSelectedUser(user);
    setBanForm({ banDuration: '24', reason: '' });
    setActiveModal('ban');
  };

  const openUnbanModal = (user: User) => {
    setSelectedUser(user);
    setActiveModal('unban');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
  };

  // --- Action handlers ---
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedEmployee = employeesWithoutAccess.find(
      emp => emp.id === grantAccessForm.employeeId
    );

    if (!selectedEmployee) {
      showNotification('error', t('userManagement.employeeNotFound'));
      return;
    }

    setSubmitting(true);
    try {
      const data = await grantUserAccess({
        email: selectedEmployee.email,
        password: grantAccessForm.password,
        role: grantAccessForm.role,
        employeeId: selectedEmployee.id,
      });

      showNotification('success', t('userManagement.accessGrantedSuccess'));
      if (data.user && currentUser) {
        logActivity(currentUser.id, 'user_access_granted', 'user', data.user.id, {
          employee_id: grantAccessForm.employeeId,
          employee_email: selectedEmployee.email,
          role: grantAccessForm.role,
        });
      }

      closeModal();
      setGrantAccessForm({ employeeId: '', password: '', role: 'staff' });
      loadUsers();
      loadEmployeesWithoutAccess();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleGrantAccess');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToGrantAccess')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      await updateManagedUserRole(selectedUser.id, editForm.role);

      showNotification('success', t('userManagement.userUpdated'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_role_changed', 'user', selectedUser.id, {
          employee_email: getUserEmail(selectedUser),
          old_role: selectedUser.role,
          new_role: editForm.role,
        });
      }

      closeModal();
      loadUsers();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleEditUser');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToUpdate')));
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
      await revokeManagedUserAccess(selectedUser.id);

      showNotification('success', t('userManagement.accessRevoked'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_access_revoked', 'user', selectedUser.id, {
          employee_email: getUserEmail(selectedUser),
          employee_name: `${selectedUser.employees.firstName} ${selectedUser.employees.lastName}`,
        });
      }

      closeModal();
      loadUsers();
      loadEmployeesWithoutAccess();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleRevokeAccess');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToUpdate')));
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
      await requestManagedUserPasswordReset(userEmail, `${appUrl}/reset-password`);

      showNotification('success', t('userManagement.resetEmailSent'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_password_reset', 'user', selectedUser.id, {
          email: userEmail,
        });
      }

      closeModal();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleResetPassword');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToResetPassword')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      showNotification('error', t('userManagement.cannotBanSelf'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await banUser(selectedUser.id, banForm.banDuration, banForm.reason);

      if (!result.success) {
        throw new Error(result.error);
      }

      showNotification('success', t('userManagement.userBanned'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_banned', 'user', selectedUser.id, {
          employee_email: getUserEmail(selectedUser),
          ban_duration: banForm.banDuration,
          reason: banForm.reason,
        });
      }

      closeModal();
      loadUsers();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleBanUser');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToBan')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const result = await unbanUser(selectedUser.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      showNotification('success', t('userManagement.userUnbanned'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_unbanned', 'user', selectedUser.id, {
          employee_email: getUserEmail(selectedUser),
        });
      }

      closeModal();
      loadUsers();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleUnbanUser');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToUnban')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      showNotification('error', t('userManagement.cannotDeactivateSelf'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await deactivateUser(user.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      showNotification('success', t('userManagement.userDeactivated'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_deactivated', 'user', user.id, {
          employee_email: getUserEmail(user),
        });
      }

      loadUsers();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleDeactivateUser');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToDeactivate')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateUser = async (user: User) => {
    setSubmitting(true);
    try {
      const result = await activateUser(user.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      showNotification('success', t('userManagement.userActivated'));

      if (currentUser) {
        logActivity(currentUser.id, 'user_activated', 'user', user.id, {
          employee_email: getUserEmail(user),
        });
      }

      loadUsers();
    } catch (_error: unknown) {
      logError(extractError(_error), 'useUserActions.handleActivateUser');
      showNotification('error', getErrorMessage(_error, t('userManagement.failedToActivate')));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // Modal state (consolidated)
    activeModal,
    selectedUser,
    submitting,
    showPassword,
    setShowPassword,
    // Form state
    grantAccessForm,
    setGrantAccessForm,
    editForm,
    setEditForm,
    banForm,
    setBanForm,
    currentUserId: currentUser?.id,
    // Modal openers
    openGrantAccessModal,
    openEditModal,
    openRevokeAccessModal,
    openResetPasswordModal,
    openBanModal,
    openUnbanModal,
    closeModal,
    // Action handlers
    handleGrantAccess,
    handleEditUser,
    handleRevokeAccess,
    handleResetPassword,
    handleBanUser,
    handleUnbanUser,
    handleDeactivateUser,
    handleActivateUser,
  };
}
