import { useTranslation } from 'react-i18next';
import { UserPlus, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { PageSpinner, PageHeader, Button } from '../../components/ui';
import { useUserManagement } from './useUserManagement';
import UserStatsCards from './UserStatsCards';
import UserFilters from './UserFilters';
import UsersTable from './UsersTable';
import EditUserModal from './EditUserModal';
import GrantAccessModal from './GrantAccessModal';
import RevokeAccessModal from './RevokeAccessModal';
import ResetPasswordModal from './ResetPasswordModal';
import BanUserModal from './BanUserModal';
import UnbanUserModal from './UnbanUserModal';

export default function UserManagement() {
  const { t } = useTranslation();
  const {
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    activeModal,
    selectedUser,
    submitting,
    grantAccessForm,
    setGrantAccessForm,
    editForm,
    setEditForm,
    banForm,
    setBanForm,
    currentUserId,
    loadUsers,
    loadEmployeesWithoutAccess,
    handleGrantAccess,
    handleEditUser,
    handleRevokeAccess,
    handleResetPassword,
    handleBanUser,
    handleUnbanUser,
    handleDeactivateUser,
    handleActivateUser,

    openEditModal,
    openRevokeAccessModal,
    openResetPasswordModal,
    openBanModal,
    openUnbanModal,
    openGrantAccessModal,
    closeModal,
    filteredUsers,
    stats,
    employeesWithoutAccess,
  } = useUserManagement();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'hr':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Shield className="w-4 h-4 text-primary-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'hr':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-primary-100 text-primary-800';
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('userManagement.title')}
        subtitle={t('userManagement.subtitleNew')}
        action={
          <Button
            onClick={() => {
              setGrantAccessForm({ employeeId: '', password: '', role: 'staff' });
              openGrantAccessModal();
            }}
            icon={<UserPlus className="w-5 h-5" />}
            disabled={employeesWithoutAccess.length === 0}
          >
            {t('userManagement.grantAccess')}
          </Button>
        }
      />

      <UserStatsCards stats={stats} />

      <UserFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        onRefresh={() => { loadUsers(); loadEmployeesWithoutAccess(); }}
      />

      <UsersTable
        filteredUsers={filteredUsers}
        currentUserId={currentUserId}
        onEdit={openEditModal}
        onRevokeAccess={openRevokeAccessModal}
        onResetPassword={openResetPasswordModal}
        onBan={openBanModal}
        onUnban={openUnbanModal}
        onDeactivate={handleDeactivateUser}
        onActivate={handleActivateUser}
        getRoleIcon={getRoleIcon}
        getRoleBadge={getRoleBadge}
      />


      <EditUserModal
        show={activeModal === 'edit'}
        selectedUser={selectedUser}
        currentUserId={currentUserId}
        formData={editForm}
        setFormData={setEditForm}
        onSubmit={handleEditUser}
        onClose={closeModal}
        submitting={submitting}
      />

      <GrantAccessModal
        show={activeModal === 'grantAccess'}
        employees={employeesWithoutAccess}
        formData={grantAccessForm}
        setFormData={setGrantAccessForm}
        onSubmit={handleGrantAccess}
        onClose={closeModal}
        submitting={submitting}
      />

      <RevokeAccessModal
        show={activeModal === 'revokeAccess'}
        selectedUser={selectedUser}
        onRevoke={handleRevokeAccess}
        onClose={closeModal}
        submitting={submitting}
      />

      <ResetPasswordModal
        show={activeModal === 'resetPassword'}
        selectedUser={selectedUser}
        onReset={handleResetPassword}
        onClose={closeModal}
        submitting={submitting}
      />

      <BanUserModal
        show={activeModal === 'ban'}
        user={selectedUser}
        form={banForm}
        onFormChange={setBanForm}
        onConfirm={handleBanUser}
        onCancel={closeModal}
        submitting={submitting}
      />

      <UnbanUserModal
        show={activeModal === 'unban'}
        user={selectedUser}
        onConfirm={handleUnbanUser}
        onCancel={closeModal}
        submitting={submitting}
      />
    </div>
  );
}
