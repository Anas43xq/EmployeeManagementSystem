import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import {
  generateMonthlyPayroll,
  getPayrollRecords,
  approvePayroll,
  getBonuses,
  getDeductions,
  generatePayslipPDF,
  type PayrollData,
  type BonusData,
  type DeductionData,
} from '../../services/payroll';

export function usePayroll() {
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

  // Payslip modal state
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
    } catch {
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
        getDeductions(payroll.employee_id, payroll.period_month, payroll.period_year),
      ]);
      setBonuses(bonusData);
      setDeductions(deductionData);
    } catch {
      showNotification('error', t('payslip.failedToLoadDetails', 'Failed to load payslip details'));
    } finally {
      setLoadingPayslipDetails(false);
    }
  };

  const closePayslipModal = () => {
    setIsPayslipModalOpen(false);
    setViewingPayroll(null);
    setBonuses([]);
    setDeductions([]);
  };

  const handleDownloadPDF = () => {
    if (!viewingPayroll) return;
    try {
      generatePayslipPDF(viewingPayroll, bonuses, deductions);
      showNotification('success', t('payslip.downloadStarted', 'Payslip download started'));
    } catch {
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
      const result = await generateMonthlyPayroll(selectedMonth, selectedYear);
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
    totalAmount: payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0),
  };

  return {
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
  };
}
