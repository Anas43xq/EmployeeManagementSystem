import { useTranslation } from 'react-i18next';
import { Globe, Shield } from 'lucide-react';
import i18n from '../../i18n';
import { useSettings } from './useSettings';
import ProfileInfoCard from './ProfileInfoCard';
import ChangePasswordCard from './ChangePasswordCard';
import NotificationPrefsCard from './NotificationPrefsCard';

export default function Settings() {
  const { t } = useTranslation();
  const {
    user,
    isEditingEmail,
    setIsEditingEmail,
    newEmail,
    setNewEmail,
    updatingEmail,
    notificationPrefs,
    setNotificationPrefs,
    savingPrefs,
    handleSavePreferences,
    handleEmailUpdate,
    handleCancelEdit,
  } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-2">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProfileInfoCard
            user={user}
            isEditingEmail={isEditingEmail}
            setIsEditingEmail={setIsEditingEmail}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            updatingEmail={updatingEmail}
            onEmailUpdate={handleEmailUpdate}
            onCancelEdit={handleCancelEdit}
          />
          <ChangePasswordCard />
          <NotificationPrefsCard
            notificationPrefs={notificationPrefs}
            setNotificationPrefs={setNotificationPrefs}
            savingPrefs={savingPrefs}
            onSave={handleSavePreferences}
          />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">{t('settings.language')}</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t('settings.languageDesc')}</p>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
        </div>

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
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {t('settings.active')}
                </span>
              </div>
            </div>
          </div>

          {(user?.role === 'admin' || user?.role === 'hr') && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <h3 className="font-bold text-primary-900 mb-2">{t('settings.adminAccess')}</h3>
              <p className="text-sm text-primary-800">{t('settings.adminAccessDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

