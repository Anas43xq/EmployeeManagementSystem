import { db, supabase } from '../supabase';
import type { EmployeePerformance } from '../../types';
import { mapEmployeeOfWeekRecord } from '../../utils/employeeMappers';

export async function getPerformanceRecords(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = db
    .from('employee_performance')
    .select(`
      *,
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, photo_url, position)
    `)
    .order('period_start', { ascending: false });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.startDate) {
    query = query.gte('period_start', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('period_end', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeePerformance[];
}

export async function getLatestPerformance(limit: number = 10) {
  const { data, error } = await db
    .from('employee_performance')
    .select(`
      *,
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, photo_url, position)
    `)
    .order('period_start', { ascending: false })
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as EmployeePerformance[];
}

export async function getTopPerformers(weekStart?: string) {
  let query = db
    .from('employee_performance')
    .select(`
      *,
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, photo_url, position, hire_date)
    `);

  if (weekStart) {
    query = query.eq('period_start', weekStart);
  } else {
    const { data: periodData } = await db
      .from('employee_performance')
      .select('period_start')
      .order('period_start', { ascending: false })
      .limit(1);

    const latestPeriod = periodData?.[0] ?? null;

    if (latestPeriod?.period_start) {
      query = query.eq('period_start', latestPeriod.period_start);
    }
  }

  const { data, error } = await query
    .order('total_score', { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  // Sort by score DESC, then by hire_date ASC for consistent tie-breaking with Employee of Week
  const sortedData = (data || []).sort((a: unknown, b: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aData = a as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bData = b as any;
    // First, sort by total_score descending
    if (bData.total_score !== aData.total_score) {
      return bData.total_score - aData.total_score;
    }
    // If scores are equal, sort by hire_date ascending (earliest first)
    const aHireDate = aData.employees?.hire_date ? new Date(aData.employees.hire_date).getTime() : Infinity;
    const bHireDate = bData.employees?.hire_date ? new Date(bData.employees.hire_date).getTime() : Infinity;
    return aHireDate - bHireDate;
  });

  return sortedData.slice(0, 10) as EmployeePerformance[];
}

export async function getEmployeeOfWeek(weekStart?: string) {
  let query = db
    .from('employee_of_week')
    .select(`
      *,
      employees (*)
    `);

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  } else {
    query = query.order('week_start', { ascending: false }).limit(1);
  }

  const { data, error } = await query;
  if (error) {
    return null;
  }
  return data?.[0] ? mapEmployeeOfWeekRecord(data[0]) : null;
}

export async function getEmployeeOfWeekHistory(limit: number = 10) {
  const { data, error } = await db
    .from('employee_of_week')
    .select(`
      *,
      employees (*)
    `)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapEmployeeOfWeekRecord);
}

export async function setEmployeeOfWeek(
  employeeId: string,
  weekStart: string,
  reason: string,
  selectedBy: string
) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data, error } = await db
    .from('employee_of_week')
    .upsert([{
      employee_id: employeeId,
      week_start: weekStart,
      week_end: weekEnd.toISOString().split('T')[0],
      reason,
      is_auto_selected: false,
      selected_by: selectedBy,
      score: 0,
    }], { onConflict: 'week_start' })
    .select(`
      *,
      employees (*)
    `)
    .single();

  if (error) throw error;
  return mapEmployeeOfWeekRecord(data);
}

export async function getMyTotalPoints(employeeId: string): Promise<number> {
  try {
    const { data, error } = await db
      .from('employee_performance')
      .select('total_score')
      .eq('employee_id', employeeId);

    if (error) {
      return 0;
    }

    const totalPoints = (data || []).reduce((sum: number, record: { total_score: number }) => {
      return sum + (record.total_score || 0);
    }, 0);

    return totalPoints;
  } catch {
    return 0;
  }
}

export async function getWeeklyDataAvailability(weekStart: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('check_week_data_availability', {
      p_week_start: weekStart,
    });

    if (error) throw error;

    return data as {
      days_with_data: number;
      total_days: number;
      has_sufficient_data: boolean;
    };
  } catch (_error) {
    // Return default insufficient data on error
    return {
      days_with_data: 0,
      total_days: 7,
      has_sufficient_data: false,
    };
  }
}

export async function getLastPerformanceCalculationTime(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_last_performance_calculation_time');
  if (error || !data) {
    return null;
  }

  return data as string;
}

export async function calculateWeeklyPerformance(weekStart: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('calculate_weekly_performance', { p_week_start: weekStart });
  if (error) throw error;
}

export async function selectEmployeeOfWeek(weekStart: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('select_employee_of_week', { p_week_start: weekStart });
  if (error) throw error;
}
