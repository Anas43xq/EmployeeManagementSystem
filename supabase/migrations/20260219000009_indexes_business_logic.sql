-- Migration File 09: Indexes & Business Logic
-- Purpose: Create indexes and business logic functions for performance and data integrity
-- Dependencies: File 02 (leaves, attendance tables must exist for check_leave_overlap)
-- Created by: Migration Split Plan

-- ============================================================
-- CLEANUP
-- ============================================================

DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_leave_overlap_trigger ON public.leaves;
  DROP FUNCTION IF EXISTS public.get_last_performance_calculation_time() CASCADE;
  DROP FUNCTION IF EXISTS public.check_week_data_availability(DATE) CASCADE;
  DROP FUNCTION IF EXISTS public.select_employee_of_week(DATE, BOOLEAN) CASCADE;
  DROP FUNCTION IF EXISTS public.calculate_weekly_performance(DATE) CASCADE;
  DROP FUNCTION IF EXISTS public.calculate_leave_deductions(UUID, INTEGER, INTEGER) CASCADE;
  DROP FUNCTION IF EXISTS public.calculate_attendance_deductions(UUID, INTEGER, INTEGER) CASCADE;
  DROP FUNCTION IF EXISTS public.check_leave_overlap() CASCADE;
  DROP FUNCTION IF EXISTS public.calculate_working_days(DATE, DATE) CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_employees_department ON public.employees(department_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_email ON public.employees(email);

CREATE INDEX idx_users_employee_id ON public.users(employee_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_last_activity_at ON public.users(last_activity_at);

CREATE INDEX idx_leaves_status ON public.leaves(status);
CREATE INDEX idx_leaves_employee_status ON public.leaves(employee_id, status);
CREATE INDEX idx_leaves_employee_dates_status ON public.leaves(employee_id, start_date, end_date, status);
CREATE INDEX idx_leave_balances_employee ON public.leave_balances(employee_id);

CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_employee_date_status ON public.attendance(employee_id, date, status);

CREATE INDEX idx_notifications_realtime ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

CREATE INDEX idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;
CREATE INDEX idx_announcements_created ON public.announcements(created_at DESC);

CREATE INDEX idx_employee_tasks_status ON public.employee_tasks(status);
CREATE INDEX idx_employee_tasks_deadline ON public.employee_tasks(deadline);
CREATE INDEX idx_employee_tasks_assigned_by ON public.employee_tasks(assigned_by);
CREATE INDEX idx_employee_tasks_employee_id ON public.employee_tasks(employee_id);
CREATE INDEX idx_employee_tasks_employee_deadline_status ON public.employee_tasks(employee_id, deadline, status);

CREATE INDEX idx_employee_warnings_status ON public.employee_warnings(status);
CREATE INDEX idx_employee_warnings_severity ON public.employee_warnings(severity);
CREATE INDEX idx_employee_warnings_employee_created_status ON public.employee_warnings(employee_id, created_at, status)
  WHERE status IN ('active', 'acknowledged');

CREATE INDEX idx_employee_complaints_employee ON public.employee_complaints(employee_id);
CREATE INDEX idx_employee_complaints_status ON public.employee_complaints(status);
CREATE INDEX idx_employee_complaints_assigned ON public.employee_complaints(assigned_to);

CREATE INDEX idx_employee_performance_period ON public.employee_performance(period_start, period_end);
CREATE INDEX idx_employee_performance_emp_period ON public.employee_performance(employee_id, period_start DESC);
CREATE INDEX idx_employee_of_week_week ON public.employee_of_week(week_start);
CREATE INDEX idx_employee_of_week_employee ON public.employee_of_week(employee_id);

CREATE INDEX idx_passkeys_user ON public.passkeys(user_id);
CREATE INDEX idx_passkeys_credential ON public.passkeys(credential_id);

CREATE INDEX idx_login_attempts_otp_expiry ON public.login_attempts(user_id, otp_expires_at);
CREATE INDEX idx_login_attempt_limits_ip ON public.login_attempt_limits(ip_address);
CREATE INDEX idx_login_attempt_limits_window ON public.login_attempt_limits(window_start_at);

CREATE INDEX idx_payrolls_period ON public.payrolls(period_year, period_month);
CREATE INDEX idx_payrolls_status ON public.payrolls(status);
CREATE INDEX idx_payrolls_employee_period ON public.payrolls(employee_id, period_year DESC, period_month DESC);
CREATE INDEX idx_payrolls_employee_year_month_status ON public.payrolls(employee_id, period_year, period_month, status);
CREATE INDEX idx_bonuses_employee ON public.bonuses(employee_id);
CREATE INDEX idx_bonuses_period ON public.bonuses(period_year, period_month);
CREATE INDEX idx_bonuses_payroll ON public.bonuses(payroll_id);
CREATE INDEX idx_deductions_employee ON public.deductions(employee_id);
CREATE INDEX idx_deductions_period ON public.deductions(period_year, period_month);
CREATE INDEX idx_deductions_payroll ON public.deductions(payroll_id);

CREATE INDEX idx_faqs_category ON public.faqs(category) WHERE is_active = true;
CREATE INDEX idx_faqs_active ON public.faqs(is_active);
CREATE INDEX idx_faqs_created_by ON public.faqs(created_by);


-- ============================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================

-- Calculate Mon–Fri working days between two dates, inclusive
CREATE OR REPLACE FUNCTION calculate_working_days(p_start_date DATE, p_end_date DATE)
RETURNS INTEGER AS $$
  SELECT GREATEST(1, COUNT(*)::INTEGER)
  FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) d
  WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION calculate_working_days(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION check_leave_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict_count INTEGER;
  v_conflict_details TEXT;
BEGIN
  IF NEW.status NOT IN ('approved', 'pending') THEN
    RETURN NEW;
  END IF;

  NEW.days_count := calculate_working_days(NEW.start_date, NEW.end_date);

  SELECT COUNT(*),
         STRING_AGG(
           FORMAT('%s leave (%s to %s) - %s',
                  leave_type, start_date::TEXT, end_date::TEXT, status),
           '; '
         )
  INTO v_conflict_count, v_conflict_details
  FROM public.leaves
  WHERE employee_id = NEW.employee_id
    AND status IN ('approved', 'pending')
    AND NEW.start_date <= end_date
    AND NEW.end_date >= start_date
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Leave date conflict detected: Employee already has overlapping leave(s): %',
      v_conflict_details
      USING ERRCODE = 'P0001',
            HINT = 'Please choose different dates that do not overlap with existing approved or pending leaves.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_leave_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.leaves
  FOR EACH ROW
  EXECUTE FUNCTION check_leave_overlap();

CREATE OR REPLACE FUNCTION calculate_attendance_deductions(p_employee_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_working_days INTEGER;
  v_late_days INTEGER;
  v_absent_days INTEGER;
  v_base_salary NUMERIC;
  v_daily_salary NUMERIC;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

  SELECT salary INTO v_base_salary FROM public.employees WHERE id = p_employee_id;
  
  v_working_days := calculate_working_days(v_month_start, v_month_end);
  v_daily_salary := v_base_salary / NULLIF(v_working_days, 0);
  
  SELECT 
    COUNT(*) FILTER (WHERE status = 'late'), 
    COUNT(*) FILTER (WHERE status = 'absent')
  INTO v_late_days, v_absent_days
  FROM public.attendance
  WHERE employee_id = p_employee_id 
    AND date BETWEEN v_month_start AND v_month_end;
  
  RETURN COALESCE(
    (v_absent_days * COALESCE(v_daily_salary, 0)) + (v_late_days * COALESCE(v_daily_salary, 0) * 0.1),
    0
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Cross-month leaves are prorated per month; unpaid days = days beyond annual allowances
CREATE OR REPLACE FUNCTION calculate_leave_deductions(p_employee_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_unpaid_leave_days NUMERIC;
  v_base_salary NUMERIC;
  v_working_days INTEGER;
  v_daily_salary NUMERIC;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

  SELECT salary INTO v_base_salary FROM public.employees WHERE id = p_employee_id;

  v_working_days := calculate_working_days(v_month_start, v_month_end);
  v_daily_salary := v_base_salary / NULLIF(v_working_days, 0);

  WITH year_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN leave_type = 'annual' THEN days_count END), 0) AS annual_taken,
      COALESCE(SUM(CASE WHEN leave_type = 'sick'   THEN days_count END), 0) AS sick_taken,
      COALESCE(SUM(CASE WHEN leave_type = 'casual' THEN days_count END), 0) AS casual_taken
    FROM public.leaves
    WHERE employee_id = p_employee_id
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = p_year
  )
  SELECT COALESCE(SUM(
    CASE
      WHEN l.leave_type = 'annual' THEN
        GREATEST(0, yt.annual_taken - COALESCE(lb.annual_total, 20))
          * (calculate_working_days(GREATEST(l.start_date, v_month_start), LEAST(l.end_date, v_month_end))::NUMERIC
             / NULLIF(yt.annual_taken, 0))
      WHEN l.leave_type = 'sick' THEN
        GREATEST(0, yt.sick_taken - COALESCE(lb.sick_total, 10))
          * (calculate_working_days(GREATEST(l.start_date, v_month_start), LEAST(l.end_date, v_month_end))::NUMERIC
             / NULLIF(yt.sick_taken, 0))
      WHEN l.leave_type = 'casual' THEN
        GREATEST(0, yt.casual_taken - COALESCE(lb.casual_total, 10))
          * (calculate_working_days(GREATEST(l.start_date, v_month_start), LEAST(l.end_date, v_month_end))::NUMERIC
             / NULLIF(yt.casual_taken, 0))
      ELSE
        calculate_working_days(GREATEST(l.start_date, v_month_start), LEAST(l.end_date, v_month_end))
    END
  ), 0)
  INTO v_unpaid_leave_days
  FROM public.leaves l
  CROSS JOIN year_totals yt
  LEFT JOIN public.leave_balances lb ON lb.employee_id = l.employee_id AND lb.year = p_year
  WHERE l.employee_id = p_employee_id
    AND l.status = 'approved'
    AND (
      (l.start_date BETWEEN v_month_start AND v_month_end)
      OR (l.end_date BETWEEN v_month_start AND v_month_end)
      OR (l.start_date <= v_month_start AND l.end_date >= v_month_end)
    );

  RETURN COALESCE(v_unpaid_leave_days * COALESCE(v_daily_salary, 0), 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_weekly_performance(p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE)
RETURNS void AS $$
DECLARE
  p_week_end DATE;
BEGIN
  p_week_end := p_week_start + INTERVAL '6 days';

  INSERT INTO public.employee_performance (
    employee_id, period_start, period_end,
    attendance_score, task_score, warning_deduction, total_score,
    tasks_completed, tasks_overdue,
    attendance_days, absent_days, late_days,
    calculated_at
  )
  WITH 
  attendance_agg AS (
    SELECT 
      e.id AS employee_id,
      COALESCE(SUM(CASE WHEN a.status = 'present' THEN 10 WHEN a.status = 'late' THEN 5 ELSE 0 END), 0)::INTEGER AS attendance_score,
      COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0)::INTEGER AS attendance_days,
      COALESCE(SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END), 0)::INTEGER AS absent_days,
      COALESCE(SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END), 0)::INTEGER AS late_days
    FROM public.employees e
    LEFT JOIN public.attendance a 
      ON a.employee_id = e.id 
      AND a.date BETWEEN p_week_start AND p_week_end
    WHERE e.status = 'active'
    GROUP BY e.id
  ),
  task_agg AS (
    SELECT 
      e.id AS employee_id,
      COALESCE(SUM(
        CASE WHEN t.status = 'completed' 
          AND t.completed_at <= t.deadline + INTERVAL '1 day' 
          THEN t.points ELSE 0 
        END
      ), 0)::INTEGER AS task_score,
      COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0)::INTEGER AS tasks_completed,
      COALESCE(SUM(
        CASE WHEN t.status = 'overdue' 
          OR (t.status = 'completed' AND t.completed_at > t.deadline + INTERVAL '1 day') 
          THEN 1 ELSE 0 
        END
      ), 0)::INTEGER AS tasks_overdue
    FROM public.employees e
    LEFT JOIN public.employee_tasks t 
      ON t.employee_id = e.id 
      AND t.deadline BETWEEN p_week_start AND p_week_end
    WHERE e.status = 'active'
    GROUP BY e.id
  ),
  warning_agg AS (
    SELECT 
      e.id AS employee_id,
      COALESCE(SUM(
        CASE w.severity 
          WHEN 'minor'    THEN 10 
          WHEN 'moderate' THEN 20 
          WHEN 'major'    THEN 30 
          WHEN 'critical' THEN 50 
          ELSE 0 
        END
      ), 0)::INTEGER AS warning_deduction
    FROM public.employees e
    LEFT JOIN public.employee_warnings w 
      ON w.employee_id = e.id 
      AND w.created_at BETWEEN p_week_start AND p_week_end + INTERVAL '1 day'
      AND w.status IN ('active', 'acknowledged')
    WHERE e.status = 'active'
    GROUP BY e.id
  )
  SELECT 
    aa.employee_id, p_week_start, p_week_end,
    aa.attendance_score, ta.task_score, wa.warning_deduction,
    GREATEST(0, aa.attendance_score + ta.task_score - wa.warning_deduction)::INTEGER AS total_score,
    ta.tasks_completed, ta.tasks_overdue,
    aa.attendance_days, aa.absent_days, aa.late_days,
    now()
  FROM attendance_agg  aa
  JOIN task_agg        ta ON ta.employee_id = aa.employee_id
  JOIN warning_agg     wa ON wa.employee_id = aa.employee_id
  ON CONFLICT (employee_id, period_start, period_end) DO UPDATE SET
    attendance_score   = EXCLUDED.attendance_score,
    task_score         = EXCLUDED.task_score,
    warning_deduction  = EXCLUDED.warning_deduction,
    total_score        = EXCLUDED.total_score,
    tasks_completed    = EXCLUDED.tasks_completed,
    tasks_overdue      = EXCLUDED.tasks_overdue,
    attendance_days    = EXCLUDED.attendance_days,
    absent_days        = EXCLUDED.absent_days,
    late_days          = EXCLUDED.late_days,
    calculated_at      = now(),
    updated_at         = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION select_employee_of_week(
  p_week_start    DATE    DEFAULT date_trunc('week', CURRENT_DATE)::DATE,
  p_recalculate   BOOLEAN DEFAULT false
)
RETURNS void AS $$
DECLARE
  p_week_end DATE;
  v_top_employee_id UUID;
  v_top_score INTEGER;
  v_tied_count INTEGER;
  v_reason TEXT;
