import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCog,
  Edit2,
  UserX,
  Mail,
  Key,
  Clock,
  Building2,
  Ban,
  UserCheck,
  UserMinus,
  UserPlus2,
  AlertCircle,
} from 'lucide-react';
import type { User } from './types';
import { getUserEmail, getUserDisplayName } from './types';

interface UsersTableProps {
  filteredUsers: User[];
  currentUserId: string | undefined;
  onEdit: (user: User) => void;
  onRevokeAccess: (user: User) => void;
  onResetPassword: (user: User) => void;
  onBan: (user: User) => void;
  onUnban: (user: User) => void;
  onDeactivate: (user: User) => void;
  onActivate: (user: User) => void;
  getRoleIcon: (role: string) => ReactNode;
  getRoleBadge: (role: string) => string;
}

export default function UsersTable({
  filteredUsers,
  currentUserId,
  onEdit,
  onRevokeAccess,
  onResetPassword,
  onBan,
  onUnban,
  onDeactivate,
  onActivate,
  getRoleIcon,
  getRoleBadge,
}: UsersTableProps) {
  const { t } = useTranslation();

  const getUserStatus = (user: User) => {
    if (user.banned_at) {
      return { status: 'banned', badge: 'bg-red-100 text-red-800', icon: Ban };
    }
    if (user.is_active === false) {
      return { status: 'inactive', badge: 'bg-gray-100 text-gray-800', icon: UserMinus };
    }
    return { status: 'active', badge: 'bg-green-100 text-green-800', icon: UserCheck };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('userManagement.employee')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('userManagement.role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('userManagement.department')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('userManagement.accessGranted')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => {
              const userEmail = getUserEmail(user);
              const userName = getUserDisplayName(user);
              const userStatus = getUserStatus(user);
              const StatusIcon = userStatus.icon;
              return (
              <tr key={user.id} className={`hover:bg-gray-50 ${user.banned_at ? 'bg-red-50/30' : user.is_active === false ? 'bg-gray-50/50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.banned_at ? 'bg-red-100' : user.is_active === false ? 'bg-gray-100' : 'bg-primary-100'}`}>
                      <span className={`font-medium ${user.banned_at ? 'text-red-900' : user.is_active === false ? 'text-gray-600' : 'text-primary-900'}`}>
                        {userName.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {userName}
                        {user.banned_at && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            <Ban className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{userEmail}</span>
                        {user.id === currentUserId && (
                          <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">{t('userManagement.you')}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.employees?.employee_number} • {user.employees?.position}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {getRoleIcon(user.role)}
                    <span>{t(`userManagement.${user.role}`)}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${userStatus.badge}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{t(`userManagement.status${userStatus.status.charAt(0).toUpperCase() + userStatus.status.slice(1)}`)}</span>
                    </span>
                    {user.ban_reason && (
                      <div className="flex items-center gap-1 text-xs text-red-600" title={user.ban_reason}>
                        <AlertCircle className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{user.ban_reason}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.employees?.departments ? (
                    <div className="flex items-center space-x-1 text-sm text-gray-700">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{user.employees.departments.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => onResetPassword(user)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={t('userManagement.resetPassword')}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={t('userManagement.editRole')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user.id !== currentUserId && (
                      <>
                        {/* Deactivate/Activate button */}
                        {!user.banned_at && (
                          user.is_active === false ? (
                            <button
                              onClick={() => onActivate(user)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('userManagement.activateUser')}
                            >
                              <UserPlus2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onDeactivate(user)}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title={t('userManagement.deactivateUser')}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )
                        )}
                        {/* Ban/Unban button */}
                        {user.banned_at ? (
                          <button
                            onClick={() => onUnban(user)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('userManagement.unbanUser')}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onBan(user)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('userManagement.banUser')}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onRevokeAccess(user)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('userManagement.revokeAccess')}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('userManagement.noUsersFound')}</p>
        </div>
      )}
    </div>
  );
}
