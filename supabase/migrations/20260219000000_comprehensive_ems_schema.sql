-- ============================================================
-- CLEANUP
-- ============================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_departments_updated_at_trigger ON public.departments;
  DROP TRIGGER IF EXISTS update_employees_updated_at_trigger ON public.employees;
  DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;
  DROP TRIGGER IF EXISTS update_leaves_updated_at_trigger ON public.leaves;
  DROP TRIGGER IF EXISTS update_leave_balances_updated_at_trigger ON public.leave_balances;
  DROP TRIGGER IF EXISTS update_attendance_updated_at_trigger ON public.attendance;
  DROP TRIGGER IF EXISTS update_payrolls_updated_at_trigger ON public.payrolls;
  DROP TRIGGER IF EXISTS update_bonuses_updated_at_trigger ON public.bonuses;
  DROP TRIGGER IF EXISTS update_deductions_updated_at_trigger ON public.deductions;
  DROP TRIGGER IF EXISTS update_user_preferences_updated_at_trigger ON public.user_preferences;
  DROP TRIGGER IF EXISTS update_employee_performance_updated_at_trigger ON public.employee_performance;
  DROP TRIGGER IF EXISTS update_announcements_updated_at_trigger ON public.announcements;
  DROP TRIGGER IF EXISTS update_employee_tasks_updated_at_trigger ON public.employee_tasks;
  DROP TRIGGER IF EXISTS update_employee_warnings_updated_at_trigger ON public.employee_warnings;
  DROP TRIGGER IF EXISTS update_employee_complaints_updated_at_trigger ON public.employee_complaints;
  DROP TRIGGER IF EXISTS update_login_attempts_updated_at_trigger ON public.login_attempts;
  DROP TRIGGER IF EXISTS sync_auth_email_on_employee_update ON public.employees;
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
  DROP TRIGGER IF EXISTS check_leave_overlap_trigger ON public.leaves;
  DROP TRIGGER IF EXISTS faqs_updated_at_trigger ON public.faqs;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DROP TABLE IF EXISTS public.employee_of_week CASCADE;
DROP TABLE IF EXISTS public.employee_performance CASCADE;
DROP TABLE IF EXISTS public.employee_complaints CASCADE;
DROP TABLE IF EXISTS public.employee_warnings CASCADE;
DROP TABLE IF EXISTS public.employee_tasks CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.deductions CASCADE;
DROP TABLE IF EXISTS public.bonuses CASCADE;
DROP TABLE IF EXISTS public.payrolls CASCADE;
DROP TABLE IF EXISTS public.login_attempt_limits CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.passkeys CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.faqs CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;

DROP SEQUENCE IF EXISTS employee_number_seq CASCADE;

