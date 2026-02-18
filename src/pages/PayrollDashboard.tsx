import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import {
  generateMonthlyPayroll,
  getPayrollRecords,
  approvePayroll,
  formatCurrency,
  getMonthName,
  type PayrollData
} from '../lib/payroll';
import { Card, Button, StatusBadge, Modal, FormField, PageHeader, EmptyState } from '../components/ui';
import {
  Calculator,
  DollarSign,
  FileText,
  Download,
  CheckCircle,
  Play,
  Filter,
  Users
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
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [selectedEmployees] = useState<string[]>([]);

  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);

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

  const handleGeneratePayroll = async () => {
    if (generateMonth < 1 || generateMonth > 12 || generateYear < 2020) {
      showNotification('error', t('payroll.invalidPeriod', 'Please select a valid month and year'));
      return;
    }

    setGenerating(true);
    try {
      const result = await generateMonthlyPayroll(
        generateMonth,
        generateYear,
        selectedEmployees.length > 0 ? selectedEmployees : undefined
      );

      if (result.success) {
        showNotification('success', result.message || t('payroll.generatedSuccessfully', 'Payroll generated successfully'));
        setIsGenerateModalOpen(false);
        if (generateMonth === selectedMonth && generateYear === selectedYear) {
          loadPayrollRecords();
        }
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
    setSelectedPayrolls(draftPayrolls);
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
                <span className="text-sm text-gray-600">
                  {t('payroll.selectedCount', '{count} selected', { count: selectedPayrolls.length })}
                </span>
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
                          icon={<Download className="w-4 h-4" />}
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
              <p className="text-gray-600 mb-4">
                {t('payroll.generateDescription', 'Generate payroll for all active employees. This will calculate salaries including bonuses, deductions, attendance, and leaves.')}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('payroll.month', 'Month')} required>
                  <select
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t('payroll.year', 'Year')} required>
                  <select
                    value={generateYear}
                    onChange={(e) => setGenerateYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </FormField>
              </div>
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
    </div>
  );
}
