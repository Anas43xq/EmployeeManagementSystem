import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Edit, Trash2, Eye } from 'lucide-react';
import { Card, StatusBadge } from '../../components/ui';
import type { EmployeeListItem } from '../../types';

const thClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const tdClass = 'px-6 py-4 whitespace-nowrap';

interface Props {
  employees: EmployeeListItem[];
  onDeleteClick: (employee: EmployeeListItem) => void;
}

/** Renders the employees table with local search and filter controls. */
export function EmployeeTableCard({ employees, onDeleteClick }: Props) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('all');

  const filtered = employees.filter(emp => {
    const matchesSearch =
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesType = employmentTypeFilter === 'all' || emp.employment_type === employmentTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <Card>
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('employees.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">{t('employees.allStatus')}</option>
            <option value="active">{t('employees.active')}</option>
            <option value="inactive">{t('employees.inactive')}</option>
            <option value="on-leave">{t('employees.onLeave')}</option>
          </select>
          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <th className={thClass}>{t('employees.employee')}</th>
              <th className={thClass}>{t('employees.department')}</th>
              <th className={thClass}>{t('employees.position')}</th>
              <th className={thClass}>{t('employees.type')}</th>
              <th className={thClass}>{t('employees.status')}</th>
              <th className={thClass}>{t('employees.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className={tdClass}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{employee.first_name} {employee.last_name}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                    <div className="text-xs text-gray-400">{employee.employee_number}</div>
                  </div>
                </td>
                <td className={tdClass}>
                  <div className="text-sm text-gray-900">{employee.departments?.name || 'N/A'}</div>
                </td>
                <td className={tdClass}>
                  <div className="text-sm text-gray-900">{employee.position}</div>
                </td>
                <td className={tdClass}>
                  <StatusBadge status={employee.employment_type} />
                </td>
                <td className={tdClass}>
                  <StatusBadge status={employee.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-3">
                    <Link to={`/employees/${employee.id}`} className="text-primary-600 hover:text-primary-900">
                      <Eye className="w-5 h-5" />
                    </Link>
                    <Link to={`/employees/${employee.id}/edit`} className="text-gray-600 hover:text-gray-900">
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button onClick={() => onDeleteClick(employee)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('employees.noEmployeesFound')}</p>
        </div>
      )}
    </Card>
  );
}
