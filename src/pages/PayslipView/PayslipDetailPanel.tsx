import { useTranslation } from 'react-i18next';
import { Eye, Download, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { Card, Button, EmptyState } from '../../components/ui';
import { formatCurrency, getMonthName, type PayrollData, type BonusData, type DeductionData } from '../../services/payroll';

interface Props {
  payroll: PayrollData | null;
  bonuses: BonusData[];
  deductions: DeductionData[];
  detailsLoading: boolean;
  onRefresh: () => void;
  onDownload: (payroll: PayrollData) => void;
}

/** Renders the selected payslip details, line items, and download actions. */
export function PayslipDetailPanel({ payroll, bonuses, deductions, detailsLoading, onRefresh, onDownload }: Props) {
  const { t } = useTranslation();

  if (!payroll) {
    return (
      <Card>
        <div className="p-8">
          <EmptyState
            title={t('payslip.selectPayslip', 'Select a Payslip')}
            message={t('payslip.selectPayslipDesc', 'Select a payslip from the list to view details.')}
            icon={FileText}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 -m-6 mb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {t('payslip.payslipFor', 'Payslip for')} {getMonthName(payroll.period_month)} {payroll.period_year}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {payroll.employees.first_name} {payroll.employees.last_name} • {payroll.employees.employee_number}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="secondary" icon={<Eye className="w-4 h-4" />} onClick={onRefresh} loading={detailsLoading} className="text-sm">
              {t('payslip.refresh', 'Refresh')}
            </Button>
            <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={() => onDownload(payroll)} className="text-sm">
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
            <div className="px-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] sm:text-xs text-gray-600">{t('payslip.baseSalary', 'Base')}</p>
                  <p className="text-xs sm:text-base font-bold text-gray-900">{formatCurrency(payroll.base_salary)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-[10px] sm:text-xs text-green-700">{t('payslip.totalBonuses', 'Bonuses')}</p>
                  <p className="text-xs sm:text-base font-bold text-green-600">+{formatCurrency(payroll.total_bonuses)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-[10px] sm:text-xs text-red-700">{t('payslip.totalDeductions', 'Deductions')}</p>
                  <p className="text-xs sm:text-base font-bold text-red-600">-{formatCurrency(payroll.total_deductions)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-[10px] sm:text-xs text-blue-700">{t('payslip.netSalary', 'Net')}</p>
                  <p className="text-xs sm:text-base font-bold text-blue-600">{formatCurrency(payroll.net_salary)}</p>
                </div>
              </div>
            </div>

            {bonuses.length > 0 && (
              <div className="px-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                  {t('payslip.bonuses', 'Bonuses')}
                </h4>
                <div className="space-y-2">
                  {bonuses.map((bonus) => (
                    <div key={bonus.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs font-medium text-gray-900">{bonus.type}</p>
                        <p className="text-[10px] text-gray-500 truncate">{bonus.description || '-'}</p>
                      </div>
                      <span className="text-xs font-bold text-green-600 whitespace-nowrap">+{formatCurrency(bonus.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deductions.length > 0 && (
              <div className="px-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-2 shrink-0" />
                  {t('payslip.deductions', 'Deductions')}
                </h4>
                <div className="space-y-2">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs font-medium text-gray-900">{deduction.type}</p>
                        <p className="text-[10px] text-gray-500 truncate">{deduction.description || '-'}</p>
                      </div>
                      <span className="text-xs font-bold text-red-600 whitespace-nowrap">-{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payroll.notes && (
              <div className="mx-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-semibold text-yellow-800 mb-1 text-sm">{t('payslip.notes', 'Notes')}</h4>
                <p className="text-yellow-700 text-xs break-words">{payroll.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
