import { createNotification } from './notifications';


export async function createPerformanceNotification(
  userId: string,
  type: 'warning_updated' | 'employee_of_week',
  details?: { severity?: string; weekDate?: string }
) {
  if (type === 'warning_updated') {
    return await createNotification(
      userId,
      'Performance Warning',
      `Your performance score has been affected due to a ${details?.severity || 'recent'} warning.`,
      'performance'
    );
  } else if (type === 'employee_of_week') {
    return await createNotification(
      userId,
      'Congratulations! 🎉',
      `You have been selected as the Employee of the Week for ${details?.weekDate || 'this week'}!`,
      'performance'
    );
  }
}




import { db } from '../lib/db';
import { supabase } from './supabase';
import type { EmployeePerformance } from '../types';
import { mapEmployeeOfWeekRecord } from '../utils/employeeMappers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase as any;


async function triggerWeeklyPerformanceCalculation(weekStart?: string): Promise<void> {
  try {
    await rpc.rpc('calculate_weekly_performance', {
      p_week_start: weekStart,
    });
  } catch (_err: unknown) {

  }
}

export async function getPerformanceRecords(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = db
    .from('employee_performance')
    .select(`
      *,
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, position)
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
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, position)
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
      employees!employee_performance_employee_id_fkey (id, first_name, last_name, position, hire_date)
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

    if (!latestPeriod?.period_start) {

      await triggerWeeklyPerformanceCalculation();


      const { data: newPeriodData } = await db
        .from('employee_performance')
        .select('period_start')
        .order('period_start', { ascending: false })
        .limit(1);

      const newLatestPeriod = newPeriodData?.[0] ?? null;
      if (!newLatestPeriod?.period_start) return [];

      query = query.eq('period_start', newLatestPeriod.period_start);
    } else {
      query = query.eq('period_start', latestPeriod.period_start);
    }
  }

  const { data, error } = await query
    .order('total_score', { ascending: false })
    .limit(50);

  if (error) return [];

  const sortedData = (data || []).sort((a: unknown, b: unknown) => {
    const aData = a as Record<string, unknown> & { total_score?: number; employees?: { hire_date?: string } };
    const bData = b as Record<string, unknown> & { total_score?: number; employees?: { hire_date?: string } };
    if ((bData.total_score ?? 0) !== (aData.total_score ?? 0)) {
      return (bData.total_score ?? 0) - (aData.total_score ?? 0);
    }
    const aHireDate = aData.employees?.hire_date ? new Date(aData.employees.hire_date).getTime() : Infinity;
    const bHireDate = bData.employees?.hire_date ? new Date(bData.employees.hire_date).getTime() : Infinity;
    return aHireDate - bHireDate;
  });

  return sortedData.slice(0, 10) as EmployeePerformance[];
}

export async function getEmployeeOfWeek(weekStart?: string) {
  let query = db
    .from('employee_of_week')
    .select(`*, employees (*)`);

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  } else {
    query = query.order('week_start', { ascending: false }).limit(1);
  }

  const { data, error } = await query;
  if (error) return null;

  if (!data?.[0]) {

    await triggerWeeklyPerformanceCalculation();

    try {
      await rpc.rpc('select_employee_of_week', {});
    } catch (_err) { }


    const { data: newData } = await db
      .from('employee_of_week')
      .select(`*, employees (*)`)
      .order('week_start', { ascending: false })
      .limit(1);

    return newData?.[0] ? mapEmployeeOfWeekRecord(newData[0]) : null;
  }

  return mapEmployeeOfWeekRecord(data[0]);
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

