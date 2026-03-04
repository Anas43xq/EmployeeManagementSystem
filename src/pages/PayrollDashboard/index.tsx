import { useTranslation } from 'react-i18next';
import { usePayroll } from './usePayroll';
import PayslipModal from './PayslipModal';
import { Card, Button, StatusBadge, Modal, PageHeader, EmptyState } from '../../components/ui';
import { formatCurrency, getMonthName } from '../../services/payroll';
import {
  Calculator,
  DollarSign,
  FileText,
  CheckCircle,
  Play,
  Filter,
  Users,
  Eye,
} from 'lucide-react';

export default function PayrollDashboard() {
  const { t } = useTranslation();
  const {
    payrolls,
    loading,
    generating,
    approving,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    statusFilter,
    setStatusFilter,
    isGenerateModalOpen,
    setIsGenerateModalOpen,
    selectedPayrolls,
    isPayslipModalOpen,
    viewingPayroll,
    bonuses,
    deductions,
    loadingPayslipDetails,
    stats,
    openPayslipModal,
    closePayslipModal,
    handleDownloadPDF,
    handleGeneratePayroll,
    handleApproveSelected,
    togglePayrollSelection,
    selectAllDraftPayrolls,
  } = usePayroll();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payroll.title', 'Payroll Management')}
        subtitle={t('payroll.description', 'Manage employee payroll, bonuses, and deductions')}
        action={
          <Button
            variant="primary"
            icon={<Play className="w-4 h-4" />}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            {t('payroll.generatePayroll', 'Generate Payroll')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card>
          <div className="p-2 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('payroll.totalRecords', 'Total Records')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 shrink-0" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-2 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('payroll.draft', 'Draft')}</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.draft}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 shrink-0" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-2 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('payroll.approved', 'Approved')}</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-2 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('payroll.paid', 'Paid')}</p>
                <p className="text-lg sm:text-2xl font-bold text-primary-600">{stats.paid}</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 shrink-0" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-2 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('payroll.totalAmount', 'Total Amount')}</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 shrink-0" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payroll Table */}
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
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="flex-1 min-w-[100px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="flex-1 min-w-[80px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                <Button
                  variant="primary"
                  onClick={handleApproveSelected}
                  loading={approving}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  {t('payroll.approve', 'Approve')}
                </Button>
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
                <Button
                  variant="primary"
                  icon={<Play className="w-4 h-4" />}
                  onClick={() => setIsGenerateModalOpen(true)}
                >
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
                          disabled={payroll.status !== 'draft'}
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
                      <td className="py-3 px-3 text-sm font-medium">
                        {formatCurrency(payroll.base_salary)}
                      </td>
                      <td className="py-3 px-3 text-sm text-blue-600 font-medium">
                        +{formatCurrency(payroll.total_bonuses)}
                      </td>
                      <td className="py-3 px-3 text-sm text-red-600 font-medium">
                        -{formatCurrency(payroll.total_deductions)}
                      </td>
                      <td className="py-3 px-3 text-sm font-bold">
                        {formatCurrency(payroll.net_salary)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={payroll.status} />
                      </td>
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

      {/* Generate Modal */}
      <Modal show={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)}>
        <Modal.Header onClose={() => setIsGenerateModalOpen(false)}>
          {t('payroll.generatePayrollTitle', 'Generate Monthly Payroll')}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <div>
              <div className="flex items-center space-x-2 mb-4 p-3 bg-primary-50 rounded-lg">
                <Calculator className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-900">
                  {t('payroll.generatingFor', 'Generating for')}: {getMonthName(selectedMonth)} {selectedYear}
                </span>
              </div>
              <p className="text-gray-600">
                {t('payroll.generateDescription', 'Generate payroll for all active employees. This will calculate salaries including bonuses, deductions, attendance, and leaves.')}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsGenerateModalOpen(false)}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGeneratePayroll}
                loading={generating}
                icon={<Calculator className="w-4 h-4" />}
                className="flex-1"
              >
                {t('payroll.generate', 'Generate Payroll')}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Payslip Modal */}
      <PayslipModal
        show={isPayslipModalOpen}
        payroll={viewingPayroll}
        bonuses={bonuses}
        deductions={deductions}
        loadingDetails={loadingPayslipDetails}
        onClose={closePayslipModal}
        onDownload={handleDownloadPDF}
      />
    </div>
  );
}
