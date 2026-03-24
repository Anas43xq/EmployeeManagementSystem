import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getPayrollRecords,
  getBonuses,
  getDeductions,
  generatePayslipPDF,
  type PayrollData,
  type BonusData,
  type DeductionData
} from '../../services/payroll';
import { PageHeader } from '../../components/ui';
import { PayslipListPanel } from './PayslipListPanel';
import { PayslipDetailPanel } from './PayslipDetailPanel';

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

  useEffect(() => { loadPayslips(); }, [selectedYear]);
  useEffect(() => { if (selectedPayroll) loadPayrollDetails(selectedPayroll); }, [selectedPayroll]);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const data = await getPayrollRecords(undefined, selectedYear);
      setPayrolls(data);
    } catch (_error) {
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
    } catch (_error) {
      showNotification('error', t('payslip.failedToLoadDetails', 'Failed to load payslip details'));
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDownloadPDF = (payroll: PayrollData) => {
    try {
      generatePayslipPDF(payroll, bonuses, deductions);
      showNotification('success', t('payslip.downloadStarted', 'Payslip download started'));
    } catch (_error) {
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
          <PayslipListPanel
            payrolls={payrolls}
            loading={loading}
            selectedPayroll={selectedPayroll}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onSelect={setSelectedPayroll}
          />
        </div>
        <div className="lg:col-span-2">
          <PayslipDetailPanel
            payroll={selectedPayroll}
            bonuses={bonuses}
            deductions={deductions}
            detailsLoading={detailsLoading}
            onRefresh={() => selectedPayroll && loadPayrollDetails(selectedPayroll)}
            onDownload={handleDownloadPDF}
          />
        </div>
      </div>
    </div>
  );
}

