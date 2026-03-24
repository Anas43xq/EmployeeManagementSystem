import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ArrowLeft, Edit, UserX } from 'lucide-react';
import { PageSpinner, Button } from '../../components/ui';
import { getEmployeeProfileById, terminateEmployeeRecord } from '../../services/employees';
import { EmployeeDetailsGrid } from './EmployeeDetailsGrid';
import { TerminateModal } from './TerminateModal';
import type { Employee } from '../../types';
import { mapEmployeeRecord } from '../../utils/employeeMappers';

export default function EmployeeView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
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

      const data = await getEmployeeProfileById(id!);

      if (!data) {
        showNotification('error', t('employees.notFound'));
        navigate('/employees');
        return;
      }

      setEmployee(mapEmployeeRecord(data));
    } catch (_error) {
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
      await terminateEmployeeRecord(employee.id);

      showNotification('success', t('employees.employeeTerminated'));
      setTerminateModal(false);
      loadEmployee(); // Reload employee data
    } catch (_error: unknown) {
      showNotification('error', (_error as Error).message || t('employees.failedToTerminate'));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/employees" className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base truncate">{employee.position}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/employees/${id}/edit`}>
            <Button icon={<Edit className="w-4 h-4" />} className="text-sm">
              <span className="hidden sm:inline">{t('employees.editEmployee')}</span>
              <span className="sm:hidden">{t('common.edit')}</span>
            </Button>
          </Link>
          {!employee.termination_date && user?.employeeId !== employee.id && (
            <Button
              variant="danger"
              icon={<UserX className="w-4 h-4" />}
              onClick={() => setTerminateModal(true)}
              className="text-sm"
            >
              <span className="hidden sm:inline">{t('employees.terminateEmployee')}</span>
              <span className="sm:hidden">{t('employees.terminate')}</span>
            </Button>
          )}
        </div>
      </div>

      <EmployeeDetailsGrid employee={employee} />

      <TerminateModal
        show={terminateModal}
        employee={employee}
        terminating={terminating}
        onClose={() => setTerminateModal(false)}
        onConfirm={handleTerminateEmployee}
      />
    </div>
  );
}

