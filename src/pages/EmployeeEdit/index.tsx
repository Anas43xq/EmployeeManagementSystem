import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save } from 'lucide-react';
import { PageSpinner, Button } from '../../components/ui';
import { useEmployeeEdit } from './useEmployeeEdit';
import PersonalInfoSection from './PersonalInfoSection';
import EmploymentDetailsSection from './EmploymentDetailsSection';
import EmergencyContactSection from './EmergencyContactSection';

export default function EmployeeEdit() {
  const { t } = useTranslation();
  const {
    id,
    loading,
    saving,
    departments,
    formData,
    handleChange,
    handlePhotoChange,
    handleSubmit,
  } = useEmployeeEdit();

  if (loading) {
    return <PageSpinner />;
  }

  const isNewEmployee = !id || id === 'new';
  const backLink = isNewEmployee ? '/employees' : `/employees/${id}`;
  const title = isNewEmployee ? t('employees.addNewEmployee') : t('employees.editEmployee');
  const subtitle = isNewEmployee ? t('employees.createNewEmployee') : t('employees.updateInfo');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to={backLink}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PersonalInfoSection 
          formData={formData} 
          onChange={handleChange} 
          onPhotoChange={handlePhotoChange}
          employeeId={id}
          isNewEmployee={isNewEmployee} 
        />
        <EmploymentDetailsSection formData={formData} onChange={handleChange} departments={departments} />
        <EmergencyContactSection formData={formData} onChange={handleChange} />

        <div className="flex items-center justify-end space-x-4">
          <Link
            to={backLink}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
          </Link>
          <Button type="submit" loading={saving} icon={<Save className="w-5 h-5" />}>
            {saving ? t('common.saving') : (isNewEmployee ? t('employees.createEmployee') : t('employees.saveChanges'))}
          </Button>
        </div>
      </form>
    </div>
  );
}
