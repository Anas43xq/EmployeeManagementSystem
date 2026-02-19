import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageSpinner, PageHeader, Card, Button, Modal } from '../components/ui';
import type { EmployeeListItem } from '../lib/types';

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: EmployeeListItem | null; hasAccess: boolean }>({
    open: false,
    employee: null,
    hasAccess: false,
  });
  const [deleting, setDeleting] = useState(false);
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments!employees_department_id_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees((data || []) as EmployeeListItem[]);
    } catch (error) {
      console.error('Error loading employees:', error);
      showNotification('error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = async (employee: EmployeeListItem) => {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('employee_id', employee.id)
      .maybeSingle();

    setDeleteModal({
      open: true,
      employee,
      hasAccess: !!data,
    });
  };

  const handleDelete = async () => {
    if (!deleteModal.employee) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', deleteModal.employee.id);

      if (error) throw error;

      showNotification('success', t('employees.deletedSuccess'));
      setDeleteModal({ open: false, employee: null, hasAccess: false });
      loadEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      showNotification('error', error.message || t('employees.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

    const matchesEmploymentType = employmentTypeFilter === 'all' || emp.employment_type === employmentTypeFilter;

    return matchesSearch && matchesStatus && matchesEmploymentType;
  });

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

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('employees.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('employees.allStatus')}</option>
              <option value="active">{t('employees.active')}</option>
              <option value="inactive">{t('employees.inactive')}</option>
              <option value="on-leave">{t('employees.onLeave')}</option>
            </select>
            <select
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('employees.allTypes')}</option>
              <option value="full-time">{t('employees.fullTime')}</option>
              <option value="part-time">{t('employees.partTime')}</option>
              <option value="contract">{t('employees.contract')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('employees.employee')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('employees.department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('employees.position')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('employees.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('employees.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('employees.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                      <div className="text-xs text-gray-400">{employee.employee_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.departments?.name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.position}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {employee.employment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      employee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : employee.status === 'on-leave'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Link to={`/employees/${employee.id}`} className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link to={`/employees/${employee.id}/edit`} className="text-gray-600 hover:text-gray-900">
                        <Edit className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => openDeleteModal(employee)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('employees.noEmployeesFound')}</p>
          </div>
        )}
      </Card>

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
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, employee: null, hasAccess: false })}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
