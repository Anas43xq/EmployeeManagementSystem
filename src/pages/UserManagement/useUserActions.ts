import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractError, getErrorMessage, logError } from '../../lib/errorHandler';
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

    // Validate form fields
    if (!grantAccessForm.employeeId || !grantAccessForm.employeeId.trim()) {
      showNotification('error', 'Please select an employee');
      return;
    }

    const passwordTrimmed = (grantAccessForm.password ?? '').trim();
    if (!passwordTrimmed || passwordTrimmed.length < 6) {
      console.warn('[handleGrantAccess] Validation failed: password too short or missing', {
        passwordTrimmedLength: passwordTrimmed.length,
      });
      showNotification('error', 'Password must be at least 6 characters long');
      return;
    }

    if (!grantAccessForm.role) {
      showNotification('error', 'Please select a role');
      return;
    }

    if (!selectedEmployee.email || !selectedEmployee.email.trim()) {
      showNotification('error', 'Employee email is missing');
      return;
    }

    setSubmitting(true);
    try {
      const data = await grantUserAccess({
        email: selectedEmployee.email.trim(),
        password: passwordTrimmed,
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

  const handleUserStatusToggle = async (
    user: User,
    action: 'ban' | 'unban' | 'deactivate' | 'activate'
  ) => {
    if ((action === 'ban' || action === 'deactivate') && user.id === currentUser?.id) {
      const errorKey =
        action === 'ban'
          ? t('userManagement.cannotBanSelf')
          : t('userManagement.cannotDeactivateSelf');
      showNotification('error', errorKey);
      return;
    }

    setSubmitting(true);
    try {
      let result: { success: boolean; error?: string };

      switch (action) {
        case 'ban':
          result = await banUser(user.id, banForm.banDuration, banForm.reason);
          break;
        case 'unban':
          result = await unbanUser(user.id);
          break;
        case 'deactivate':
          result = await deactivateUser(user.id);
          break;
        case 'activate':
          result = await activateUser(user.id);
          break;
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      const successKey =
        action === 'ban'
          ? 'userManagement.userBanned'
          : action === 'unban'
            ? 'userManagement.userUnbanned'
            : action === 'deactivate'
              ? 'userManagement.userDeactivated'
              : 'userManagement.userActivated';

      showNotification('success', t(successKey));

      if (currentUser) {
        const activityAction =
          action === 'ban'
            ? 'user_banned'
            : action === 'unban'
              ? 'user_unbanned'
              : action === 'deactivate'
                ? 'user_deactivated'
                : 'user_activated';

        const metadata =
          action === 'ban'
            ? {
                employee_email: getUserEmail(user),
                ban_duration: banForm.banDuration,
                reason: banForm.reason,
              }
            : {
                employee_email: getUserEmail(user),
              };

        logActivity(currentUser.id, activityAction, 'user', user.id, metadata);
      }

      if (action === 'ban') {
        closeModal();
      }
      loadUsers();
    } catch (_error: unknown) {
      const errorAction =
        action === 'ban'
          ? 'useUserActions.handleBanUser'
          : action === 'unban'
            ? 'useUserActions.handleUnbanUser'
            : action === 'deactivate'
              ? 'useUserActions.handleDeactivateUser'
              : 'useUserActions.handleActivateUser';
      logError(extractError(_error), errorAction);

      const errorKey =
        action === 'ban'
          ? 'userManagement.failedToBan'
          : action === 'unban'
            ? 'userManagement.failedToUnban'
            : action === 'deactivate'
              ? 'userManagement.failedToDeactivate'
              : 'userManagement.failedToActivate';

      showNotification('error', getErrorMessage(_error, t(errorKey)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    await handleUserStatusToggle(selectedUser, 'ban');
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    await handleUserStatusToggle(selectedUser, 'unban');
  };

  const handleDeactivateUser = async (user: User) => {
    await handleUserStatusToggle(user, 'deactivate');
  };

  const handleActivateUser = async (user: User) => {
    await handleUserStatusToggle(user, 'activate');
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
