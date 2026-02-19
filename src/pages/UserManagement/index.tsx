import { useTranslation } from 'react-i18next';
import { UserPlus, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { PageSpinner, PageHeader, Button } from '../../components/ui';
import { useUserManagement } from './useUserManagement';
import UserStatsCards from './UserStatsCards';
import UserFilters from './UserFilters';
import UsersTable from './UsersTable';
import GrantAccessModal from './GrantAccessModal';
import EditUserModal from './EditUserModal';
import RevokeAccessModal from './RevokeAccessModal';
import ResetPasswordModal from './ResetPasswordModal';
import BanUserModal from './BanUserModal';
import UnbanUserModal from './UnbanUserModal';

export default function UserManagement() {
  const { t } = useTranslation();
  const {
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
    showBanModal,
    setShowBanModal,
    showUnbanModal,
    setShowUnbanModal,
    selectedUser,
    submitting,
    showPassword,
    setShowPassword,
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
    filteredUsers,
    stats,
  } = useUserManagement();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'hr':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Shield className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'hr':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
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
              setGrantAccessForm({ employee_id: '', password: '', role: 'staff' });
              setShowGrantAccessModal(true);
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

      <GrantAccessModal
        show={showGrantAccessModal}
        onClose={() => setShowGrantAccessModal(false)}
        employeesWithoutAccess={employeesWithoutAccess}
        formData={grantAccessForm}
        setFormData={setGrantAccessForm}
        onSubmit={handleGrantAccess}
        submitting={submitting}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />

      <EditUserModal
        show={showEditModal}
        selectedUser={selectedUser}
        currentUserId={currentUserId}
        formData={editForm}
        setFormData={setEditForm}
        onSubmit={handleEditUser}
        onClose={() => setShowEditModal(false)}
        submitting={submitting}
      />

      <RevokeAccessModal
        show={showRevokeAccessModal}
        selectedUser={selectedUser}
        onRevoke={handleRevokeAccess}
        onClose={() => setShowRevokeAccessModal(false)}
        submitting={submitting}
      />

      <ResetPasswordModal
        show={showResetPasswordModal}
        selectedUser={selectedUser}
        onReset={handleResetPassword}
        onClose={() => setShowResetPasswordModal(false)}
        submitting={submitting}
      />

      <BanUserModal
        show={showBanModal}
        user={selectedUser}
        form={banForm}
        onFormChange={setBanForm}
        onConfirm={handleBanUser}
        onCancel={() => setShowBanModal(false)}
        submitting={submitting}
      />

      <UnbanUserModal
        show={showUnbanModal}
        user={selectedUser}
        onConfirm={handleUnbanUser}
        onCancel={() => setShowUnbanModal(false)}
        submitting={submitting}
      />
    </div>
  );
}
