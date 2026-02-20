import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { AuthUser } from '../../contexts/AuthContext';

interface AccountInfoSidebarProps {
  user: AuthUser | null;
}

export default function AccountInfoSidebar({ user }: AccountInfoSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900">{t('settings.accountInfo')}</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-600">{t('settings.accountType')}</p>
            <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('common.status')}</p>
            <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              {t('settings.active')}
            </span>
          </div>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'hr') && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
          <h3 className="font-bold text-primary-900 mb-2">{t('settings.adminAccess')}</h3>
          <p className="text-sm text-primary-800">
            {t('settings.adminAccessDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