DROP FUNCTION IF EXISTS generate_employee_number() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS sync_auth_email_from_employee() CASCADE;
DROP FUNCTION IF EXISTS handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_email_change() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_user_employee_id() CASCADE;
DROP FUNCTION IF EXISTS get_user_email() CASCADE;
DROP FUNCTION IF EXISTS calculate_weekly_performance(DATE) CASCADE;
DROP FUNCTION IF EXISTS select_employee_of_week(DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_attendance_deductions(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_leave_deductions(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_leave_overlap() CASCADE;
DROP FUNCTION IF EXISTS calculate_working_days(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_last_performance_calculation_time() CASCADE;
DROP FUNCTION IF EXISTS notify_role_users(TEXT, TEXT, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS notify_role_users(TEXT, TEXT, TEXT, TEXT[], UUID) CASCADE;
DROP FUNCTION IF EXISTS get_role_user_emails(TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS get_role_user_emails(TEXT[], UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_own_session_token() CASCADE;
DROP FUNCTION IF EXISTS public.set_own_session_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.clear_own_session_token() CASCADE;
DROP FUNCTION IF EXISTS public.get_progressive_delay_seconds(INT) CASCADE;
DROP FUNCTION IF EXISTS public.get_seconds_until_retry(TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_login_limits() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_login_attempts() CASCADE;
DROP FUNCTION IF EXISTS public.pre_auth_login_check(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_failed_login(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_ip_mac_limits(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reset_login_attempts_rpc(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.validate_otp_request_cooldown(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_faqs_updated_at() CASCADE;


-- ============================================================
-- EXTENSIONS & SEQUENCES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;

CREATE SEQUENCE IF NOT EXISTS employee_number_seq START 1;


-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'EMP' || LPAD(nextval('employee_number_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Progressive login delay: 0s → 5s → 15s → 30s
CREATE OR REPLACE FUNCTION public.get_progressive_delay_seconds(attempt_count INT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN attempt_count < 2 THEN 0
    WHEN attempt_count = 2 THEN 5
    WHEN attempt_count = 3 THEN 15
    ELSE 30
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_seconds_until_retry(delay_until_ts TIMESTAMPTZ)
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(GREATEST(0, EXTRACT(EPOCH FROM (delay_until_ts - now()))::INT), 0);
$$;

CREATE OR REPLACE FUNCTION public.notify_role_users(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'system',
  p_roles TEXT[] DEFAULT ARRAY['admin', 'hr'],
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT u.id, p_title, p_message, p_type
  FROM public.users u
  WHERE u.role = ANY(p_roles)
    AND u.is_active = true
    AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_role_users(TEXT, TEXT, TEXT, TEXT[], UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_role_user_emails(
  p_roles TEXT[] DEFAULT ARRAY['admin', 'hr'],
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, e.email
  FROM public.users u
  JOIN public.employees e ON u.employee_id = e.id
  WHERE u.role = ANY(p_roles)
    AND u.is_active = true
    AND e.email IS NOT NULL AND e.email != ''
    AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_role_user_emails(TEXT[], UUID) TO authenticated;


-- ============================================================
-- SESSION TOKEN FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_own_session_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT current_session_token INTO v_token
  FROM public.users
  WHERE id = auth.uid();
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_own_session_token(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET current_session_token = p_token
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_own_session_token()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET current_session_token = NULL
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_own_session_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_session_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_own_session_token() TO authenticated;


-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('academic', 'administrative')),
  head_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT UNIQUE NOT NULL DEFAULT generate_employee_number(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave')),
  hire_date DATE NOT NULL,
  termination_date DATE,
  salary NUMERIC(12,2) DEFAULT 0,
  photo_url TEXT,
  qualifications JSONB DEFAULT '[]'::jsonb,
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.departments ADD CONSTRAINT fk_department_head 
  FOREIGN KEY (head_id) REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'hr', 'staff')),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  banned_at TIMESTAMPTZ DEFAULT NULL,
  ban_reason TEXT DEFAULT NULL,
  current_session_token TEXT DEFAULT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_leave_approvals BOOLEAN DEFAULT true,
  email_attendance_reminders BOOLEAN DEFAULT true,
  email_warnings BOOLEAN DEFAULT true,
  email_tasks BOOLEAN DEFAULT true,
  email_complaints BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  visible_to TEXT[] NOT NULL DEFAULT ARRAY['staff', 'hr', 'admin'],
  faq_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ============================================================
-- LEAVE MANAGEMENT
-- ============================================================

CREATE TABLE public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'casual', 'sabbatical')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  annual_total INTEGER DEFAULT 20,
  annual_used INTEGER DEFAULT 0,
  sick_total INTEGER DEFAULT 10,
  sick_used INTEGER DEFAULT 0,
  casual_total INTEGER DEFAULT 10,
  casual_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, year)
);


-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half-day')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);


-- ============================================================
-- PAYROLL
-- ============================================================

CREATE TABLE public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  notes TEXT DEFAULT '',
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

CREATE TABLE public.bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES public.payrolls(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('overtime', 'performance', 'allowance', 'commission', 'bonus', 'holiday')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES public.payrolls(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('tax', 'insurance', 'retirement', 'late', 'absence', 'unpaid_leave', 'penalty', 'loan')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- PERFORMANCE TRACKING
-- ============================================================

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


-- ============================================================
-- EMPLOYEE ENGAGEMENT (TASKS, WARNINGS, COMPLAINTS)
-- ============================================================

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
  points INTEGER NOT NULL DEFAULT 10,
  penalty_points INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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


-- ============================================================
-- NOTIFICATIONS, ANNOUNCEMENTS & ACTIVITY LOGS
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('leave', 'attendance', 'system', 'warning', 'task', 'complaint', 'performance')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- AUTHENTICATION & SECURITY
-- ============================================================

CREATE TABLE public.passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- After 5 failed attempts → OTP sent; OTP valid for 10 minutes
CREATE TABLE public.login_attempts (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts         INT         NOT NULL DEFAULT 0,
  last_attempt_at         TIMESTAMPTZ,
  otp_sent_at             TIMESTAMPTZ,
  otp_expires_at          TIMESTAMPTZ,
  otp_verification_attempts INT       NOT NULL DEFAULT 0,
  last_otp_request_at     TIMESTAMPTZ,
  delay_until             TIMESTAMPTZ DEFAULT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Keyed on IP only; user_agent stored for diagnostics, not enforcement
CREATE TABLE public.login_attempt_limits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address          TEXT        NOT NULL,
  user_agent          TEXT        NOT NULL,
  failed_attempts     INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_start_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ip_address)
);

CREATE OR REPLACE FUNCTION public.refresh_otp_expiry(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_now     TIMESTAMPTZ := now();
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE public.login_attempts
    SET otp_sent_at = v_now, 
        otp_expires_at = v_now + INTERVAL '10 minutes',
        otp_verification_attempts = 0,
        last_otp_request_at = v_now,
        updated_at = v_now
    WHERE user_id = v_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_otp_expiry(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_expired_login_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempt_limits
  WHERE window_start_at + INTERVAL '5 minutes' < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE updated_at + INTERVAL '24 hours' < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.pre_auth_login_check(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id           UUID;
  v_record            RECORD;
  v_failed            INT;
  v_remaining         INT;
  v_requires          BOOLEAN;
  v_seconds           INT;
  v_delay_until       TIMESTAMPTZ;
  v_seconds_until_retry INT;
  v_threshold         INT := 5;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', NULL, 'failed_attempts', 0, 'attempts_remaining', v_threshold,
      'requires_otp', false, 'otp_expires_at', NULL, 'otp_seconds_left', 0,
      'delay_until', NULL, 'seconds_until_retry', 0
    );
  END IF;

  SELECT * INTO v_record FROM public.login_attempts WHERE user_id = v_user_id;

  v_failed              := COALESCE(v_record.failed_attempts, 0);
  v_remaining           := GREATEST(0, v_threshold - v_failed);
  v_requires            := v_failed >= v_threshold;
  v_seconds             := 0;
  v_delay_until         := v_record.delay_until;
  v_seconds_until_retry := COALESCE(public.get_seconds_until_retry(v_delay_until), 0);

  IF v_requires AND v_record.otp_expires_at IS NOT NULL THEN
    v_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_record.otp_expires_at - now()))::INT);
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id, 'failed_attempts', v_failed, 'attempts_remaining', v_remaining,
    'requires_otp', v_requires, 'otp_expires_at', v_record.otp_expires_at,
    'otp_seconds_left', v_seconds, 'delay_until', v_delay_until,
    'seconds_until_retry', v_seconds_until_retry
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id           UUID;
  v_new_fails         INT;
  v_remaining         INT;
  v_requires          BOOLEAN;
  v_seconds           INT := 0;
  v_threshold         INT := 5;
  v_otp_minutes       INT := 10;
  v_otp_expires       TIMESTAMPTZ;
  v_now               TIMESTAMPTZ := now();
  v_delay_seconds     INT;
  v_delay_until       TIMESTAMPTZ;
  v_seconds_until_retry INT;
BEGIN
  PERFORM public.cleanup_expired_login_limits();

  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', NULL, 'failed_attempts', 0, 'attempts_remaining', v_threshold,
      'requires_otp', false, 'otp_expires_at', NULL, 'otp_seconds_left', 0,
      'delay_until', NULL, 'seconds_until_retry', 0
    );
  END IF;

  INSERT INTO public.login_attempts (user_id, failed_attempts, last_attempt_at)
  VALUES (v_user_id, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE
    SET failed_attempts = login_attempts.failed_attempts + 1,
        last_attempt_at = v_now, updated_at = v_now
    RETURNING failed_attempts INTO v_new_fails;

  v_delay_seconds := public.get_progressive_delay_seconds(v_new_fails);
  
  IF v_new_fails < v_threshold THEN
    v_delay_until := v_now + (v_delay_seconds || ' seconds')::INTERVAL;
  ELSE
    v_delay_until := NULL;
  END IF;

  IF v_new_fails = v_threshold THEN
    v_otp_expires := v_now + (v_otp_minutes || ' minutes')::INTERVAL;
    UPDATE public.login_attempts
    SET otp_sent_at = v_now, otp_expires_at = v_otp_expires,
        otp_verification_attempts = 0,
        last_otp_request_at = v_now,
        delay_until = v_delay_until, updated_at = v_now
    WHERE user_id = v_user_id;
  ELSE
    UPDATE public.login_attempts
    SET delay_until = v_delay_until, updated_at = v_now
    WHERE user_id = v_user_id
    RETURNING otp_expires_at INTO v_otp_expires;
  END IF;

  v_remaining := GREATEST(0, v_threshold - v_new_fails);
  v_requires  := v_new_fails >= v_threshold;
  v_seconds_until_retry := COALESCE(public.get_seconds_until_retry(v_delay_until), 0);

  IF v_requires AND v_otp_expires IS NOT NULL THEN
    v_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_otp_expires - v_now))::INT);
  END IF;

  BEGIN
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (v_user_id, 'user_login_failed', 'user', v_user_id,
      jsonb_build_object(
        'email', p_email, 
        'failed_attempts', v_new_fails, 
        'requires_otp', v_requires,
        'delay_seconds', v_delay_seconds,
        'seconds_until_retry', v_seconds_until_retry
      ));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'user_id', v_user_id, 'failed_attempts', v_new_fails, 'attempts_remaining', v_remaining,
    'requires_otp', v_requires, 'otp_expires_at', v_otp_expires, 'otp_seconds_left', v_seconds,
    'delay_until', v_delay_until, 'seconds_until_retry', v_seconds_until_retry
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_ip_mac_limits(
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_now               TIMESTAMPTZ := now();
  v_failed            INT;
  v_remaining         INT;
  v_allowed           BOOLEAN;
  v_limit             INT := 5;
  v_window_minutes    INT := 5;
  v_window_reset_at   TIMESTAMPTZ;
BEGIN
  PERFORM public.cleanup_expired_login_limits();

  INSERT INTO public.login_attempt_limits (ip_address, user_agent, failed_attempts, last_attempt_at, window_start_at)
  VALUES (p_ip_address, p_user_agent, 1, v_now, v_now)
  ON CONFLICT (ip_address) DO UPDATE
    SET failed_attempts = login_attempt_limits.failed_attempts + 1,
        user_agent      = EXCLUDED.user_agent,
        last_attempt_at = v_now, updated_at = v_now
    WHERE window_start_at + (v_window_minutes || ' minutes')::INTERVAL > v_now
  RETURNING failed_attempts INTO v_failed;

  IF v_failed IS NULL THEN
    SELECT failed_attempts INTO v_failed FROM public.login_attempt_limits
    WHERE ip_address = p_ip_address;
  END IF;

  v_failed    := COALESCE(v_failed, 0);
  v_remaining := GREATEST(0, v_limit - v_failed);
  v_allowed   := v_failed < v_limit;
  
  SELECT window_start_at + (v_window_minutes || ' minutes')::INTERVAL 
  INTO v_window_reset_at
  FROM public.login_attempt_limits
  WHERE ip_address = p_ip_address;

  IF NOT v_allowed AND p_email IS NOT NULL THEN
    BEGIN
      INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
      SELECT u.id, 'ip_mac_limit_exceeded', 'user', u.id,
        jsonb_build_object(
          'ip_address', p_ip_address,
          'failed_attempts', v_failed,
          'limit', v_limit,
          'window_minutes', v_window_minutes
        )
      FROM auth.users u WHERE email = lower(p_email)
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'failed_attempts', v_failed,
    'attempts_remaining', v_remaining,
    'limit', v_limit,
    'window_minutes', v_window_minutes,
    'window_reset_at', v_window_reset_at,
    'seconds_until_reset', GREATEST(0, EXTRACT(EPOCH FROM (v_window_reset_at - v_now))::INT)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_login_attempts_rpc(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_attempts
  SET failed_attempts = 0, last_attempt_at = NULL,
      otp_sent_at = NULL, otp_expires_at = NULL, 
      otp_verification_attempts = 0,
      last_otp_request_at = NULL,
      delay_until = NULL, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_otp_request_cooldown(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_last_request TIMESTAMPTZ;
  v_cooldown_seconds INT := 60;
  v_seconds_remaining INT;
  v_is_allowed BOOLEAN;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'seconds_remaining', 0);
  END IF;
  
  SELECT last_otp_request_at INTO v_last_request 
  FROM public.login_attempts 
  WHERE user_id = v_user_id;
  
  IF v_last_request IS NULL THEN
    v_seconds_remaining := 0;
    v_is_allowed := true;
  ELSE
    v_seconds_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_last_request + (v_cooldown_seconds || ' seconds')::INTERVAL - now()))::INT);
    v_is_allowed := v_seconds_remaining = 0;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'seconds_remaining', v_seconds_remaining,
    'cooldown_seconds', v_cooldown_seconds
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ip_mac_limits(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_progressive_delay_seconds(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_seconds_until_retry(TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.pre_auth_login_check(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts_rpc(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_otp_request_cooldown(TEXT) TO anon, authenticated;


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
-- TRIGGERS (updated_at)
-- ============================================================

CREATE TRIGGER update_departments_updated_at_trigger
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at_trigger
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaves_updated_at_trigger
  BEFORE UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at_trigger
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at_trigger
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payrolls_updated_at_trigger
  BEFORE UPDATE ON public.payrolls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bonuses_updated_at_trigger
  BEFORE UPDATE ON public.bonuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deductions_updated_at_trigger
  BEFORE UPDATE ON public.deductions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at_trigger
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_performance_updated_at_trigger
  BEFORE UPDATE ON public.employee_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at_trigger
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_tasks_updated_at_trigger
  BEFORE UPDATE ON public.employee_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_warnings_updated_at_trigger
  BEFORE UPDATE ON public.employee_warnings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_complaints_updated_at_trigger
  BEFORE UPDATE ON public.employee_complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_login_attempts_updated_at_trigger
  BEFORE UPDATE ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faqs_updated_at_trigger
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_faqs_updated_at();


-- ============================================================
-- EMAIL SYNC TRIGGERS (employees ↔ auth.users)
-- ============================================================

CREATE OR REPLACE FUNCTION sync_auth_email_from_employee()
RETURNS TRIGGER AS $$
DECLARE
  linked_user_id UUID;
BEGIN
  SELECT id INTO linked_user_id 
  FROM public.users 
  WHERE employee_id = NEW.id 
  LIMIT 1;
  
  IF linked_user_id IS NOT NULL THEN
    UPDATE auth.users 
    SET email = NEW.email, updated_at = now() 
    WHERE id = linked_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER sync_auth_email_on_employee_update
  AFTER UPDATE OF email ON public.employees
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_auth_email_from_employee();

-- Role is read from raw_app_meta_data only (server-controlled); raw_user_meta_data is untrusted
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  matched_employee_id UUID;
  user_role TEXT;
BEGIN
  SELECT id INTO matched_employee_id FROM public.employees WHERE email = NEW.email LIMIT 1;
  
  IF matched_employee_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create user: No employee found with email %. Create employee record first.', NEW.email;
  END IF;
  
  user_role := COALESCE(NEW.raw_app_meta_data->>'role', 'staff');
  
  INSERT INTO public.users (id, role, employee_id, created_at, updated_at)
  VALUES (NEW.id, user_role, matched_employee_id, now(), now())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, employee_id = EXCLUDED.employee_id, updated_at = now();
  
  INSERT INTO public.user_preferences (user_id, email_leave_approvals, email_attendance_reminders)
  VALUES (NEW.id, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE OR REPLACE FUNCTION handle_auth_user_email_change()
RETURNS TRIGGER AS $$
DECLARE
  linked_employee_id UUID;
BEGIN
  SELECT employee_id INTO linked_employee_id FROM public.users WHERE id = NEW.id;
  
  IF linked_employee_id IS NOT NULL THEN
    UPDATE public.employees SET email = NEW.email, updated_at = now() WHERE id = linked_employee_id;
  END IF;
  
  UPDATE public.users SET updated_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION handle_auth_user_email_change();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempt_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_of_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
  db_role TEXT;
BEGIN
  jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';
  IF jwt_role IS NOT NULL AND jwt_role != '' THEN 
    RETURN jwt_role; 
  END IF;
  
  SELECT role INTO db_role FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(db_role, 'staff');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION get_user_employee_id()
RETURNS UUID AS $$
  SELECT employee_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
  SELECT e.email 
  FROM public.employees e 
  JOIN public.users u ON u.employee_id = e.id 
  WHERE u.id = auth.uid() 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- users
CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR id = (select auth.uid()));
CREATE POLICY "users_insert_admin" ON public.users FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) = 'admin');
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE TO authenticated
  USING ((select get_user_role()) = 'admin');
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- departments
CREATE POLICY "departments_select_all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert_admin_hr" ON public.departments FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "departments_update_admin_hr" ON public.departments FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- employees
CREATE POLICY "employees_select_all" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert_admin_hr" ON public.employees FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employees_update_admin_hr" ON public.employees FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employees_delete_admin" ON public.employees FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- leaves
CREATE POLICY "leaves_select_own_or_admin_hr" ON public.leaves FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leaves_insert_own" ON public.leaves FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leaves_update_admin_hr" ON public.leaves FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leaves_delete_admin_hr" ON public.leaves FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- leave_balances
CREATE POLICY "leave_balances_select_policy" ON public.leave_balances FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leave_balances_insert_admin_hr" ON public.leave_balances FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leave_balances_update_admin_hr" ON public.leave_balances FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leave_balances_delete_admin_hr" ON public.leave_balances FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- attendance
CREATE POLICY "attendance_select_own_or_admin_hr" ON public.attendance FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_insert_own_or_admin_hr" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_update_policy" ON public.attendance FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_delete_admin_hr" ON public.attendance FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- notifications
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
-- Staff cannot self-insert; all inserts must come from admin/hr or SECURITY DEFINER functions
CREATE POLICY "notifications_insert_admin_hr" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- activity_logs (admin only; all inserts go through log_activity() SECURITY DEFINER)
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs FOR SELECT TO authenticated
  USING ((select get_user_role()) = 'admin');

-- user_preferences
CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_delete_admin" ON public.user_preferences FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- announcements
CREATE POLICY "announcements_select_policy" ON public.announcements FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR (is_active = true AND (expires_at IS NULL OR expires_at > now())));
CREATE POLICY "announcements_insert_admin_hr" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "announcements_update_admin_hr" ON public.announcements FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "announcements_delete_admin_hr" ON public.announcements FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- passkeys
CREATE POLICY "passkeys_select_own" ON public.passkeys FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "passkeys_insert_own" ON public.passkeys FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "passkeys_update_own" ON public.passkeys FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "passkeys_delete_own" ON public.passkeys FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- login_attempts (no DELETE for users — prevents bypassing OTP lockout)
CREATE POLICY "login_attempts_select_own" ON public.login_attempts FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "login_attempts_insert_own" ON public.login_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "login_attempts_update_own" ON public.login_attempts FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "login_attempts_select_admin_hr" ON public.login_attempts FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- login_attempt_limits (managed only via SECURITY DEFINER functions; no direct access)
CREATE POLICY "login_attempt_limits_deny_all" ON public.login_attempt_limits FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY "login_attempt_limits_deny_insert" ON public.login_attempt_limits FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "login_attempt_limits_deny_update" ON public.login_attempt_limits FOR UPDATE TO authenticated USING (FALSE) WITH CHECK (FALSE);
CREATE POLICY "login_attempt_limits_deny_delete" ON public.login_attempt_limits FOR DELETE TO authenticated USING (FALSE);

-- payrolls
CREATE POLICY "payrolls_select_policy" ON public.payrolls FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "payrolls_insert_admin_hr" ON public.payrolls FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "payrolls_update_admin_hr" ON public.payrolls FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "payrolls_delete_admin_hr" ON public.payrolls FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- bonuses
CREATE POLICY "bonuses_select_policy" ON public.bonuses FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "bonuses_insert_admin_hr" ON public.bonuses FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "bonuses_update_admin_hr" ON public.bonuses FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "bonuses_delete_admin_hr" ON public.bonuses FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- deductions
CREATE POLICY "deductions_select_policy" ON public.deductions FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "deductions_insert_admin_hr" ON public.deductions FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "deductions_update_admin_hr" ON public.deductions FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "deductions_delete_admin_hr" ON public.deductions FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- employee_tasks
CREATE POLICY "tasks_select_policy" ON public.employee_tasks FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "tasks_insert_admin_hr" ON public.employee_tasks FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "tasks_update_policy" ON public.employee_tasks FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()))
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "tasks_delete_admin_hr" ON public.employee_tasks FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- employee_warnings
CREATE POLICY "warnings_select_policy" ON public.employee_warnings FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "warnings_insert_admin_hr" ON public.employee_warnings FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "warnings_update_policy" ON public.employee_warnings FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()))
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "warnings_delete_admin_hr" ON public.employee_warnings FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- employee_complaints
CREATE POLICY "complaints_select_policy" ON public.employee_complaints FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "complaints_insert_policy" ON public.employee_complaints FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "complaints_update_admin_hr" ON public.employee_complaints FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "complaints_delete_admin_hr" ON public.employee_complaints FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- employee_performance
CREATE POLICY "performance_select_policy" ON public.employee_performance FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "performance_insert_admin_hr" ON public.employee_performance FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "performance_update_admin_hr" ON public.employee_performance FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "performance_delete_admin_hr" ON public.employee_performance FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- employee_of_week
CREATE POLICY "employee_of_week_select_all" ON public.employee_of_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "employee_of_week_insert_admin_hr" ON public.employee_of_week FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employee_of_week_update_admin_hr" ON public.employee_of_week FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employee_of_week_delete_admin_hr" ON public.employee_of_week FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- faqs
CREATE POLICY "faq_select_by_role" ON public.faqs FOR SELECT TO authenticated
  USING (is_active = true AND visible_to @> ARRAY[(SELECT role FROM public.users WHERE id = auth.uid()) :: TEXT]);
CREATE POLICY "faq_insert_admin_only" ON public.faqs FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' AND created_by = auth.uid());
CREATE POLICY "faq_update_admin_only" ON public.faqs FOR UPDATE TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' AND updated_by = auth.uid());
CREATE POLICY "faq_delete_admin_only" ON public.faqs FOR DELETE TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;


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


-- ============================================================
-- CRON JOBS
-- ============================================================

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-performance-calculation');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-employee-of-week');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'weekly-performance-calculation',
  '5 0 * * 1',
  $$
  SELECT calculate_weekly_performance(
    (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::DATE
  );
  $$
);

SELECT cron.schedule(
  'weekly-employee-of-week',
  '10 0 * * 1',
  $$
  SELECT select_employee_of_week(
    (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::DATE
  );
  $$
);


-- ============================================================
-- REALTIME CONFIGURATION
-- ============================================================

ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;
ALTER TABLE public.announcements REPLICA IDENTITY DEFAULT;
ALTER TABLE public.users REPLICA IDENTITY DEFAULT;
ALTER TABLE public.departments REPLICA IDENTITY DEFAULT;
ALTER TABLE public.employees REPLICA IDENTITY DEFAULT;
ALTER TABLE public.leaves REPLICA IDENTITY DEFAULT;
ALTER TABLE public.leave_balances REPLICA IDENTITY DEFAULT;
ALTER TABLE public.attendance REPLICA IDENTITY DEFAULT;
ALTER TABLE public.payrolls REPLICA IDENTITY DEFAULT;
ALTER TABLE public.bonuses REPLICA IDENTITY DEFAULT;
ALTER TABLE public.deductions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.employee_tasks REPLICA IDENTITY DEFAULT;
ALTER TABLE public.employee_warnings REPLICA IDENTITY DEFAULT;
ALTER TABLE public.employee_complaints REPLICA IDENTITY DEFAULT;
ALTER TABLE public.employee_performance REPLICA IDENTITY DEFAULT;
ALTER TABLE public.employee_of_week REPLICA IDENTITY DEFAULT;
ALTER TABLE public.activity_logs REPLICA IDENTITY DEFAULT;
ALTER TABLE public.user_preferences REPLICA IDENTITY DEFAULT;
ALTER TABLE public.passkeys REPLICA IDENTITY DEFAULT;
ALTER TABLE public.login_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.leave_balances REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE
      public.notifications, public.leaves, public.employee_complaints,
      public.employee_warnings, public.employee_tasks,
      public.users, public.leave_balances;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-photos', 'employee-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload employee photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update employee photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete employee photos" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access for employee photos" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Authenticated users can upload employee photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-photos');
CREATE POLICY "Authenticated users can update employee photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-photos');
CREATE POLICY "Authenticated users can delete employee photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-photos');
CREATE POLICY "Public read access for employee photos" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'employee-photos');
