import { useTranslation } from 'react-i18next';
import type { Department, EmployeeFormData } from './types';

interface EmploymentDetailsSectionProps {
  formData: EmployeeFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  departments: Department[];
}

export default function EmploymentDetailsSection({ formData, onChange, departments }: EmploymentDetailsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('employees.employmentDetails')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.department')} <span className="text-red-500">*</span>
          </label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">{t('employees.selectDepartment')}</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.position')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.employmentType')} <span className="text-red-500">*</span>
          </label>
          <select
            name="employment_type"
            value={formData.employment_type}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="full-time">{t('employees.fullTime')}</option>
            <option value="part-time">{t('employees.partTime')}</option>
            <option value="contract">{t('employees.contract')}</option>
            <option value="intern">{t('employees.intern')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.status')} <span className="text-red-500">*</span>
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
            <option value="on-leave">{t('employees.onLeave')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.hireDate')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="hire_date"
            value={formData.hire_date}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.salary')}</label>
          <input
            type="number"
            name="salary"
            value={formData.salary}
            onChange={onChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
