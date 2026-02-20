import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { ArrowLeft, Edit, Mail, Phone, Calendar, MapPin, Briefcase, User, FileText, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { PageSpinner, Button, Modal } from '../components/ui';
import type { Employee } from '../lib/types';

export default function EmployeeView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminateModal, setTerminateModal] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (id && id !== 'new') {
      loadEmployee();
    } else if (id === 'new') {
      navigate('/employees');
    }
  }, [id]);

  const loadEmployee = async () => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id!)) {
        showNotification('error', t('employees.invalidEmployee'));
        navigate('/employees');
        return;
      }

      const { data, error } = await db
        .from('employees')
        .select(`
          *,
          departments!department_id (name)
        `)
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        showNotification('error', t('employees.notFound'));
        navigate('/employees');
        return;
      }

      setEmployee(data as Employee);
    } catch (error) {
      showNotification('error', t('employees.failedToLoadDetails'));
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateEmployee = async () => {
    if (!employee) return;

    setTerminating(true);
    try {
      const { error } = await db
        .from('employees')
        .update({
          termination_date: new Date().toISOString().split('T')[0],
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);

      if (error) throw error;

      showNotification('success', t('employees.employeeTerminated'));
      setTerminateModal(false);
      loadEmployee(); // Reload employee data
    } catch (error: any) {
      showNotification('error', error.message || t('employees.failedToTerminate'));
    } finally {
      setTerminating(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/employees"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 mt-1">{employee.position}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/employees/${id}/edit`}>
            <Button icon={<Edit className="w-5 h-5" />}>
              {t('employees.editEmployee')}
            </Button>
          </Link>
          {!employee.termination_date && (
            <Button
              variant="danger"
              icon={<UserX className="w-5 h-5" />}
              onClick={() => setTerminateModal(true)}
            >
              {t('employees.terminateEmployee')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                  <a href={`mailto:${employee.email}`} className="hover:text-blue-600">
                    {employee.email}
                  </a>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.phone')}</label>
                <div className="flex items-center text-gray-900">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <a href={`tel:${employee.phone}`} className="hover:text-blue-600">
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
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                  {employee.employment_type}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('employees.status')}</label>
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  employee.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : employee.status === 'on-leave'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {employee.status}
                </span>
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
          </div>

          {employee.qualifications && employee.qualifications.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                {t('employees.qualifications')}
              </h2>
              <div className="space-y-3">
                {employee.qualifications.map((qual, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="font-medium text-gray-900">{qual.degree}</p>
                    <p className="text-sm text-gray-600">{qual.institution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                    <a href={`tel:${employee.emergency_contact_phone}`} className="hover:text-blue-600">
                      {employee.emergency_contact_phone}
                    </a>
                  ) : (
                    t('common.na')
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('employees.quickStats')}</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">{t('employees.yearsOfService')}</span>
                <span className="font-semibold text-gray-900">
                  {Math.floor((new Date().getTime() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))} {t('employees.years')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">{t('employees.employmentStatus')}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  employee.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : employee.status === 'on-leave'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={terminateModal}
        onClose={() => setTerminateModal(false)}
      >
        <Modal.Header onClose={() => setTerminateModal(false)}>
          {t('employees.terminateEmployeeTitle')}
        </Modal.Header>
        <Modal.Body>
        <div className="space-y-4">
          <p className="text-gray-700">
            {t('employees.terminateEmployeeConfirm').replace('this employee', `${employee.first_name} ${employee.last_name}`)}
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t('employees.terminateEmployeeWarning')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setTerminateModal(false)}
              disabled={terminating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleTerminateEmployee}
              disabled={terminating}
            >
              {terminating ? t('employees.terminating') : t('employees.terminateEmployee')}
            </Button>
          </div>
        </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

