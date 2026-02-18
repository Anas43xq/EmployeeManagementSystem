import { useTranslation } from 'react-i18next';
import { Key } from 'lucide-react';
import type { User } from './types';
import { getUserEmail } from './types';

interface ResetPasswordModalProps {
  show: boolean;
  selectedUser: User | null;
  onReset: () => void;
  onClose: () => void;
  submitting: boolean;
}

export default function ResetPasswordModal({
  show,
  selectedUser,
  onReset,
  onClose,
  submitting,
}: ResetPasswordModalProps) {
  const { t } = useTranslation();

  if (!show || !selectedUser) return null;

  const userEmail = getUserEmail(selectedUser);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('userManagement.resetPassword')}</h3>
          <p className="text-gray-600 mb-4">
            {t('userManagement.sendResetEmail')} <strong>{userEmail}</strong>?
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onReset}
              disabled={submitting}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {submitting ? t('common.sending') : t('userManagement.sendResetBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
