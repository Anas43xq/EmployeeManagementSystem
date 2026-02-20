import { useTranslation } from 'react-i18next';
import { CheckCircle, UserCheck } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import type { User } from './types';
import { getUserEmail, getUserDisplayName } from './types';

interface UnbanUserModalProps {
  show: boolean;
  user: User | null;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function UnbanUserModal({
  show,
  user,
  onConfirm,
  onCancel,
  submitting,
}: UnbanUserModalProps) {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <Modal
      show={show}
      onClose={onCancel}
      size="md"
    >
      <Modal.Header onClose={onCancel}>
        {t('userManagement.unbanUser')}
      </Modal.Header>
      <Modal.Body>
        <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              {t('userManagement.unbanConfirmation')}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {t('userManagement.unbanConfirmText')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('userManagement.userToUnban')}
          </label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{getUserDisplayName(user)}</p>
            <p className="text-sm text-gray-500">{getUserEmail(user)}</p>
            {user.ban_reason && (
              <p className="text-sm text-red-600 mt-2">
                <span className="font-medium">{t('userManagement.banReason')}:</span> {user.ban_reason}
              </p>
            )}
            {user.banned_at && (
              <p className="text-xs text-gray-400 mt-1">
                {t('userManagement.bannedOn')}: {new Date(user.banned_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          disabled={submitting}
          icon={<UserCheck className="w-4 h-4" />}
        >
          {submitting ? t('common.saving') : t('userManagement.unbanUserBtn')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
