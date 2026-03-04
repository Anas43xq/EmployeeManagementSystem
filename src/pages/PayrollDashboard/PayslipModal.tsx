import { useTranslation } from 'react-i18next';
import { Modal, Button, StatusBadge } from '../../components/ui';
import { formatCurrency, getMonthName, type PayrollData, type BonusData, type DeductionData } from '../../services/payroll';
import { FileText, Download, TrendingUp, TrendingDown, X } from 'lucide-react';

interface PayslipModalProps {
  show: boolean;
  payroll: PayrollData | null;
  bonuses: BonusData[];
  deductions: DeductionData[];
  loadingDetails: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export default function PayslipModal({
  show,
  payroll,
  bonuses,
  deductions,
  loadingDetails,
  onClose,
  onDownload,
}: PayslipModalProps) {
  const { t } = useTranslation();

  return (
    <Modal show={show} size="2xl" onClose={onClose}>
      <Modal.Header onClose={onClose}>
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <span>
            {payroll
              ? `${t('payslip.payslipFor', 'Payslip for')} ${getMonthName(payroll.period_month)} ${payroll.period_year}`
              : t('payslip.viewPayslip', 'View Payslip')}
          </span>
        </div>
      </Modal.Header>
      <Modal.Body>
        {payroll && (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {payroll.employees.first_name} {payroll.employees.last_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {payroll.employees.employee_number} • {payroll.employees.position}
                </p>
                <p className="text-sm text-gray-500">{payroll.employees.email}</p>
              </div>
              <StatusBadge status={payroll.status} />
            </div>

            {loadingDetails ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">{t('payslip.loadingDetails', 'Loading details...')}</p>
              </div>
            ) : (
              <>
                {/* Salary Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">{t('payslip.baseSalary', 'Base Salary')}</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(payroll.base_salary)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">{t('payslip.totalBonuses', 'Total Bonuses')}</p>
                    <p className="text-xl font-bold text-blue-600">+{formatCurrency(payroll.total_bonuses)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-red-700">{t('payslip.totalDeductions', 'Total Deductions')}</p>
                    <p className="text-xl font-bold text-red-600">-{formatCurrency(payroll.total_deductions)}</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4">
                    <p className="text-sm text-primary-700">{t('payslip.netSalary', 'Net Salary')}</p>
                    <p className="text-xl font-bold text-primary-600">{formatCurrency(payroll.net_salary)}</p>
                  </div>
                </div>

                {/* Bonuses Section */}
                {bonuses.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center mb-3">
                      <TrendingUp className="w-4 h-4 text-blue-600 mr-2" />
                      {t('payslip.bonuses', 'Bonuses')}
                    </h4>
                    <div className="space-y-2">
                      {bonuses.map((bonus: BonusData) => (
                        <div key={bonus.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{bonus.type}</p>
                            <p className="text-sm text-gray-600">{bonus.description}</p>
                          </div>
                          <span className="font-bold text-blue-600">+{formatCurrency(bonus.amount)}</span>
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
                onClick={onClose}
                className="flex-1"
                icon={<X className="w-4 h-4" />}
              >
                {t('common.close', 'Close')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onDownload}
                disabled={loadingDetails}
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
  );
}
