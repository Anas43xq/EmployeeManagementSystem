import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { getValidAccessToken, getFreshAccessToken } from './sessionManager';

export interface PayrollData {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  total_bonuses: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  generated_at: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_number: string;
    position: string;
    email: string;
  };
}

export interface BonusData {
  id: string;
  type: string;
  amount: number;
  description: string;
}

export interface DeductionData {
  id: string;
  type: string;
  amount: number;
  description: string;
}

export interface PayrollCalculationResult {
  success: boolean;
  results?: any[];
  errors?: string[];
  message?: string;
}

export async function generateMonthlyPayroll(
  month: number,
  year: number,
  employeeIds?: string[]
): Promise<PayrollCalculationResult> {
  try {
    // Use getFreshAccessToken for critical payroll operations to ensure valid token
    const accessToken = await getFreshAccessToken();
    
    if (!accessToken) {
      console.error('[Payroll] No valid session - could not get access token');
      return {
        success: false,
        message: 'Session expired. Please log out and log in again to generate payroll.'
      };
    }

    console.log('[Payroll] Calling payroll function with fresh token...');

    const { data, error } = await supabase.functions.invoke('generate-monthly-payroll', {
      body: {
        action: 'generate-payroll',
        month,
        year,
        employeeIds
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (error) {
      console.error('[Payroll] Error:', error);
      
      // Check if it's an auth error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return {
          success: false,
          message: 'Authentication failed. Please log out and log in again.'
        };
      }
      
      throw new Error(error.message || 'Failed to generate payroll');
    }

    // Check if data contains an error (non-2xx responses may return error in data)
    if (data?.error) {
      const errorMsg = data.error + (data.details ? `: ${data.details}` : '');
      
      // Provide user-friendly messages for common errors
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid or expired token')) {
        return {
          success: false,
          message: 'Your session has expired. Please log out and log in again.'
        };
      }
      
      if (errorMsg.includes('Insufficient permissions')) {
        return {
          success: false,
          message: 'You do not have permission to generate payroll. Only Admin and HR users can do this.'
        };
      }
      
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('[Payroll] Error generating payroll:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate payroll'
    };
  }
}

export async function calculateEmployeePayroll(
  employeeId: string,
  month: number,
  year: number
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken();
    
    const { data, error } = await supabase.functions.invoke('generate-monthly-payroll', {
      body: {
        action: 'calculate-employee',
        employeeId,
        month,
        year
      },
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`
      } : undefined
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('[Payroll] Error calculating employee payroll:', error);
    throw error;
  }
}

export async function approvePayroll(payrollIds: string[]): Promise<boolean> {
  try {
    const accessToken = await getFreshAccessToken();
    
    if (!accessToken) {
      console.error('[Payroll] No valid session for approval');
      return false;
    }
    
    const { data, error } = await supabase.functions.invoke('generate-monthly-payroll', {
      body: {
        action: 'approve-payroll',
        payrollIds
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.success;
  } catch (error) {
    console.error('[Payroll] Error approving payroll:', error);
    return false;
  }
}

export async function getPayrollRecords(
  month?: number,
  year?: number,
  employeeId?: string,
  status?: string
): Promise<PayrollData[]> {
  try {
    let query = supabase
      .from('payrolls')
      .select(`
        *,
        employees (
          first_name,
          last_name,
          employee_number,
          position,
          email
        )
      `)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (month) query = query.eq('period_month', month);
    if (year) query = query.eq('period_year', year);
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as PayrollData[];
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    return [];
  }
}

export async function getBonuses(employeeId: string, month: number, year: number) {
  try {
    const { data, error } = await supabase
      .from('bonuses')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period_month', month)
      .eq('period_year', year)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching bonuses:', error);
    return [];
  }
}

export async function getDeductions(employeeId: string, month: number, year: number) {
  try {
    const { data, error } = await supabase
      .from('deductions')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period_month', month)
      .eq('period_year', year)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching deductions:', error);
    return [];
  }
}

export async function addBonus(
  employeeId: string,
  type: string,
  amount: number,
  description: string,
  month: number,
  year: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bonuses' as any)
      .insert({
        employee_id: employeeId,
        type,
        amount,
        description,
        period_month: month,
        period_year: year
      } as any);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error adding bonus:', error);
    return false;
  }
}

export async function addDeduction(
  employeeId: string,
  type: string,
  amount: number,
  description: string,
  month: number,
  year: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('deductions' as any)
      .insert({
        employee_id: employeeId,
        type,
        amount,
        description,
        period_month: month,
        period_year: year
      } as any);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error adding deduction:', error);
    return false;
  }
}

export function generatePayslipPDF(
  payrollData: PayrollData,
  bonuses: BonusData[],
  deductions: DeductionData[]
): void {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('StaffHub — Al-Mustaqbal Group', 20, 20);
  doc.setFontSize(16);
  doc.text('PAYSLIP', 20, 30);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${payrollData.employees.first_name} ${payrollData.employees.last_name}`, 20, 45);
  doc.text(`Employee ID: ${payrollData.employees.employee_number}`, 20, 55);
  doc.text(`Position: ${payrollData.employees.position}`, 20, 65);
  doc.text(`Email: ${payrollData.employees.email}`, 20, 75);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  doc.text(`Period: ${monthNames[payrollData.period_month - 1]} ${payrollData.period_year}`, 20, 85);

  const tableData = [
    ['Item', 'Amount ($)'],
    ['Base Salary', payrollData.base_salary.toFixed(2)],
  ];

  if (bonuses.length > 0) {
    tableData.push(['BONUSES', '']);
    bonuses.forEach(bonus => {
      tableData.push([`  ${bonus.type} - ${bonus.description}`, bonus.amount.toFixed(2)]);
    });
  }

  if (deductions.length > 0) {
    tableData.push(['DEDUCTIONS', '']);
    deductions.forEach(deduction => {
      tableData.push([`  ${deduction.type} - ${deduction.description}`, `-${deduction.amount.toFixed(2)}`]);
    });
  }

  tableData.push(['', '']);
  tableData.push(['Total Bonuses', payrollData.total_bonuses.toFixed(2)]);
  tableData.push(['Total Deductions', `-${payrollData.total_deductions.toFixed(2)}`]);
  tableData.push(['Gross Salary', payrollData.gross_salary.toFixed(2)]);
  tableData.push(['NET SALARY', payrollData.net_salary.toFixed(2)]);

  autoTable(doc, {
    startY: 95,
    head: [tableData[0]],
    body: tableData.slice(1),
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 123, 255] },
    didParseCell: function (data) {
      if (data.row.index === tableData.length - 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 255, 220];
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, finalY);
  doc.text('This is a computer-generated payslip.', 20, finalY + 10);

  const fileName = `payslip_${payrollData.employees.employee_number}_${payrollData.period_month}_${payrollData.period_year}.pdf`;
  doc.save(fileName);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month - 1] || '';
}

export function validatePayrollData(data: Partial<PayrollData>): boolean {
  return !!(
    data.employee_id &&
    data.period_month &&
    data.period_year &&
    typeof data.base_salary === 'number' &&
    data.base_salary >= 0
  );
}