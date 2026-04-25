import { db } from '../lib/db';
import type { ReportEmployee, ReportLeave, ReportAttendance, DepartmentReport, PayrollReport } from '../types/pages';
import type { DepartmentBasic } from '../types';

type Department = DepartmentBasic;
type Leave = ReportLeave;
type Attendance = ReportAttendance;

export async function getReportDepartments(): Promise<Department[]> {
  const { data, error } = await db
    .from('departments')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getEmployeeReportData(selectedDepartment?: string): Promise<ReportEmployee[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email,
      position,
      employment_type,
      status,
      hire_date,
      salary,
      employee_profiles(phone),
      departments!department_id(name)
    `)
    .order('last_name');

  if (selectedDepartment) {
    query = query.eq('department_id', selectedDepartment);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  const mappedData = (data as any[]).map(emp => {
    const { employee_profiles, ...rest } = emp;
    return {
      ...rest,
      phone: employee_profiles?.phone || ''
    };
  });
  
  return mappedData as ReportEmployee[];
}

export async function getLeaveReportData(dateFilter: string | null, selectedDepartment?: string): Promise<Leave[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
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
      days_count,
      status,
      reason
    `)
    .order('start_date', { ascending: false });

  if (dateFilter) {
    query = query.gte('start_date', dateFilter);
  }

  if (selectedDepartment) {
    query = query.eq('employees.department_id', selectedDepartment);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Leave[];
}

export async function getAttendanceReportData(dateFilter: string | null, selectedDepartment?: string): Promise<Attendance[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
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
      status
    `)
    .order('date', { ascending: false });

  if (dateFilter) {
    query = query.gte('date', dateFilter);
  }

  if (selectedDepartment) {
    query = query.eq('employees.department_id', selectedDepartment);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Attendance[];
}

export async function getDepartmentReportData(selectedDepartment?: string): Promise<DepartmentReport[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
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

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DepartmentReport[];
}

export async function getPayrollReportData(dateFilter: string | null, selectedDepartment?: string): Promise<PayrollReport[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
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

  if (dateFilter) {
    const filterDate = new Date(dateFilter);
    const filterYear = filterDate.getFullYear();
    const filterMonth = filterDate.getMonth() + 1;
    query = query.or(`period_year.gt.${filterYear},and(period_year.eq.${filterYear},period_month.gte.${filterMonth})`);
  }

  if (selectedDepartment) {
    query = query.eq('employees.department_id', selectedDepartment);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PayrollReport[];
}
