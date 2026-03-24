import { useTranslation } from 'react-i18next';
import { Edit2 } from 'lucide-react';
import { Modal, Button, FormField } from '../../components/ui';
import type { User, EditUserFormData } from './types';
import { getUserEmail, getUserDisplayName } from './types';

interface EditUserModalProps {
  show: boolean;
  selectedUser: User | null;
  currentUserId: string | undefined;
  formData: EditUserFormData;
  setFormData: (data: EditUserFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
}

export default function EditUserModal({
  show,
  selectedUser,
  currentUserId,
  formData,
  setFormData,
  onSubmit,
  onClose,
  submitting,
}: EditUserModalProps) {
  const { t } = useTranslation();

  if (!show || !selectedUser) return null;

  const userEmail = getUserEmail(selectedUser);
  const userName = getUserDisplayName(selectedUser);
  const isOwnAccount = selectedUser.id === currentUserId;

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        <div className="flex items-center space-x-2">
          <Edit2 className="w-5 h-5 text-primary-600" />
          <span>{t('userManagement.editRole')}</span>
        </div>
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <span className="text-xs text-gray-500">{t('userManagement.employee')}</span>
              <p className="font-medium text-gray-900">{userName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">{t('userManagement.email')}</span>
              <p className="text-sm text-gray-700">{userEmail}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">{t('userManagement.employeeNumber')}</span>
              <p className="text-sm text-gray-700">{selectedUser.employees?.employeeNumber}</p>
            </div>
            {selectedUser.employees?.departments && (
              <div>
                <span className="text-xs text-gray-500">{t('userManagement.department')}</span>
                <p className="text-sm text-gray-700">{selectedUser.employees.departments.name}</p>
              </div>
            )}
          </div>
          <FormField label={t('userManagement.role')}>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'hr' | 'staff' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isOwnAccount}
            >
              <option value="staff">{t('userManagement.staff')}</option>
              <option value="hr">{t('userManagement.hr')}</option>
              <option value="admin">{t('userManagement.admin')}</option>
            </select>
            {isOwnAccount && (
              <p className="text-xs text-amber-600 mt-1">{t('userManagement.cannotChangeOwnRole')}</p>
            )}
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={isOwnAccount} loading={submitting} loadingText={t('common.saving')}>
            {t('userManagement.saveChanges')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
