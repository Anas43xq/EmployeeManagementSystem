import { useTranslation } from 'react-i18next';
import type { EmployeeFormData } from './types';
import PhotoUpload from '../../components/PhotoUpload';

interface PersonalInfoSectionProps {
  formData: EmployeeFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onPhotoChange: (photoUrl: string | null) => void;
  employeeId?: string;
  isNewEmployee?: boolean;
}

export default function PersonalInfoSection({ formData, onChange, onPhotoChange, employeeId, isNewEmployee = false }: PersonalInfoSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('employees.personalInfo')}</h2>

      <div className="mb-6 flex justify-center">
        <PhotoUpload
          currentPhotoUrl={formData.photo_url || undefined}
          employeeId={employeeId || 'new'}
          onPhotoChange={onPhotoChange}
          firstName={formData.first_name}
          lastName={formData.last_name}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.employeeNumber')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="employee_number"
            value={formData.employee_number}
            onChange={onChange}
            required
            disabled={!isNewEmployee}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${isNewEmployee ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 cursor-not-allowed'}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.email')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.firstName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('employees.lastName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={onChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.phone')}</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.dateOfBirth')}</label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.gender')}</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">{t('employees.selectGender')}</option>
            <option value="male">{t('employees.male')}</option>
            <option value="female">{t('employees.female')}</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.address')}</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.city')}</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.state')}</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('employees.postalCode')}</label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
