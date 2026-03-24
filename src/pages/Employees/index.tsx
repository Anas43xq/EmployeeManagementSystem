import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { Plus, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageSpinner, PageHeader, Button, Modal } from '../../components/ui';
import { logActivity } from '../../services/activityLog';
import {
  getEmployeesWithDepartments,
  getUserAccountIdForEmployee,
  deactivateEmployee,
} from '../../services/employees';
import type { EmployeeListItem } from '../../types';
import { EmployeeTableCard } from './EmployeeTableCard';

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: EmployeeListItem | null; hasAccess: boolean }>({
    open: false,
    employee: null,
    hasAccess: false,
  });
  const [deleting, setDeleting] = useState(false);
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setEmployees(await getEmployeesWithDepartments());
    } catch (_error) {
      showNotification('error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = async (employee: EmployeeListItem) => {
    setDeleteModal({
      open: true,
      employee,
      hasAccess: !!(await getUserAccountIdForEmployee(employee.id)),
    });
  };

  const handleDelete = async () => {
    if (!deleteModal.employee) return;

    setDeleting(true);
    try {
      await deactivateEmployee(deleteModal.employee.id);

      showNotification('success', t('employees.deletedSuccess'));
      if (user) {
        logActivity(user.id, 'employee_deleted', 'employee', deleteModal.employee.id, {
          name: `${deleteModal.employee.first_name} ${deleteModal.employee.last_name}`,
          employee_number: deleteModal.employee.employee_number,
        });
      }
      setDeleteModal({ open: false, employee: null, hasAccess: false });
      loadEmployees();
    } catch (_error: unknown) {
      showNotification('error', (_error as Error).message || t('employees.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.subtitle')}
        action={
          <Link to="/employees/new">
            <Button icon={<Plus className="w-5 h-5" />}>
              {t('employees.addEmployee')}
            </Button>
          </Link>
        }
      />

      <EmployeeTableCard employees={employees} onDeleteClick={openDeleteModal} />

      <Modal
        show={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, employee: null, hasAccess: false })}
      >
        <Modal.Header onClose={() => setDeleteModal({ open: false, employee: null, hasAccess: false })}>
          {t('employees.confirmDeleteTitle')}
        </Modal.Header>
        <Modal.Body>
          {deleteModal.employee && (
            <div className="space-y-4">
              <p className="text-gray-700">
                {t('employees.confirmDeleteMessage', {
                  name: `${deleteModal.employee.first_name} ${deleteModal.employee.last_name}`,
                })}
              </p>
              {deleteModal.hasAccess && (
                <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">{t('employees.hasAccessWarningTitle')}</p>
                    <p className="text-sm text-amber-700">{t('employees.hasAccessWarningMessage')}</p>
                  </div>
                </div>
              )}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{t('employees.deleteWarning')}</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteModal({ open: false, employee: null, hasAccess: false })}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

