import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Modal, Button, FormField } from '../../components/ui';
import type { EmployeeWithoutAccess, GrantAccessFormData } from './types';

interface GrantAccessModalProps {
  show: boolean;
  onClose: () => void;
  employeesWithoutAccess: EmployeeWithoutAccess[];
  formData: GrantAccessFormData;
  setFormData: (data: GrantAccessFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

export default function GrantAccessModal({
  show,
  onClose,
  employeesWithoutAccess,
  formData,
  setFormData,
  onSubmit,
  submitting,
  showPassword,
  setShowPassword,
}: GrantAccessModalProps) {
  const { t } = useTranslation();

  const selectedEmployee = employeesWithoutAccess.find(
    emp => emp.id === formData.employee_id
  );

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
          <FormField label={t('userManagement.selectEmployee')}>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">{t('userManagement.chooseEmployee')}</option>
              {employeesWithoutAccess.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_number})
                </option>
              ))}
            </select>
            {employeesWithoutAccess.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{t('userManagement.allEmployeesHaveAccess')}</p>
            )}
          </FormField>

          {selectedEmployee && (
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-sm text-primary-800">
                <strong>{t('userManagement.email')}:</strong> {selectedEmployee.email}
              </p>
              <p className="text-sm text-primary-800">
                <strong>{t('userManagement.position')}:</strong> {selectedEmployee.position}
              </p>
              {selectedEmployee.departments && (
                <p className="text-sm text-primary-800">
                  <strong>{t('userManagement.department')}:</strong> {selectedEmployee.departments.name}
                </p>
              )}
            </div>
          )}

          <FormField label={t('userManagement.password')}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                required
                minLength={6}
                placeholder={t('userManagement.enterPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('userManagement.minChars')}</p>
          </FormField>

          <FormField label={t('userManagement.role')}>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'hr' | 'staff' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="staff">{t('userManagement.staff')}</option>
              <option value="hr">{t('userManagement.hr')}</option>
              <option value="admin">{t('userManagement.admin')}</option>
            </select>
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={!formData.employee_id} loading={submitting} loadingText={t('common.processing')}>
            {t('userManagement.grantAccessBtn')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
