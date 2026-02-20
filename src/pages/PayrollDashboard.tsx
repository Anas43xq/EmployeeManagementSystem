import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import {
  generateMonthlyPayroll,
  getPayrollRecords,
  approvePayroll,
  getBonuses,
  getDeductions,
  generatePayslipPDF,
  formatCurrency,
  getMonthName,
  type PayrollData,
  type BonusData,
  type DeductionData
} from '../services/payroll';
import { Card, Button, StatusBadge, Modal, PageHeader, EmptyState } from '../components/ui';
import {
  Calculator,
  DollarSign,
  FileText,
  Download,
  CheckCircle,
  Play,
  Filter,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  X
} from 'lucide-react';

export default function PayrollDashboard() {
  const { t } = useTranslation();
  const { showNotification } = useNotification();

  const [payrolls, setPayrolls] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);

  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<PayrollData | null>(null);
  const [bonuses, setBonuses] = useState<BonusData[]>([]);
  const [deductions, setDeductions] = useState<DeductionData[]>([]);
  const [loadingPayslipDetails, setLoadingPayslipDetails] = useState(false);

  useEffect(() => {
    loadPayrollRecords();
  }, [selectedMonth, selectedYear, statusFilter]);

  const loadPayrollRecords = async () => {
    setLoading(true);
    try {
      const data = await getPayrollRecords(selectedMonth, selectedYear, undefined, statusFilter || undefined);
      setPayrolls(data);
    } catch (error) {
      showNotification('error', t('payroll.failedToLoad', 'Failed to load payroll records'));
    } finally {
      setLoading(false);
    }
  };

  const openPayslipModal = async (payroll: PayrollData) => {
    setViewingPayroll(payroll);
    setIsPayslipModalOpen(true);
    setLoadingPayslipDetails(true);
    
    try {
      const [bonusData, deductionData] = await Promise.all([
        getBonuses(payroll.employee_id, payroll.period_month, payroll.period_year),
        getDeductions(payroll.employee_id, payroll.period_month, payroll.period_year)
      ]);
      setBonuses(bonusData);
      setDeductions(deductionData);
    } catch (error) {
      showNotification('error', t('payslip.failedToLoadDetails', 'Failed to load payslip details'));
    } finally {
      setLoadingPayslipDetails(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!viewingPayroll) return;
    try {
      generatePayslipPDF(viewingPayroll, bonuses, deductions);
      showNotification('success', t('payslip.downloadStarted', 'Payslip download started'));
    } catch (error) {
      showNotification('error', t('payslip.downloadFailed', 'Failed to generate payslip PDF'));
    }
  };

  const handleGeneratePayroll = async () => {
    if (selectedMonth < 1 || selectedMonth > 12 || selectedYear < 2020) {
      showNotification('error', t('payroll.invalidPeriod', 'Please select a valid month and year'));
      return;
    }

    setGenerating(true);
    try {
      const result = await generateMonthlyPayroll(
        selectedMonth,
        selectedYear
      );

      if (result.success) {
        showNotification('success', result.message || t('payroll.generatedSuccessfully', 'Payroll generated successfully'));
        setIsGenerateModalOpen(false);
        loadPayrollRecords();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      showNotification('error', error.message || t('payroll.generationFailed', 'Failed to generate payroll'));
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveSelected = async () => {
    if (selectedPayrolls.length === 0) {
      showNotification('error', t('payroll.selectPayrollsToApprove', 'Please select payroll records to approve'));
      return;
    }

    setApproving(true);
    try {
      const success = await approvePayroll(selectedPayrolls);
      if (success) {
        showNotification('success', t('payroll.approvedSuccessfully', 'Payroll records approved successfully'));
        setSelectedPayrolls([]);
        loadPayrollRecords();
      } else {
        throw new Error('Failed to approve payrolls');
      }
    } catch (error: any) {
      showNotification('error', error.message || t('payroll.approvalFailed', 'Failed to approve payroll records'));
    } finally {
      setApproving(false);
    }
  };

  const togglePayrollSelection = (payrollId: string) => {
    setSelectedPayrolls(prev =>
      prev.includes(payrollId)
        ? prev.filter(id => id !== payrollId)
        : [...prev, payrollId]
    );
  };

  const selectAllDraftPayrolls = () => {
    const draftPayrolls = payrolls.filter(p => p.status === 'draft').map(p => p.id);
    if (selectedPayrolls.length === draftPayrolls.length && draftPayrolls.length > 0) {
      setSelectedPayrolls([]);
    } else {
      setSelectedPayrolls(draftPayrolls);
    }
  };

  const stats = {
    total: payrolls.length,
    draft: payrolls.filter(p => p.status === 'draft').length,
    approved: payrolls.filter(p => p.status === 'approved').length,
    paid: payrolls.filter(p => p.status === 'paid').length,
    totalAmount: payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0)
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('payroll.totalRecords', 'Total Records')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('payroll.draft', 'Draft')}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('payroll.approved', 'Approved')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('payroll.paid', 'Paid')}</p>
                <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('payroll.totalAmount', 'Total Amount')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <Calculator className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{t('common.filters', 'Filters')}:</span>
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('payroll.allStatuses', 'All Statuses')}</option>
                <option value="draft">{t('payroll.draft', 'Draft')}</option>
                <option value="approved">{t('payroll.approved', 'Approved')}</option>
                <option value="paid">{t('payroll.paid', 'Paid')}</option>
              </select>
            </div>

            {selectedPayrolls.length > 0 && (
              <div className="flex items-center space-x-2">
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
              <Button
                variant="secondary"
                onClick={selectAllDraftPayrolls}
              >
                {t('payroll.selectAllDraft', 'Select All Draft Records')}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                      <td className="py-3 px-3 text-sm text-green-600 font-medium">
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

      <Modal
        show={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      >
        <Modal.Header onClose={() => setIsGenerateModalOpen(false)}>
          {t('payroll.generatePayrollTitle', 'Generate Monthly Payroll')}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <div>
              <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
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

      {/* Payslip View Modal */}
      <Modal
        show={isPayslipModalOpen}
        size="2xl"
        onClose={() => {
          setIsPayslipModalOpen(false);
          setViewingPayroll(null);
          setBonuses([]);
          setDeductions([]);
        }}
      >
        <Modal.Header onClose={() => setIsPayslipModalOpen(false)}>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>
              {viewingPayroll 
                ? `${t('payslip.payslipFor', 'Payslip for')} ${getMonthName(viewingPayroll.period_month)} ${viewingPayroll.period_year}`
                : t('payslip.viewPayslip', 'View Payslip')}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          {viewingPayroll && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {viewingPayroll.employees.first_name} {viewingPayroll.employees.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {viewingPayroll.employees.employee_number} • {viewingPayroll.employees.position}
                  </p>
                  <p className="text-sm text-gray-500">{viewingPayroll.employees.email}</p>
                </div>
                <StatusBadge status={viewingPayroll.status} />
              </div>

              {loadingPayslipDetails ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">{t('payslip.loadingDetails', 'Loading details...')}</p>
                </div>
              ) : (
                <>
                  {/* Salary Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">{t('payslip.baseSalary', 'Base Salary')}</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(viewingPayroll.base_salary)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700">{t('payslip.totalBonuses', 'Total Bonuses')}</p>
                      <p className="text-xl font-bold text-green-600">
                        +{formatCurrency(viewingPayroll.total_bonuses)}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-700">{t('payslip.totalDeductions', 'Total Deductions')}</p>
                      <p className="text-xl font-bold text-red-600">
                        -{formatCurrency(viewingPayroll.total_deductions)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700">{t('payslip.netSalary', 'Net Salary')}</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(viewingPayroll.net_salary)}
                      </p>
                    </div>
                  </div>

                  {/* Bonuses Section */}
                  {bonuses.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center mb-3">
                        <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                        {t('payslip.bonuses', 'Bonuses')}
                      </h4>
                      <div className="space-y-2">
                        {bonuses.map((bonus: BonusData) => (
                          <div key={bonus.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{bonus.type}</p>
                              <p className="text-sm text-gray-600">{bonus.description}</p>
                            </div>
                            <span className="font-bold text-green-600">+{formatCurrency(bonus.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deductions Section */}
                  {deductions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center mb-3">
                        <TrendingDown className="w-4 h-4 text-red-600 mr-2" />
                        {t('payslip.deductions', 'Deductions')}
                      </h4>
                      <div className="space-y-2">
                        {deductions.map((deduction: DeductionData) => (
                          <div key={deduction.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{deduction.type}</p>
                              <p className="text-sm text-gray-600">{deduction.description}</p>
                            </div>
                            <span className="font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPayslipModalOpen(false)}
                  className="flex-1"
                  icon={<X className="w-4 h-4" />}
                >
                  {t('common.close', 'Close')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleDownloadPDF}
                  disabled={loadingPayslipDetails}
                  className="flex-1"
                  icon={<Download className="w-4 h-4" />}
                >
                  {t('payslip.downloadPDF', 'Download PDF')}
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

