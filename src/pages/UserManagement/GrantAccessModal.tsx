import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { Modal, Button, FormField } from '../../components/ui';
import type { EmployeeWithoutAccess, GrantAccessFormData } from './types';

interface GrantAccessModalProps {
  show: boolean;
  employees: EmployeeWithoutAccess[];
  formData: GrantAccessFormData;
  setFormData: (data: GrantAccessFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
}

export default function GrantAccessModal({
  show,
  employees,
  formData,
  setFormData,
  onSubmit,
  onClose,
  submitting,
}: GrantAccessModalProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        <div className="flex items-center space-x-2">
          <UserPlus className="w-5 h-5 text-primary-600" />
          <span>{t('userManagement.grantAccess')}</span>
        </div>
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <div className="space-y-4">
            <FormField label={t('userManagement.selectEmployee')}>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">{t('userManagement.selectEmployee')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.email})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('userManagement.initialPassword')}>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('userManagement.enterPassword')}
                minLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{t('userManagement.minimumCharacters', { count: 6 })}</p>
            </FormField>

            <FormField label={t('userManagement.role')}>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'hr' | 'staff' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="staff">{t('userManagement.staff')}</option>
                <option value="hr">{t('userManagement.hr')}</option>
              </select>
            </FormField>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.loading') : t('userManagement.grantAccess')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