BEGIN
  p_week_end := p_week_start + INTERVAL '6 days';
  IF p_recalculate THEN
    PERFORM calculate_weekly_performance(p_week_start);
  END IF;

  SELECT ep.employee_id, ep.total_score INTO v_top_employee_id, v_top_score
  FROM public.employee_performance ep
  JOIN public.employees e ON e.id = ep.employee_id
  WHERE ep.period_start = p_week_start AND ep.period_end = p_week_end AND e.status = 'active'
  ORDER BY ep.total_score DESC, e.hire_date ASC LIMIT 1;

  IF v_top_employee_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_tied_count
    FROM public.employee_performance ep
    JOIN public.employees e ON e.id = ep.employee_id
    WHERE ep.period_start = p_week_start AND ep.period_end = p_week_end 
      AND e.status = 'active' AND ep.total_score = v_top_score;

    IF v_tied_count > 1 THEN
      v_reason := 'Tied for highest score (' || v_top_score || ' points) with ' || (v_tied_count - 1) || ' other(s), selected based on earliest hire date';
    ELSE
      v_reason := 'Highest performance score (' || v_top_score || ' points) for the week';
    END IF;

    INSERT INTO public.employee_of_week (employee_id, week_start, week_end, score, reason, is_auto_selected)
    VALUES (v_top_employee_id, p_week_start, p_week_end, v_top_score, v_reason, true)
    ON CONFLICT (week_start) DO UPDATE SET
      employee_id = EXCLUDED.employee_id, week_end = EXCLUDED.week_end, score = EXCLUDED.score,
      reason = EXCLUDED.reason, is_auto_selected = EXCLUDED.is_auto_selected;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION check_week_data_availability(p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE)
RETURNS jsonb AS $$
DECLARE
  p_week_end DATE;
  v_days_with_data INTEGER;
  v_result jsonb;
BEGIN
  p_week_end := p_week_start + INTERVAL '6 days';

  SELECT COUNT(DISTINCT DATE(a.date))
  INTO v_days_with_data
  FROM public.attendance a
  WHERE a.date BETWEEN p_week_start AND p_week_end;

  v_result := jsonb_build_object(
    'days_with_data', COALESCE(v_days_with_data, 0),
    'total_days', 7,
    'has_sufficient_data', COALESCE(v_days_with_data, 0) >= 1
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_last_performance_calculation_time()
RETURNS TIMESTAMPTZ AS $$
  SELECT MAX(calculated_at) FROM public.employee_performance;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_last_performance_calculation_time() TO authenticated;
