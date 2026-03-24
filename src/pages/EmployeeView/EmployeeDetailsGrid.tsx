import { useTranslation } from 'react-i18next';
import { Mail, Phone, Calendar, MapPin, Briefcase, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Card, StatusBadge } from '../../components/ui';
import type { Employee } from '../../types';

interface Props {
  employee: Employee;
}

/** Renders the employee detail sections shown on the employee view page. */
export function EmployeeDetailsGrid({ employee }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('employees.personalInfo')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.employeeNumber')}</label>
              <p className="text-gray-900">{employee.employee_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.email')}</label>
              <div className="flex items-center text-gray-900">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <a href={`mailto:${employee.email}`} className="hover:text-primary-600">{employee.email}</a>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.phone')}</label>
              <div className="flex items-center text-gray-900">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <a href={`tel:${employee.phone}`} className="hover:text-primary-600">
                  {employee.phone || t('common.na')}
                </a>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.dateOfBirth')}</label>
              <div className="flex items-center text-gray-900">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                {employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PPP') : t('common.na')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.gender')}</label>
              <p className="text-gray-900 capitalize">{employee.gender || t('common.na')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.address')}</label>
              <div className="flex items-start text-gray-900">
                <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                <div>
                  <p>{employee.address || t('common.na')}</p>
                  {(employee.city || employee.state || employee.postal_code) && (
                    <p className="text-sm text-gray-600">
                      {[employee.city, employee.state, employee.postal_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            {t('employees.employmentDetails')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.department')}</label>
              <p className="text-gray-900">{employee.departments?.name || t('common.na')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.position')}</label>
              <p className="text-gray-900">{employee.position}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.employmentType')}</label>
              <StatusBadge status={employee.employment_type} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.status')}</label>
              <StatusBadge status={employee.status} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.hireDate')}</label>
              <p className="text-gray-900">{format(new Date(employee.hire_date), 'PPP')}</p>
            </div>
            {employee.termination_date && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.terminationDate')}</label>
                <p className="text-gray-900">{format(new Date(employee.termination_date), 'PPP')}</p>
              </div>
            )}
          </div>
        </Card>

        {employee.qualifications && employee.qualifications.length > 0 && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              {t('employees.qualifications')}
            </h2>
            <div className="space-y-3">
              {employee.qualifications.map((qual, index) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                  <p className="font-medium text-gray-900">{qual.degree}</p>
                  <p className="text-sm text-gray-600">{qual.institution}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('employees.emergencyContact')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('common.name')}</label>
              <p className="text-gray-900">{employee.emergency_contact_name || t('common.na')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.phone')}</label>
              <div className="flex items-center text-gray-900">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                {employee.emergency_contact_phone ? (
                  <a href={`tel:${employee.emergency_contact_phone}`} className="hover:text-primary-600">
                    {employee.emergency_contact_phone}
                  </a>
                ) : (
                  t('common.na')
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('employees.quickStats')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">{t('employees.yearsOfService')}</span>
              <span className="font-semibold text-gray-900">
                {(() => {
                  const hire = new Date(employee.hire_date);
                  const now = new Date();
                  let years = now.getFullYear() - hire.getFullYear();
                  const monthDiff = now.getMonth() - hire.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < hire.getDate())) years--;
                  return Math.max(0, years);
                })()} {t('employees.years')}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">{t('employees.employmentStatus')}</span>
              <StatusBadge status={employee.status} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
