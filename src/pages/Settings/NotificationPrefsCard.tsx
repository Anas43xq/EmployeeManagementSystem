import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';

interface NotificationPrefsCardProps {
  notificationPrefs: {
    leave_approvals: boolean;
    attendance_reminders: boolean;
    warnings: boolean;
    tasks: boolean;
    complaints: boolean;
  };
  setNotificationPrefs: React.Dispatch<React.SetStateAction<{
    leave_approvals: boolean;
    attendance_reminders: boolean;
    warnings: boolean;
    tasks: boolean;
    complaints: boolean;
  }>>;
  savingPrefs: boolean;
  onSave: () => void;
}

export default function NotificationPrefsCard({
  notificationPrefs,
  setNotificationPrefs,
  savingPrefs,
  onSave,
}: NotificationPrefsCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bell className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-bold text-gray-900">{t('settings.notifications')}</h2>
      </div>
      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notificationPrefs.leave_approvals}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, leave_approvals: e.target.checked }))}
            className="rounded text-primary-900 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('settings.leaveApprovals')}</span>
        </label>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notificationPrefs.attendance_reminders}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, attendance_reminders: e.target.checked }))}
            className="rounded text-primary-900 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('settings.attendanceReminders')}</span>
        </label>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notificationPrefs.warnings}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, warnings: e.target.checked }))}
            className="rounded text-primary-900 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('settings.emailWarnings')}</span>
        </label>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notificationPrefs.tasks}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, tasks: e.target.checked }))}
            className="rounded text-primary-900 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('settings.emailTasks')}</span>
        </label>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notificationPrefs.complaints}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, complaints: e.target.checked }))}
            className="rounded text-primary-900 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('settings.emailComplaints')}</span>
        </label>
        <button
          onClick={onSave}
          disabled={savingPrefs}
          className="mt-6 bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
        >
          {savingPrefs ? t('common.saving') : t('settings.savePreferences')}
        </button>
      </div>
    </div>
  );
}
