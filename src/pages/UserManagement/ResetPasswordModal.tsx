import { useTranslation } from 'react-i18next';
import { Key } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
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
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>{t('userManagement.resetPassword')}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Key className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-gray-600">
            {t('userManagement.sendResetEmail')} <strong>{userEmail}</strong>?
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="button" onClick={onReset} loading={submitting} loadingText={t('common.sending')}>
          {t('userManagement.sendResetBtn')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
