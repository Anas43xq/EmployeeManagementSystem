-- =============================================
-- PERFORMANCE, WARNINGS, COMPLAINTS, AND TASKS
-- Migration: 20260219100000
-- =============================================

-- =============================================
-- EMPLOYEE TASKS TABLE
-- HR/Admin assign tasks to employees with deadlines
-- =============================================
CREATE TABLE public.employee_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  deadline DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 10, -- Performance points for completing this task
  penalty_points INTEGER NOT NULL DEFAULT 5, -- Points deducted if overdue
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMPLOYEE WARNINGS TABLE
-- HR/Admin issue warnings to employees
-- =============================================
CREATE TABLE public.employee_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'appealed')),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMPLOYEE COMPLAINTS TABLE
-- Employees submit complaints
-- =============================================
CREATE TABLE public.employee_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'workplace', 'harassment', 'safety', 'policy', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMPLOYEE PERFORMANCE TABLE
-- Stores calculated performance scores per period
-- =============================================
CREATE TABLE public.employee_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  attendance_score INTEGER NOT NULL DEFAULT 0,
  task_score INTEGER NOT NULL DEFAULT 0,
  warning_deduction INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_overdue INTEGER NOT NULL DEFAULT 0,
  attendance_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, period_start, period_end)
);

-- =============================================
-- EMPLOYEE OF THE WEEK TABLE
-- Stores weekly top performer selection
-- =============================================
CREATE TABLE public.employee_of_week (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  is_auto_selected BOOLEAN NOT NULL DEFAULT true,
  selected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_employee_tasks_employee ON public.employee_tasks(employee_id);
CREATE INDEX idx_employee_tasks_status ON public.employee_tasks(status);
CREATE INDEX idx_employee_tasks_deadline ON public.employee_tasks(deadline);
CREATE INDEX idx_employee_tasks_assigned_by ON public.employee_tasks(assigned_by);

CREATE INDEX idx_employee_warnings_employee ON public.employee_warnings(employee_id);
CREATE INDEX idx_employee_warnings_status ON public.employee_warnings(status);
CREATE INDEX idx_employee_warnings_severity ON public.employee_warnings(severity);

CREATE INDEX idx_employee_complaints_employee ON public.employee_complaints(employee_id);
CREATE INDEX idx_employee_complaints_status ON public.employee_complaints(status);
CREATE INDEX idx_employee_complaints_assigned ON public.employee_complaints(assigned_to);

CREATE INDEX idx_employee_performance_employee ON public.employee_performance(employee_id);
CREATE INDEX idx_employee_performance_period ON public.employee_performance(period_start, period_end);

CREATE INDEX idx_employee_of_week_week ON public.employee_of_week(week_start);
CREATE INDEX idx_employee_of_week_employee ON public.employee_of_week(employee_id);

-- =============================================
-- UPDATE NOTIFICATIONS TYPE CONSTRAINT
-- =============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('leave', 'attendance', 'system', 'warning', 'task', 'complaint', 'performance'));

-- =============================================
-- AUTO-UPDATE TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_employee_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_tasks_updated_at_trigger
  BEFORE UPDATE ON public.employee_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_tasks_updated_at();

CREATE OR REPLACE FUNCTION update_employee_warnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_warnings_updated_at_trigger
  BEFORE UPDATE ON public.employee_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_warnings_updated_at();

CREATE OR REPLACE FUNCTION update_employee_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_complaints_updated_at_trigger
  BEFORE UPDATE ON public.employee_complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_complaints_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_of_week ENABLE ROW LEVEL SECURITY;

-- Employee Tasks Policies
CREATE POLICY "Admin and HR can manage all tasks"
  ON public.employee_tasks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'hr'))
  );

CREATE POLICY "Employees can view their own tasks"
  ON public.employee_tasks FOR SELECT
  USING (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Employees can update their own task status"
  ON public.employee_tasks FOR UPDATE
  USING (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

-- Employee Warnings Policies
CREATE POLICY "Admin and HR can manage all warnings"
  ON public.employee_warnings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'hr'))
  );

CREATE POLICY "Employees can view their own warnings"
  ON public.employee_warnings FOR SELECT
  USING (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Employees can acknowledge their own warnings"
  ON public.employee_warnings FOR UPDATE
  USING (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

-- Employee Complaints Policies
CREATE POLICY "Admin and HR can manage all complaints"
  ON public.employee_complaints FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'hr'))
  );

CREATE POLICY "Employees can create complaints"
  ON public.employee_complaints FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Employees can view their own complaints"
  ON public.employee_complaints FOR SELECT
  USING (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

-- Employee Performance Policies
CREATE POLICY "Admin and HR can manage performance"
  ON public.employee_performance FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'hr'))
  );

CREATE POLICY "Employees can view their own performance"
  ON public.employee_performance FOR SELECT
  USING (
    employee_id IN (SELECT employee_id FROM public.users WHERE id = auth.uid())
  );

-- Employee of Week Policies (everyone can view)
CREATE POLICY "Everyone can view employee of week"
  ON public.employee_of_week FOR SELECT
  USING (true);

