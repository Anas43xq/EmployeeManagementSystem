import { useTranslation } from 'react-i18next';
import { X, Edit2 } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Edit2 className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">{t('userManagement.editRole')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-4 space-y-4">
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
              <p className="text-sm text-gray-700">{selectedUser.employees?.employee_number}</p>
            </div>
            {selectedUser.employees?.departments && (
              <div>
                <span className="text-xs text-gray-500">{t('userManagement.department')}</span>
                <p className="text-sm text-gray-700">{selectedUser.employees.departments.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('userManagement.role')}</label>
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
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || isOwnAccount}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
            >
              {submitting ? t('common.saving') : t('userManagement.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
