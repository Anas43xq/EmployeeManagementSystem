import { useTranslation } from 'react-i18next';
import { usePayroll } from './usePayroll';
import PayslipModal from './PayslipModal';
import { PayrollTableCard } from './PayrollTableCard';
import { StatsCard, Button, Modal, PageHeader } from '../../components/ui';
import { formatCurrency, getMonthName } from '../../services/payroll';
import { Calculator, DollarSign, FileText, CheckCircle, Play, Users } from 'lucide-react';

export default function PayrollDashboard() {
  const { t } = useTranslation();
  const {
    payrolls,
    loading,
    generating,
    approving,
    paying,
    selectedMonth,
    handleMonthChange,
    selectedYear,
    handleYearChange,
    statusFilter,
    handleStatusFilterChange,
    isGenerateModalOpen,
    openGenerateModal,
    closeGenerateModal,
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
    handleMarkAsPaid,
    togglePayrollSelection,
    selectAllDraftPayrolls,
    selectAllApprovedPayrolls,
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
            onClick={openGenerateModal}
          >
            {t('payroll.generatePayroll', 'Generate Payroll')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <StatsCard label={t('payroll.totalRecords', 'Total Records')} value={stats.total} Icon={Users} iconClassName="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" className="p-2 sm:p-4" valueClassName="text-lg sm:text-2xl font-bold text-gray-900" />
        <StatsCard label={t('payroll.draft', 'Draft')} value={stats.draft} Icon={FileText} iconClassName="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" className="p-2 sm:p-4" valueClassName="text-lg sm:text-2xl font-bold text-yellow-600" />
        <StatsCard label={t('payroll.approved', 'Approved')} value={stats.approved} Icon={CheckCircle} iconClassName="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" className="p-2 sm:p-4" valueClassName="text-lg sm:text-2xl font-bold text-blue-600" />
        <StatsCard label={t('payroll.paid', 'Paid')} value={stats.paid} Icon={DollarSign} iconClassName="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" className="p-2 sm:p-4" valueClassName="text-lg sm:text-2xl font-bold text-primary-600" />
        <StatsCard label={t('payroll.totalAmount', 'Total Amount')} value={formatCurrency(stats.totalAmount)} Icon={Calculator} iconClassName="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" className="p-2 sm:p-4" valueClassName="text-sm sm:text-lg font-bold text-gray-900 truncate" />
      </div>

      <PayrollTableCard
        payrolls={payrolls}
        loading={loading}
        approving={approving}
        paying={paying}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        statusFilter={statusFilter}
        selectedPayrolls={selectedPayrolls}
        stats={stats}
        handleMonthChange={handleMonthChange}
        handleYearChange={handleYearChange}
        handleStatusFilterChange={handleStatusFilterChange}
        handleApproveSelected={handleApproveSelected}
        handleMarkAsPaid={handleMarkAsPaid}
        selectAllDraftPayrolls={selectAllDraftPayrolls}
        selectAllApprovedPayrolls={selectAllApprovedPayrolls}
        togglePayrollSelection={togglePayrollSelection}
        openPayslipModal={openPayslipModal}
        openGenerateModal={openGenerateModal}
      />

      {/* Generate Modal */}
      <Modal show={isGenerateModalOpen} onClose={closeGenerateModal}>
        <Modal.Header onClose={closeGenerateModal}>
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
              <Button type="button" variant="secondary" onClick={closeGenerateModal} className="flex-1">
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="button" variant="primary" onClick={handleGeneratePayroll} loading={generating} icon={<Calculator className="w-4 h-4" />} className="flex-1">
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
