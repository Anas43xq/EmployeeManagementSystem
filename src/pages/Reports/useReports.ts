import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { format } from 'date-fns';
import type { Department, ReportEmployee, Leave, Attendance, DepartmentReport, PayrollReport, ReportType } from './types';

export function useReports() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>('employee');
  const [dateRange, setDateRange] = useState('30');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const { showNotification } = useNotification();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const getDateFilter = () => {
    const today = new Date();
    const days = parseInt(dateRange);
    if (isNaN(days)) return null;

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    return startDate.toISOString();
  };

  const generateEmployeeReport = async () => {
    let query = supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        position,
        employment_type,
        status,
        hire_date,
        departments!department_id (name)
      `)
      .order('last_name');

    if (selectedDepartment) {
      query = query.eq('department_id', selectedDepartment);
    }

    const { data, error } = await query as { data: ReportEmployee[] | null; error: any };
    if (error) throw error;
    if (!data) return [];

    return data.map(emp => ({
      'Employee ID': emp.id,
      'First Name': emp.first_name,
      'Last Name': emp.last_name,
      'Email': emp.email,
      'Phone': emp.phone,
      'Position': emp.position,
      'Department': emp.departments?.name || 'N/A',
      'Employment Type': emp.employment_type,
      'Status': emp.status,
      'Hire Date': format(new Date(emp.hire_date), 'yyyy-MM-dd'),
    }));
  };

  const generateLeaveReport = async () => {
    let query = supabase
      .from('leaves')
      .select(`
        id,
        employees!employee_id (
          first_name,
          last_name,
          departments!department_id (name)
        ),
        leave_type,
        start_date,
        end_date,
        days,
        status,
        reason
      `)
      .order('start_date', { ascending: false });

    const dateFilter = getDateFilter();
    if (dateFilter) {
      query = query.gte('start_date', dateFilter);
    }

    if (selectedDepartment) {
      query = query.eq('employees.department_id', selectedDepartment);
    }

    const { data, error } = await query as { data: Leave[] | null; error: any };
    if (error) throw error;
    if (!data) return [];

    return data.map(leave => ({
      'Leave ID': leave.id,
      'Employee': `${leave.employees.first_name} ${leave.employees.last_name}`,
      'Department': leave.employees.departments?.name || 'N/A',
      'Leave Type': leave.leave_type,
      'Start Date': format(new Date(leave.start_date), 'yyyy-MM-dd'),
      'End Date': format(new Date(leave.end_date), 'yyyy-MM-dd'),
      'Days': leave.days,
      'Status': leave.status,
      'Reason': leave.reason || 'N/A',
    }));
  };

  const generateAttendanceReport = async () => {
    let query = supabase
      .from('attendance')
      .select(`
        id,
        employees!employee_id (
          first_name,
          last_name,
          departments!department_id (name)
        ),
        date,
        check_in,
        check_out,
        status,
        hours_worked
      `)
      .order('date', { ascending: false });

    const dateFilter = getDateFilter();
    if (dateFilter) {
      query = query.gte('date', dateFilter);
    }

    if (selectedDepartment) {
      query = query.eq('employees.department_id', selectedDepartment);
    }

    const { data, error } = await query as { data: Attendance[] | null; error: any };
    if (error) throw error;
    if (!data) return [];

    return data.map(att => ({
      'Attendance ID': att.id,
      'Employee': `${att.employees.first_name} ${att.employees.last_name}`,
      'Department': att.employees.departments?.name || 'N/A',
      'Date': format(new Date(att.date), 'yyyy-MM-dd'),
      'Check In': att.check_in || 'N/A',
      'Check Out': att.check_out || 'N/A',
      'Status': att.status,
      'Hours Worked': att.hours_worked || 0,
    }));
  };

  const generateDepartmentReport = async () => {
    let query = supabase
      .from('departments')
      .select(`
        id,
        name,
        type,
        description,
        employees!department_id (count)
      `)
      .order('name');

    if (selectedDepartment) {
      query = query.eq('id', selectedDepartment);
    }

    const { data, error } = await query as { data: DepartmentReport[] | null; error: any };
    if (error) throw error;
    if (!data) return [];

    return data.map(dept => ({
      'Department ID': dept.id,
      'Department Name': dept.name,
      'Type': dept.type,
      'Description': dept.description || 'N/A',
      'Total Employees': dept.employees?.[0]?.count || 0,
    }));
  };

  const generatePayrollReport = async () => {
    let query = supabase
      .from('payrolls')
      .select(`
        id,
        employees!employee_id (
          first_name,
          last_name,
          employee_number,
          departments!department_id (name)
        ),
        period_month,
        period_year,
        base_salary,
        total_bonuses,
        total_deductions,
        gross_salary,
        net_salary,
        status
      `)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    const dateFilter = getDateFilter();
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const filterYear = filterDate.getFullYear();
      const filterMonth = filterDate.getMonth() + 1;
      query = query.or(`period_year.gt.${filterYear},and(period_year.eq.${filterYear},period_month.gte.${filterMonth})`);
    }

    if (selectedDepartment) {
      query = query.eq('employees.department_id', selectedDepartment);
    }

    const { data, error } = await query as { data: PayrollReport[] | null; error: any };
    if (error) throw error;
    if (!data) return [];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return data.map(payroll => ({
      'Payroll ID': payroll.id,
      'Employee': `${payroll.employees.first_name} ${payroll.employees.last_name}`,
      'Employee Number': payroll.employees.employee_number,
      'Department': payroll.employees.departments?.name || 'N/A',
      'Period': `${monthNames[payroll.period_month - 1]} ${payroll.period_year}`,
      'Base Salary': payroll.base_salary.toFixed(2),
      'Bonuses': payroll.total_bonuses.toFixed(2),
      'Deductions': payroll.total_deductions.toFixed(2),
      'Gross Salary': payroll.gross_salary.toFixed(2),
      'Net Salary': payroll.net_salary.toFixed(2),
      'Status': payroll.status,
    }));
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]?.toString() || '';
          return `"${value.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = async (type: ReportType) => {
    setLoading(true);
    try {
      let reportData;
      let filename;

      switch (type) {
        case 'employee':
          reportData = await generateEmployeeReport();
          filename = 'employee-directory-report';
          break;
        case 'leave':
          reportData = await generateLeaveReport();
          filename = 'leave-report';
          break;
        case 'attendance':
          reportData = await generateAttendanceReport();
          filename = 'attendance-report';
          break;
        case 'department':
          reportData = await generateDepartmentReport();
          filename = 'department-report';
          break;
        case 'payroll':
          reportData = await generatePayrollReport();
          filename = 'payroll-report';
          break;
      }

      if (reportData && reportData.length > 0) {
        downloadCSV(reportData, filename);
        showNotification('success', t('reports.reportSuccess', { count: reportData.length }));
      } else {
        showNotification('warning', t('reports.noData'));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showNotification('error', t('reports.reportFailed'));
    } finally {
      setLoading(false);
    }
  };

  const generateCustomReport = () => {
    generateReport(selectedReport);
  };

  return {
    departments,
    loading,
    selectedReport,
    setSelectedReport,
    dateRange,
    setDateRange,
    selectedDepartment,
    setSelectedDepartment,
    generateReport,
    generateCustomReport,
  };
}
