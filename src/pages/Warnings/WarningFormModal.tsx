import { useTranslation } from 'react-i18next';
import { Modal, Button } from '../../components/ui';
import type { WarningFormData, WarningSeverity } from './types';
import type { EmployeeBasic } from '../../types';

interface WarningFormModalProps {
  show: boolean;
  onClose: () => void;
  formData: WarningFormData;
  setFormData: React.Dispatch<React.SetStateAction<WarningFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  employees: (EmployeeBasic & { employee_number: string })[];
}

export default function WarningFormModal({
  show,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
  employees,
}: WarningFormModalProps) {
  const { t } = useTranslation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const severities: WarningSeverity[] = ['minor', 'moderate', 'major', 'critical'];

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <Modal.Header onClose={onClose}>
        {t('warnings.issueWarning')}
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('warnings.employee')} <span className="text-red-500">*</span>
            </label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('warnings.selectEmployee')}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('warnings.severityLabel')} <span className="text-red-500">*</span>
            </label>
            <select
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {severities.map(severity => (
                <option key={severity} value={severity}>
                  {t(`warnings.severity.${severity}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('warnings.reason')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('warnings.reasonPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('warnings.descriptionPlaceholder')}
            />
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-700">
              {t('warnings.notificationNote')}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            {submitting ? t('common.saving') : t('warnings.issueWarning')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
