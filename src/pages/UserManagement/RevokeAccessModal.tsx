import { useTranslation } from 'react-i18next';
import { UserX, AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
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

  if (!selectedUser) return null;
  const userEmail = getUserEmail(selectedUser);
  const userName = getUserDisplayName(selectedUser);

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>{t('userManagement.revokeAccess')}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <UserX className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-600">{t('userManagement.revokeAccessConfirm')}</p>
          <div className="w-full bg-gray-50 rounded-lg p-3 text-left">
            <p className="font-medium text-gray-900">{userName}</p>
            <p className="text-sm text-gray-600">{userEmail}</p>
            <p className="text-sm text-gray-500">{selectedUser.employees?.employee_number}</p>
          </div>
          <div className="w-full flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">{t('userManagement.revokeWarningTitle')}</p>
              <p>{t('userManagement.revokeWarningText')}</p>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="button" variant="danger" onClick={onRevoke} loading={submitting} loadingText={t('common.processing')}>
          {t('userManagement.revokeAccessBtn')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
