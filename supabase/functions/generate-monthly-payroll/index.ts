import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PayrollCalculation {
  employeeId: string;
  baseSalary: number;
  totalBonuses: number;
  totalDeductions: number;
  attendanceDeductions: number;
  leaveDeductions: number;
  grossSalary: number;
  netSalary: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header', hint: 'Please ensure you are logged in' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      authHeader = `Bearer ${authHeader}`;
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Error fetching user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData || !['admin', 'hr'].includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', role: userData?.role || 'unknown' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { action, ...payload } = await req.json();

    if (action === 'generate-payroll') {
      const { month, year, employeeIds } = payload as {
        month: number;
        year: number;
        employeeIds?: string[];
      };

      if (!month || !year || month < 1 || month > 12 || year < 2020) {
        return new Response(
          JSON.stringify({ error: 'Invalid month or year' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      let employeeQuery = supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, salary, status')
        .eq('status', 'active');

      if (employeeIds && employeeIds.length > 0) {
        employeeQuery = employeeQuery.in('id', employeeIds);
      }

      const { data: employees, error: empError } = await employeeQuery;

      if (empError || !employees?.length) {
        return new Response(
          JSON.stringify({ error: 'No active employees found', details: empError?.message }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const results = [];
      const errors = [];

      for (const employee of employees) {
        try {
          const { data: existingPayroll } = await supabaseAdmin
            .from('payrolls')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('period_month', month)
            .eq('period_year', year)
            .single();

          if (existingPayroll) {
            errors.push(`Payroll already exists for ${employee.first_name} ${employee.last_name}`);
            continue;
          }

          const calculation = await calculateEmployeePayroll(supabaseAdmin, employee, month, year);

          const { data: payrollRecord, error: payrollError } = await supabaseAdmin
            .from('payrolls')
            .insert({
              employee_id: employee.id,
              period_month: month,
              period_year: year,
              base_salary: calculation.baseSalary,
              total_bonuses: calculation.totalBonuses,
              total_deductions: calculation.totalDeductions,
              gross_salary: calculation.grossSalary,
              net_salary: calculation.netSalary,
              status: 'draft',
              notes: `Attendance deductions: $${calculation.attendanceDeductions}, Leave deductions: $${calculation.leaveDeductions}`
            })
            .select()
            .single();

          if (payrollError) {
            errors.push(`Failed to create payroll for ${employee.first_name} ${employee.last_name}: ${payrollError.message}`);
            continue;
          }

          results.push({
            employee: `${employee.first_name} ${employee.last_name}`,
            payroll: payrollRecord,
            calculation
          });

        } catch (error) {
          errors.push(`Error processing ${employee.first_name} ${employee.last_name}: ${error.message}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: results.length > 0,
          message: results.length > 0
            ? `Processed ${results.length} employees`
            : `All ${employees.length} employees already have payroll records for this period`,
          results,
          errors: errors.length > 0 ? errors : null
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (action === 'calculate-employee') {
      const { employeeId, month, year } = payload as {
        employeeId: string;
        month: number;
        year: number;
      };

      if (!employeeId || !month || !year) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const { data: employee, error: empError } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        return new Response(
          JSON.stringify({ error: 'Employee not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const calculation = await calculateEmployeePayroll(supabaseAdmin, employee, month, year);

      return new Response(
        JSON.stringify({
          success: true,
          employee: `${employee.first_name} ${employee.last_name}`,
          calculation
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (action === 'approve-payroll') {
      const { payrollIds } = payload as { payrollIds: string[] };

      if (!payrollIds || payrollIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No payroll IDs provided' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const { data: approvedPayrolls, error: approveError } = await supabaseAdmin
        .from('payrolls')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', payrollIds)
        .eq('status', 'draft')
        .select();

      if (approveError) {
        return new Response(
          JSON.stringify({ error: 'Failed to approve payrolls', details: approveError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Approved ${approvedPayrolls.length} payroll records`,
          payrolls: approvedPayrolls
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function calculateEmployeePayroll(
  supabaseClient: any,
  employee: any,
  month: number,
  year: number
): Promise<PayrollCalculation> {
  const baseSalary = Number(employee.salary) || 0;

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let workingDays = 0;

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  const dailySalary = baseSalary / workingDays;

  const { data: attendanceRecords } = await supabaseClient
    .from('attendance')
    .select('*')
    .eq('employee_id', employee.id)
    .gte('date', firstDay.toISOString().split('T')[0])
    .lte('date', lastDay.toISOString().split('T')[0]);

  let attendanceDeductions = 0;
  const absentDays = attendanceRecords?.filter(a => a.status === 'absent').length || 0;
  const lateDays = attendanceRecords?.filter(a => a.status === 'late').length || 0;

  attendanceDeductions += absentDays * dailySalary;
  attendanceDeductions += lateDays * dailySalary * 0.1;

  const { data: leaveRecords } = await supabaseClient
    .from('leaves')
    .select('*, leave_balances!inner(*)')
    .eq('employee_id', employee.id)
    .eq('status', 'approved')
    .eq('leave_balances.year', year)
    .or(
      `and(start_date.gte.${firstDay.toISOString().split('T')[0]},start_date.lte.${lastDay.toISOString().split('T')[0]}),` +
      `and(end_date.gte.${firstDay.toISOString().split('T')[0]},end_date.lte.${lastDay.toISOString().split('T')[0]})`
    );

  let leaveDeductions = 0;
  if (leaveRecords) {
    for (const leave of leaveRecords) {
      const balance = leave.leave_balances[0];
      let unpaidDays = 0;

      switch (leave.leave_type) {
        case 'annual':
          unpaidDays = Math.max(0, leave.days_count - (balance?.annual_total - balance?.annual_used || 0));
          break;
        case 'sick':
          unpaidDays = Math.max(0, leave.days_count - (balance?.sick_total - balance?.sick_used || 0));
          break;
        case 'casual':
          unpaidDays = Math.max(0, leave.days_count - (balance?.casual_total - balance?.casual_used || 0));
          break;
        default:
          unpaidDays = leave.days_count;
      }

      leaveDeductions += unpaidDays * dailySalary;
    }
  }

  const { data: bonusRecords } = await supabaseClient
    .from('bonuses')
    .select('amount')
    .eq('employee_id', employee.id)
    .eq('period_month', month)
    .eq('period_year', year);

  const totalBonuses = bonusRecords?.reduce((sum, bonus) => sum + Number(bonus.amount), 0) || 0;

  const { data: deductionRecords } = await supabaseClient
    .from('deductions')
    .select('amount')
    .eq('employee_id', employee.id)
    .eq('period_month', month)
    .eq('period_year', year);

  const manualDeductions = deductionRecords?.reduce((sum, deduction) => sum + Number(deduction.amount), 0) || 0;

  const totalDeductions = attendanceDeductions + leaveDeductions + manualDeductions;
  const grossSalary = baseSalary + totalBonuses;
  const netSalary = grossSalary - totalDeductions;

  return {
    employeeId: employee.id,
    baseSalary,
    totalBonuses,
    totalDeductions,
    attendanceDeductions,
    leaveDeductions,
    grossSalary,
    netSalary: Math.max(0, netSalary)
  };
}