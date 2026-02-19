import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';

export default function ChangePasswordCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('error', t('settings.allFieldsRequired', 'All fields are required'));
      return;
    }

    if (newPassword.length < 8) {
      showNotification('error', t('resetPassword.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('error', t('resetPassword.passwordsMismatch'));
      return;
    }

    setLoading(true);
    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        showNotification('error', t('settings.currentPasswordIncorrect', 'Current password is incorrect'));
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await supabase.auth.signOut();
      navigate('/login', { state: { successMessage: t('settings.passwordChanged', 'Password changed successfully!') } });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showNotification('error', error.message || t('resetPassword.failedToChange'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Lock className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-bold text-gray-900">{t('settings.changePassword')}</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.currentPassword')}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.newPassword')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.confirmNewPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          {loading ? t('common.saving') : t('settings.updatePassword')}
        </button>
      </div>
    </div>
  );
}