CREATE POLICY "Admin and HR can manage employee of week"
  ON public.employee_of_week FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'hr'))
  );

-- =============================================
-- FUNCTION: Calculate Weekly Performance
-- =============================================
CREATE OR REPLACE FUNCTION calculate_weekly_performance(
  p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE
)
RETURNS void AS $$
DECLARE
  p_week_end DATE;
  emp RECORD;
  v_attendance_score INTEGER;
  v_task_score INTEGER;
  v_warning_deduction INTEGER;
  v_total_score INTEGER;
  v_tasks_completed INTEGER;
  v_tasks_overdue INTEGER;
  v_attendance_days INTEGER;
  v_absent_days INTEGER;
  v_late_days INTEGER;
BEGIN
  p_week_end := p_week_start + INTERVAL '6 days';

  FOR emp IN SELECT id FROM public.employees WHERE status = 'active'
  LOOP
    -- Calculate attendance score (10 points per present day, -5 for late)
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'present' THEN 10 WHEN status = 'late' THEN 5 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0)
    INTO v_attendance_score, v_attendance_days, v_absent_days, v_late_days
    FROM public.attendance
    WHERE employee_id = emp.id
      AND date BETWEEN p_week_start AND p_week_end;

    -- Calculate task score
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'completed' AND completed_at <= deadline + INTERVAL '1 day' THEN points ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'overdue' OR (status = 'completed' AND completed_at > deadline + INTERVAL '1 day') THEN 1 ELSE 0 END), 0)
    INTO v_task_score, v_tasks_completed, v_tasks_overdue
    FROM public.employee_tasks
    WHERE employee_id = emp.id
      AND deadline BETWEEN p_week_start AND p_week_end;

    -- Calculate warning deduction (10 per minor, 20 per moderate, 30 per major, 50 per critical)
    SELECT COALESCE(SUM(
      CASE severity
        WHEN 'minor' THEN 10
        WHEN 'moderate' THEN 20
        WHEN 'major' THEN 30
        WHEN 'critical' THEN 50
        ELSE 0
      END
    ), 0)
    INTO v_warning_deduction
    FROM public.employee_warnings
    WHERE employee_id = emp.id
      AND created_at BETWEEN p_week_start AND p_week_end + INTERVAL '1 day'
      AND status IN ('active', 'acknowledged');

    v_total_score := GREATEST(0, v_attendance_score + v_task_score - v_warning_deduction);

    -- Insert or update performance record
    INSERT INTO public.employee_performance (
      employee_id, period_start, period_end,
      attendance_score, task_score, warning_deduction, total_score,
      tasks_completed, tasks_overdue,
      attendance_days, absent_days, late_days,
      calculated_at
    ) VALUES (
      emp.id, p_week_start, p_week_end,
      v_attendance_score, v_task_score, v_warning_deduction, v_total_score,
      v_tasks_completed, v_tasks_overdue,
      v_attendance_days, v_absent_days, v_late_days,
      now()
    )
    ON CONFLICT (employee_id, period_start, period_end) DO UPDATE SET
      attendance_score = EXCLUDED.attendance_score,
      task_score = EXCLUDED.task_score,
      warning_deduction = EXCLUDED.warning_deduction,
      total_score = EXCLUDED.total_score,
      tasks_completed = EXCLUDED.tasks_completed,
      tasks_overdue = EXCLUDED.tasks_overdue,
      attendance_days = EXCLUDED.attendance_days,
      absent_days = EXCLUDED.absent_days,
      late_days = EXCLUDED.late_days,
      calculated_at = now(),
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Select Employee of the Week
-- =============================================
CREATE OR REPLACE FUNCTION select_employee_of_week(
  p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE
)
RETURNS void AS $$
DECLARE
  p_week_end DATE;
  v_top_employee_id UUID;
  v_top_score INTEGER;
  v_employee_name TEXT;
BEGIN
  p_week_end := p_week_start + INTERVAL '6 days';

  -- First calculate performance for the week
  PERFORM calculate_weekly_performance(p_week_start);

  -- Find employee with highest score
  SELECT ep.employee_id, ep.total_score, e.first_name || ' ' || e.last_name
  INTO v_top_employee_id, v_top_score, v_employee_name
  FROM public.employee_performance ep
  JOIN public.employees e ON e.id = ep.employee_id
  WHERE ep.period_start = p_week_start
    AND ep.period_end = p_week_end
    AND e.status = 'active'
  ORDER BY ep.total_score DESC, e.hire_date ASC
  LIMIT 1;

  -- Insert or update employee of week
  IF v_top_employee_id IS NOT NULL THEN
    INSERT INTO public.employee_of_week (
      employee_id, week_start, week_end, score, reason, is_auto_selected
    ) VALUES (
      v_top_employee_id, p_week_start, p_week_end, v_top_score,
      'Highest performance score (' || v_top_score || ' points) for the week',
      true
    )
    ON CONFLICT (week_start) DO UPDATE SET
      employee_id = EXCLUDED.employee_id,
      week_end = EXCLUDED.week_end,
      score = EXCLUDED.score,
      reason = EXCLUDED.reason,
      is_auto_selected = EXCLUDED.is_auto_selected;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
