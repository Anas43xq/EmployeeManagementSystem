import { useTranslation } from 'react-i18next';
import { User, Edit2, Save, X } from 'lucide-react';
import { AuthUser } from '../../contexts/AuthContext';

interface ProfileInfoCardProps {
  user: AuthUser | null;
  isEditingEmail: boolean;
  setIsEditingEmail: (value: boolean) => void;
  newEmail: string;
  setNewEmail: (value: string) => void;
  updatingEmail: boolean;
  onEmailUpdate: () => void;
  onCancelEdit: () => void;
}

export default function ProfileInfoCard({
  user,
  isEditingEmail,
  setIsEditingEmail,
  newEmail,
  setNewEmail,
  updatingEmail,
  onEmailUpdate,
  onCancelEdit,
}: ProfileInfoCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <User className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-bold text-gray-900">{t('settings.profileInfo')}</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.email')}</label>
          <div className="flex items-center space-x-2">
            {isEditingEmail ? (
              <>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('settings.enterNewEmail')}
                />
                <button
                  onClick={onEmailUpdate}
                  disabled={updatingEmail}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm">{updatingEmail ? t('common.saving') : t('common.save')}</span>
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={updatingEmail}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="flex items-center space-x-1 px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm">{t('common.edit')}</span>
                </button>
              </>
            )}
          </div>
          {isEditingEmail && (
            <div className="text-xs mt-2 space-y-1">
              <p className="text-primary-600 font-medium">
                {t('settings.confirmationNote')}
              </p>
              <p className="text-gray-500">
                {t('settings.redirectNote')} <span className="font-mono bg-gray-100 px-1 rounded">{import.meta.env.VITE_APP_URL || window.location.origin}/settings</span>
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.role')}</label>
          <input
            type="text"
            value={user?.role}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
          />
        </div>
      </div>
    </div>
  );
}
