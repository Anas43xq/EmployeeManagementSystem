import { useTranslation } from 'react-i18next';
import { UserX, AlertTriangle } from 'lucide-react';
import type { User } from './types';
import { getUserEmail, getUserDisplayName } from './types';

interface RevokeAccessModalProps {
  show: boolean;
  selectedUser: User | null;
  onRevoke: () => void;
  onClose: () => void;
  submitting: boolean;
}

export default function RevokeAccessModal({
  show,
  selectedUser,
  onRevoke,
  onClose,
  submitting,
}: RevokeAccessModalProps) {
  const { t } = useTranslation();

  if (!show || !selectedUser) return null;

  const userEmail = getUserEmail(selectedUser);
  const userName = getUserDisplayName(selectedUser);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserX className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('userManagement.revokeAccess')}
          </h3>
          <p className="text-gray-600 mb-2">
            {t('userManagement.revokeAccessConfirm')}
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="font-medium text-gray-900">{userName}</p>
            <p className="text-sm text-gray-600">{userEmail}</p>
            <p className="text-sm text-gray-500">{selectedUser.employees?.employee_number}</p>
          </div>
          
          <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">{t('userManagement.revokeWarningTitle')}</p>
              <p>{t('userManagement.revokeWarningText')}</p>
            </div>
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onRevoke}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? t('common.processing') : t('userManagement.revokeAccessBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
