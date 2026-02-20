import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';
import {
  getPayrollRecords,
  getBonuses,
  getDeductions,
  generatePayslipPDF,
  formatCurrency,
  getMonthName,
  type PayrollData,
  type BonusData,
  type DeductionData
} from '../services/payroll';
import { Card, Button, StatusBadge, PageHeader, EmptyState } from '../components/ui';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Eye,
  Filter
} from 'lucide-react';

export default function PayslipView() {
  const { t } = useTranslation();
  const { showNotification } = useNotification();

  const [payrolls, setPayrolls] = useState<PayrollData[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);
  const [bonuses, setBonuses] = useState<BonusData[]>([]);
  const [deductions, setDeductions] = useState<DeductionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPayslips();
  }, [selectedYear]);

  useEffect(() => {
    if (selectedPayroll) {
      loadPayrollDetails(selectedPayroll);
    }
  }, [selectedPayroll]);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const data = await getPayrollRecords(undefined, selectedYear);
      setPayrolls(data);
    } catch (error) {
      showNotification('error', t('payslip.failedToLoad', 'Failed to load payslips'));
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollDetails = async (payroll: PayrollData) => {
    setDetailsLoading(true);
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
      setDetailsLoading(false);
    }
  };

  const handleDownloadPDF = (payroll: PayrollData) => {
    try {
      generatePayslipPDF(payroll, bonuses, deductions);
      showNotification('success', t('payslip.downloadStarted', 'Payslip download started'));
    } catch (error) {
      showNotification('error', t('payslip.downloadFailed', 'Failed to generate payslip PDF'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payslip.myPayslips', 'My Payslips')}
        subtitle={t('payslip.description', 'View and download your payslips')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{t('payslip.payslips', 'Payslips')}</h3>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2 text-sm">{t('payslip.loading', 'Loading...')}</p>
                </div>
              ) : payrolls.length === 0 ? (
                <EmptyState
                  title={t('payslip.noPayslips', 'No Payslips')}
                  message={t('payslip.noPayslipsDesc', 'No payslips found for the selected year.')}
                  icon={FileText}
                />
              ) : (
                <div className="space-y-2">
                  {payrolls.map((payroll) => (
                    <button
                      key={payroll.id}
                      onClick={() => setSelectedPayroll(payroll)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedPayroll?.id === payroll.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {getMonthName(payroll.period_month)} {payroll.period_year}
                        </span>
                        <StatusBadge status={payroll.status} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('payslip.netSalary', 'Net Salary')}</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(payroll.net_salary)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            {selectedPayroll ? (
              <>
                <div className="p-4 border-b border-gray-200 -m-6 mb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {t('payslip.payslipFor', 'Payslip for')} {getMonthName(selectedPayroll.period_month)} {selectedPayroll.period_year}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {selectedPayroll.employees.first_name} {selectedPayroll.employees.last_name} • {selectedPayroll.employees.employee_number}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        icon={<Eye className="w-4 h-4" />}
                        onClick={() => loadPayrollDetails(selectedPayroll)}
                        loading={detailsLoading}
                        className="text-sm"
                      >
                        {t('payslip.refresh', 'Refresh')}
                      </Button>
                      <Button
                        variant="primary"
                        icon={<Download className="w-4 h-4" />}
                        onClick={() => handleDownloadPDF(selectedPayroll)}
                        className="text-sm"
                      >
                        {t('payslip.downloadPDF', 'Download')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {detailsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">{t('payslip.loadingDetails', 'Loading details...')}</p>
                    </div>
                  ) : (
                    <div className="space-y-6 -mx-6 -mb-6">
                      <div className="px-4 grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <p className="text-xs text-gray-600 truncate">{t('payslip.baseSalary', 'Base Salary')}</p>
                          <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                            {formatCurrency(selectedPayroll.base_salary)}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 sm:p-3">
                          <p className="text-xs text-green-700 truncate">{t('payslip.totalBonuses', 'Total Bonuses')}</p>
                          <p className="text-sm sm:text-lg font-bold text-blue-600 truncate">
                            +{formatCurrency(selectedPayroll.total_bonuses)}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 sm:p-3">
                          <p className="text-xs text-red-700 truncate">{t('payslip.totalDeductions', 'Deductions')}</p>
                          <p className="text-sm sm:text-lg font-bold text-red-600 truncate">
                            -{formatCurrency(selectedPayroll.total_deductions)}
                          </p>
                        </div>
                        <div className="bg-primary-50 rounded-lg p-2 sm:p-3">
                          <p className="text-xs text-primary-700 truncate">{t('payslip.netSalary', 'Net Salary')}</p>
                          <p className="text-sm sm:text-lg font-bold text-primary-600 truncate">
                            {formatCurrency(selectedPayroll.net_salary)}
                          </p>
                        </div>
                      </div>

                      {bonuses.length > 0 && (
                        <div className="px-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                            <TrendingUp className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                            {t('payslip.bonuses', 'Bonuses')}
                          </h4>
                          <div className="-mx-4 overflow-x-auto">
                            <table className="w-full min-w-[320px]">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">{t('payslip.type', 'Type')}</th>
                                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">{t('payslip.description', 'Description')}</th>
                                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">{t('payslip.amount', 'Amount')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bonuses.map((bonus) => (
                                  <tr key={bonus.id} className="border-t border-gray-100">
                                    <td className="py-2 px-3 text-xs font-medium text-gray-900">{bonus.type}</td>
                                    <td className="py-2 px-3 text-xs text-gray-600 max-w-[120px] truncate">{bonus.description || '-'}</td>
                                    <td className="py-2 px-3 text-xs font-medium text-blue-600 text-right whitespace-nowrap">
                                      +{formatCurrency(bonus.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {deductions.length > 0 && (
                        <div className="px-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                            <TrendingDown className="w-4 h-4 text-red-500 mr-2 shrink-0" />
                            {t('payslip.deductions', 'Deductions')}
                          </h4>
                          <div className="-mx-4 overflow-x-auto">
                            <table className="w-full min-w-[320px]">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">{t('payslip.type', 'Type')}</th>
                                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">{t('payslip.description', 'Description')}</th>
                                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">{t('payslip.amount', 'Amount')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {deductions.map((deduction) => (
                                  <tr key={deduction.id} className="border-t border-gray-100">
                                    <td className="py-2 px-3 text-xs font-medium text-gray-900">{deduction.type}</td>
                                    <td className="py-2 px-3 text-xs text-gray-600 max-w-[120px] truncate">{deduction.description || '-'}</td>
                                    <td className="py-2 px-3 text-xs font-medium text-red-600 text-right whitespace-nowrap">
                                      -{formatCurrency(deduction.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {selectedPayroll.notes && (
                        <div className="mx-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h4 className="font-semibold text-yellow-800 mb-1 text-sm">{t('payslip.notes', 'Notes')}</h4>
                          <p className="text-yellow-700 text-xs break-words">{selectedPayroll.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8">
                <EmptyState
                  title={t('payslip.selectPayslip', 'Select a Payslip')}
                  message={t('payslip.selectPayslipDesc', 'Select a payslip from the list to view details.')}
                  icon={FileText}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

