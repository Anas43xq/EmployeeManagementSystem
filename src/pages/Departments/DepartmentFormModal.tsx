import { useTranslation } from 'react-i18next';
import { Modal, Button, FormField } from '../../components/ui';
import type { Department, DepartmentForm, Employee } from './types';

interface DepartmentFormModalProps {
  show: boolean;
  onClose: () => void;
  editingDept: Department | null;
  formData: DepartmentForm;
  setFormData: React.Dispatch<React.SetStateAction<DepartmentForm>>;
  employees: Employee[];
  departments: Department[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export default function DepartmentFormModal({
  show,
  onClose,
  editingDept,
  formData,
  setFormData,
  employees,
  departments,
  onSubmit,
  submitting,
}: DepartmentFormModalProps) {
  const { t } = useTranslation();

  const availableEmployees = employees.filter((emp) => {
    const isHeadOfOtherDept = departments.some(
      (dept) => dept.head_id === emp.id && dept.id !== editingDept?.id
    );
    return !isHeadOfOtherDept;
  });

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        {editingDept ? t('departments.editDepartment') : t('departments.addDepartment')}
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <FormField label={t('departments.departmentName')} required>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('departments.eComputerScience')}
            />
          </FormField>
          <FormField label={t('departments.type')} required>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="academic">{t('departments.academic')}</option>
              <option value="administrative">{t('departments.administrative')}</option>
            </select>
          </FormField>
          <FormField label={t('departments.description')}>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('departments.briefDescription')}
            />
          </FormField>
          <FormField label={t('departments.departmentHead')}>
            <select
              value={formData.head_id}
              onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">{t('departments.notAssigned')}</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={submitting} loadingText={t('common.saving')}>
            {editingDept ? t('common.save') : t('departments.addDepartment')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
