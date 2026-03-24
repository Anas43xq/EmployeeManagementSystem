import { useTranslation } from 'react-i18next';
import { FileText, Filter } from 'lucide-react';
import { Card, StatusBadge, EmptyState } from '../../components/ui';
import { formatCurrency, getMonthName, type PayrollData } from '../../services/payroll';

interface Props {
  payrolls: PayrollData[];
  loading: boolean;
  selectedPayroll: PayrollData | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onSelect: (payroll: PayrollData) => void;
}

/** Renders the list of payslips available for the selected year. */
export function PayslipListPanel({ payrolls, loading, selectedPayroll, selectedYear, onYearChange, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t('payslip.payslips', 'Payslips')}</h3>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
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
                onClick={() => onSelect(payroll)}
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
                  <span className="font-semibold text-gray-900">{formatCurrency(payroll.net_salary)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
