import { useTranslation } from 'react-i18next';
import { Button, StatusBadge, Card, EmptyState } from '../../components/ui';
import { formatCurrency, getMonthName, type PayrollData } from '../../services/payroll';
import { Filter, CheckCircle, Banknote, Calculator, Play, Eye } from 'lucide-react';

interface Props {
  payrolls: PayrollData[];
  loading: boolean;
  approving: boolean;
  paying: boolean;
  selectedMonth: number;
  selectedYear: number;
  statusFilter: string;
  selectedPayrolls: string[];
  stats: { draft: number; approved: number };
  handleMonthChange: (month: number) => void;
  handleYearChange: (year: number) => void;
  handleStatusFilterChange: (status: string) => void;
  handleApproveSelected: () => void;
  handleMarkAsPaid: () => void;
  selectAllDraftPayrolls: () => void;
  selectAllApprovedPayrolls: () => void;
  togglePayrollSelection: (id: string) => void;
  openPayslipModal: (payroll: PayrollData) => void;
  openGenerateModal: () => void;
}


export function PayrollTableCard({
  payrolls, loading, approving, paying,
  selectedMonth, selectedYear, statusFilter, selectedPayrolls,
  stats, handleMonthChange, handleYearChange, handleStatusFilterChange,
  handleApproveSelected, handleMarkAsPaid, selectAllDraftPayrolls,
  selectAllApprovedPayrolls, togglePayrollSelection,
  openPayslipModal, openGenerateModal,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{t('common.filters', 'Filters')}:</span>
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="flex-1 min-w-[100px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="flex-1 min-w-[80px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="flex-1 min-w-[100px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">{t('payroll.allStatuses', 'All Statuses')}</option>
              <option value="draft">{t('payroll.draft', 'Draft')}</option>
              <option value="approved">{t('payroll.approved', 'Approved')}</option>
              <option value="paid">{t('payroll.paid', 'Paid')}</option>
            </select>
          </div>

          {selectedPayrolls.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedPayrolls.some(id => payrolls.find(p => p.id === id)?.status === 'draft') && (
                <Button
                  variant="primary"
                  onClick={handleApproveSelected}
                  loading={approving}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  {t('payroll.approve', 'Approve')}
                </Button>
              )}
              {selectedPayrolls.some(id => payrolls.find(p => p.id === id)?.status === 'approved') && (
                <Button
                  variant="primary"
                  onClick={handleMarkAsPaid}
                  loading={paying}
                  icon={<Banknote className="w-4 h-4" />}
                >
                  {t('payroll.markAsPaid', 'Mark as Paid')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {selectedPayrolls.length === 0 && stats.draft > 0 && (
          <div className="mb-4">
            <Button variant="secondary" onClick={selectAllDraftPayrolls}>
              {t('payroll.selectAllDraft', 'Select All Draft Records')}
            </Button>
          </div>
        )}

        {selectedPayrolls.length === 0 && stats.approved > 0 && (
          <div className="mb-4">
            <Button variant="secondary" onClick={selectAllApprovedPayrolls}>
              {t('payroll.selectAllApproved', 'Select All Approved Records')}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">{t('payroll.loading', 'Loading payroll records...')}</p>
          </div>
        ) : payrolls.length === 0 ? (
          <EmptyState
            title={t('payroll.noRecords', 'No Payroll Records')}
            message={t('payroll.noRecordsDesc', 'No payroll records found for the selected period. Generate payroll to get started.')}
            icon={Calculator}
            action={
              <Button variant="primary" icon={<Play className="w-4 h-4" />} onClick={openGenerateModal}>
                {t('payroll.generateFirst', 'Generate Your First Payroll')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedPayrolls.length === payrolls.filter(p => p.status === 'draft').length && payrolls.filter(p => p.status === 'draft').length > 0}
                      onChange={selectAllDraftPayrolls}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.employee', 'Employee')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.period', 'Period')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.baseSalary', 'Base Salary')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.bonuses', 'Bonuses')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.deductions', 'Deductions')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.netSalary', 'Net Salary')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('payroll.status', 'Status')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedPayrolls.includes(payroll.id)}
                        onChange={() => togglePayrollSelection(payroll.id)}
                        disabled={payroll.status === 'paid'}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {payroll.employees.first_name} {payroll.employees.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {payroll.employees.employee_number} • {payroll.employees.position}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm">
                      {getMonthName(payroll.period_month)} {payroll.period_year}
                    </td>
                    <td className="py-3 px-3 text-sm font-medium">{formatCurrency(payroll.base_salary)}</td>
                    <td className="py-3 px-3 text-sm text-blue-600 font-medium">+{formatCurrency(payroll.total_bonuses)}</td>
                    <td className="py-3 px-3 text-sm text-red-600 font-medium">-{formatCurrency(payroll.total_deductions)}</td>
                    <td className="py-3 px-3 text-sm font-bold">{formatCurrency(payroll.net_salary)}</td>
                    <td className="py-3 px-3"><StatusBadge status={payroll.status} /></td>
                    <td className="py-3 px-3">
                      <Button
                        variant="secondary"
                        icon={<Eye className="w-4 h-4" />}
                        onClick={() => openPayslipModal(payroll)}
                      >
                        {t('payroll.viewPayslip', 'View Payslip')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
