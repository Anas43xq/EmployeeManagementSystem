-- =============================================
-- EMPLOYEE MANAGEMENT SYSTEM - COMPREHENSIVE SCHEMA
-- Version: 3.0 | Date: February 19, 2026
-- Optimized, error-free schema with all modules
-- =============================================

-- =============================================
-- CLEANUP - DROP EXISTING OBJECTS
-- =============================================

-- Drop all RLS policies first
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop triggers safely
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_announcements_updated_at_trigger ON public.announcements;
  DROP TRIGGER IF EXISTS update_employee_tasks_updated_at_trigger ON public.employee_tasks;
  DROP TRIGGER IF EXISTS update_employee_warnings_updated_at_trigger ON public.employee_warnings;
  DROP TRIGGER IF EXISTS update_employee_complaints_updated_at_trigger ON public.employee_complaints;
  DROP TRIGGER IF EXISTS sync_auth_email_on_employee_update ON public.employees;
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop tables in dependency order
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
DROP TABLE IF EXISTS public.passkeys CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;

-- Drop sequences and functions
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

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =============================================
-- SEQUENCES
-- =============================================
CREATE SEQUENCE IF NOT EXISTS employee_number_seq START 1;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Generate employee number (EMP001, EMP002, etc.)
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'EMP' || LPAD(nextval('employee_number_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- CORE TABLES
-- =============================================

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('academic', 'administrative')),
  head_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employees
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

-- Add department head FK after employees exists
ALTER TABLE public.departments ADD CONSTRAINT fk_department_head 
  FOREIGN KEY (head_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- Users (links to auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'hr', 'staff')),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  banned_at TIMESTAMPTZ DEFAULT NULL,
  ban_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LEAVE MANAGEMENT
-- =============================================

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

-- =============================================
-- ATTENDANCE & PASSKEYS
-- =============================================

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half-day')),
  notes TEXT DEFAULT '',
  attendance_method TEXT NOT NULL DEFAULT 'manual' CHECK (attendance_method IN ('manual', 'passkey')),
  verification_type TEXT CHECK (verification_type IN ('face', 'fingerprint', 'device', 'pin')),
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

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

-- =============================================
-- PAYROLL SYSTEM
-- =============================================

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

-- =============================================
-- NOTIFICATIONS & ACTIVITY LOGS
-- =============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('leave', 'attendance', 'system', 'warning', 'task', 'complaint', 'performance')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
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

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_leave_approvals BOOLEAN DEFAULT true,
  email_attendance_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ANNOUNCEMENTS
-- =============================================

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

-- =============================================
-- EMPLOYEE TASKS
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
  points INTEGER NOT NULL DEFAULT 10,
  penalty_points INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMPLOYEE WARNINGS
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
-- EMPLOYEE COMPLAINTS
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
-- PERFORMANCE TRACKING
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
-- INDEXES (Optimized for common queries)
-- =============================================

-- Core table indexes
CREATE INDEX idx_employees_department ON public.employees(department_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_email ON public.employees(email);

-- Leave indexes
CREATE INDEX idx_leaves_employee ON public.leaves(employee_id);
CREATE INDEX idx_leaves_status ON public.leaves(status);
CREATE INDEX idx_leaves_employee_status ON public.leaves(employee_id, status);
CREATE INDEX idx_leave_balances_employee ON public.leave_balances(employee_id);

-- Attendance indexes
CREATE INDEX idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_method ON public.attendance(attendance_method);
CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, date DESC);

-- Notification indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_realtime ON public.notifications(user_id, is_read, created_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- Announcement indexes
CREATE INDEX idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;
CREATE INDEX idx_announcements_created ON public.announcements(created_at DESC);

-- Task indexes
CREATE INDEX idx_employee_tasks_employee ON public.employee_tasks(employee_id);
CREATE INDEX idx_employee_tasks_status ON public.employee_tasks(status);
CREATE INDEX idx_employee_tasks_deadline ON public.employee_tasks(deadline);
CREATE INDEX idx_employee_tasks_assigned_by ON public.employee_tasks(assigned_by);

-- Warning indexes
CREATE INDEX idx_employee_warnings_employee ON public.employee_warnings(employee_id);
CREATE INDEX idx_employee_warnings_status ON public.employee_warnings(status);
CREATE INDEX idx_employee_warnings_severity ON public.employee_warnings(severity);

-- Complaint indexes
CREATE INDEX idx_employee_complaints_employee ON public.employee_complaints(employee_id);
CREATE INDEX idx_employee_complaints_status ON public.employee_complaints(status);
CREATE INDEX idx_employee_complaints_assigned ON public.employee_complaints(assigned_to);

-- Performance indexes
CREATE INDEX idx_employee_performance_employee ON public.employee_performance(employee_id);
CREATE INDEX idx_employee_performance_period ON public.employee_performance(period_start, period_end);
CREATE INDEX idx_employee_performance_emp_period ON public.employee_performance(employee_id, period_start DESC);
CREATE INDEX idx_employee_of_week_week ON public.employee_of_week(week_start);
CREATE INDEX idx_employee_of_week_employee ON public.employee_of_week(employee_id);

-- Passkey indexes
CREATE INDEX idx_passkeys_user ON public.passkeys(user_id);
CREATE INDEX idx_passkeys_credential ON public.passkeys(credential_id);

-- Payroll indexes
CREATE INDEX idx_payrolls_employee ON public.payrolls(employee_id);
CREATE INDEX idx_payrolls_period ON public.payrolls(period_year, period_month);
CREATE INDEX idx_payrolls_status ON public.payrolls(status);
CREATE INDEX idx_payrolls_employee_period ON public.payrolls(employee_id, period_year DESC, period_month DESC);
CREATE INDEX idx_bonuses_employee ON public.bonuses(employee_id);
CREATE INDEX idx_bonuses_period ON public.bonuses(period_year, period_month);
CREATE INDEX idx_bonuses_payroll ON public.bonuses(payroll_id);
CREATE INDEX idx_deductions_employee ON public.deductions(employee_id);
CREATE INDEX idx_deductions_period ON public.deductions(period_year, period_month);
CREATE INDEX idx_deductions_payroll ON public.deductions(payroll_id);

-- =============================================
-- TRIGGERS
-- =============================================

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

-- =============================================
-- EMAIL SYNC TRIGGERS
-- =============================================

-- Sync auth.users email when employee email changes
CREATE OR REPLACE FUNCTION sync_auth_email_from_employee()
RETURNS TRIGGER AS $$
DECLARE
  linked_user_id UUID;
BEGIN
  SELECT id INTO linked_user_id FROM public.users WHERE employee_id = NEW.id;
  
  IF linked_user_id IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE auth.users SET email = NEW.email, updated_at = now() WHERE id = linked_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER sync_auth_email_on_employee_update
  AFTER UPDATE OF email ON public.employees
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_auth_email_from_employee();

-- =============================================
-- AUTO-SETUP NEW AUTH USERS
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  matched_employee_id UUID;
  user_role TEXT;
BEGIN
  -- Find matching employee by email (REQUIRED)
  SELECT id INTO matched_employee_id FROM public.employees WHERE email = NEW.email LIMIT 1;
  
  IF matched_employee_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create user: No employee found with email %. Create employee record first.', NEW.email;
  END IF;
  
  -- Get role from metadata or default to 'staff'
  user_role := COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'staff');
  
  -- Create public.users record
  INSERT INTO public.users (id, role, employee_id, created_at, updated_at)
  VALUES (NEW.id, user_role, matched_employee_id, now(), now())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, employee_id = EXCLUDED.employee_id, updated_at = now();
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id, email_leave_approvals, email_attendance_reminders)
  VALUES (NEW.id, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Handle auth user email changes
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

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

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
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_of_week ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS HELPER FUNCTIONS
-- =============================================

-- Get user role (STABLE for performance)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
  db_role TEXT;
BEGIN
  jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';
  IF jwt_role IS NOT NULL THEN RETURN jwt_role; END IF;
  
  SELECT role INTO db_role FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(db_role, 'staff');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Get user's employee_id
CREATE OR REPLACE FUNCTION get_user_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT employee_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Get user email
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT e.email FROM public.employees e JOIN public.users u ON u.employee_id = e.id WHERE u.id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- =============================================
-- RLS POLICIES
-- =============================================

-- USERS
CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated
  USING (
    (select get_user_role()) IN ('admin', 'hr')
    OR id = (select auth.uid())
  );
CREATE POLICY "users_insert_admin" ON public.users FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) = 'admin');
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE TO authenticated
  USING ((select get_user_role()) = 'admin');
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- DEPARTMENTS
CREATE POLICY "departments_select_all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert_admin_hr" ON public.departments FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "departments_update_admin_hr" ON public.departments FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- EMPLOYEES
CREATE POLICY "employees_select_all" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert_admin_hr" ON public.employees FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employees_update_admin_hr" ON public.employees FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employees_delete_admin" ON public.employees FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');

-- LEAVES
CREATE POLICY "leaves_select_own_or_admin_hr" ON public.leaves FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leaves_insert_own" ON public.leaves FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leaves_update_admin_hr" ON public.leaves FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leaves_delete_admin_hr" ON public.leaves FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- LEAVE BALANCES
CREATE POLICY "leave_balances_select_policy" ON public.leave_balances FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leave_balances_insert_admin_hr" ON public.leave_balances FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leave_balances_update_admin_hr" ON public.leave_balances FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leave_balances_delete_admin_hr" ON public.leave_balances FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- ATTENDANCE
CREATE POLICY "attendance_select_own_or_admin_hr" ON public.attendance FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_insert_own_or_admin_hr" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_update_policy" ON public.attendance FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_delete_admin_hr" ON public.attendance FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- NOTIFICATIONS
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "notifications_insert_all" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR user_id = (select auth.uid()));
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ACTIVITY LOGS
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs FOR SELECT TO authenticated
  USING ((select get_user_role()) = 'admin');
CREATE POLICY "activity_logs_insert_all" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) OR (select get_user_role()) = 'admin');

-- USER PREFERENCES
CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- ANNOUNCEMENTS
CREATE POLICY "announcements_select_policy" ON public.announcements FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR (is_active = true AND (expires_at IS NULL OR expires_at > now())));
CREATE POLICY "announcements_insert_admin_hr" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "announcements_update_admin_hr" ON public.announcements FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "announcements_delete_admin_hr" ON public.announcements FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- PASSKEYS
CREATE POLICY "passkeys_select_own" ON public.passkeys FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "passkeys_insert_own" ON public.passkeys FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "passkeys_update_own" ON public.passkeys FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "passkeys_delete_own" ON public.passkeys FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- PAYROLLS
CREATE POLICY "payrolls_select_policy" ON public.payrolls FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "payrolls_insert_admin_hr" ON public.payrolls FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "payrolls_update_admin_hr" ON public.payrolls FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "payrolls_delete_admin_hr" ON public.payrolls FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- BONUSES
CREATE POLICY "bonuses_select_policy" ON public.bonuses FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "bonuses_insert_admin_hr" ON public.bonuses FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "bonuses_update_admin_hr" ON public.bonuses FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "bonuses_delete_admin_hr" ON public.bonuses FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- DEDUCTIONS
CREATE POLICY "deductions_select_policy" ON public.deductions FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "deductions_insert_admin_hr" ON public.deductions FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "deductions_update_admin_hr" ON public.deductions FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "deductions_delete_admin_hr" ON public.deductions FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- EMPLOYEE TASKS
CREATE POLICY "tasks_manage_admin_hr" ON public.employee_tasks FOR ALL TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "tasks_select_policy" ON public.employee_tasks FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "tasks_update_policy" ON public.employee_tasks FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()))
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));

-- EMPLOYEE WARNINGS
CREATE POLICY "warnings_manage_admin_hr" ON public.employee_warnings FOR ALL TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "warnings_select_policy" ON public.employee_warnings FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "warnings_update_policy" ON public.employee_warnings FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()))
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));

-- EMPLOYEE COMPLAINTS
CREATE POLICY "complaints_manage_admin_hr" ON public.employee_complaints FOR ALL TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "complaints_insert_policy" ON public.employee_complaints FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "complaints_select_policy" ON public.employee_complaints FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));

-- EMPLOYEE PERFORMANCE
CREATE POLICY "performance_manage_admin_hr" ON public.employee_performance FOR ALL TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "performance_select_policy" ON public.employee_performance FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));

-- EMPLOYEE OF WEEK
CREATE POLICY "employee_of_week_select_all" ON public.employee_of_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "employee_of_week_insert_admin_hr" ON public.employee_of_week FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employee_of_week_update_admin_hr" ON public.employee_of_week FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employee_of_week_delete_admin_hr" ON public.employee_of_week FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));

-- =============================================
-- PERFORMANCE CALCULATION FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION calculate_weekly_performance(p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE)
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

  FOR emp IN SELECT id FROM public.employees WHERE status = 'active' LOOP
    -- Attendance score
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'present' THEN 10 WHEN status = 'late' THEN 5 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0)
    INTO v_attendance_score, v_attendance_days, v_absent_days, v_late_days
    FROM public.attendance WHERE employee_id = emp.id AND date BETWEEN p_week_start AND p_week_end;

    -- Task score
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'completed' AND completed_at <= deadline + INTERVAL '1 day' THEN points ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'overdue' OR (status = 'completed' AND completed_at > deadline + INTERVAL '1 day') THEN 1 ELSE 0 END), 0)
    INTO v_task_score, v_tasks_completed, v_tasks_overdue
    FROM public.employee_tasks WHERE employee_id = emp.id AND deadline BETWEEN p_week_start AND p_week_end;

    -- Warning deduction
    SELECT COALESCE(SUM(CASE severity WHEN 'minor' THEN 10 WHEN 'moderate' THEN 20 WHEN 'major' THEN 30 WHEN 'critical' THEN 50 ELSE 0 END), 0)
    INTO v_warning_deduction
    FROM public.employee_warnings
    WHERE employee_id = emp.id AND created_at BETWEEN p_week_start AND p_week_end + INTERVAL '1 day' AND status IN ('active', 'acknowledged');

    v_total_score := GREATEST(0, v_attendance_score + v_task_score - v_warning_deduction);

    INSERT INTO public.employee_performance (
      employee_id, period_start, period_end, attendance_score, task_score, warning_deduction, total_score,
      tasks_completed, tasks_overdue, attendance_days, absent_days, late_days, calculated_at
    ) VALUES (
      emp.id, p_week_start, p_week_end, v_attendance_score, v_task_score, v_warning_deduction, v_total_score,
      v_tasks_completed, v_tasks_overdue, v_attendance_days, v_absent_days, v_late_days, now()
    )
    ON CONFLICT (employee_id, period_start, period_end) DO UPDATE SET
      attendance_score = EXCLUDED.attendance_score, task_score = EXCLUDED.task_score,
      warning_deduction = EXCLUDED.warning_deduction, total_score = EXCLUDED.total_score,
      tasks_completed = EXCLUDED.tasks_completed, tasks_overdue = EXCLUDED.tasks_overdue,
      attendance_days = EXCLUDED.attendance_days, absent_days = EXCLUDED.absent_days,
      late_days = EXCLUDED.late_days, calculated_at = now(), updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION select_employee_of_week(p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE)
RETURNS void AS $$
DECLARE
  p_week_end DATE;
  v_top_employee_id UUID;
  v_top_score INTEGER;
  v_tied_count INTEGER;
  v_reason TEXT;
BEGIN
  p_week_end := p_week_start + INTERVAL '6 days';
  PERFORM calculate_weekly_performance(p_week_start);

  SELECT ep.employee_id, ep.total_score INTO v_top_employee_id, v_top_score
  FROM public.employee_performance ep
  JOIN public.employees e ON e.id = ep.employee_id
  WHERE ep.period_start = p_week_start AND ep.period_end = p_week_end AND e.status = 'active'
  ORDER BY ep.total_score DESC, e.hire_date ASC LIMIT 1;

  IF v_top_employee_id IS NOT NULL THEN
    -- Check if there are other employees with the same score
    SELECT COUNT(*) INTO v_tied_count
    FROM public.employee_performance ep
    JOIN public.employees e ON e.id = ep.employee_id
    WHERE ep.period_start = p_week_start AND ep.period_end = p_week_end 
      AND e.status = 'active' AND ep.total_score = v_top_score;

    -- Generate appropriate reason text
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

-- =============================================
-- PAYROLL UTILITY FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION calculate_attendance_deductions(p_employee_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_working_days INTEGER;
  v_late_days INTEGER;
  v_absent_days INTEGER;
  v_base_salary NUMERIC;
  v_daily_salary NUMERIC;
  v_deductions NUMERIC := 0;
BEGIN
  SELECT salary INTO v_base_salary FROM public.employees WHERE id = p_employee_id;
  
  v_working_days := (SELECT COUNT(*) FROM generate_series(
    make_date(p_year, p_month, 1),
    (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE, '1 day'::INTERVAL
  ) AS day WHERE EXTRACT(dow FROM day) NOT IN (0, 6));
  
  v_daily_salary := v_base_salary / NULLIF(v_working_days, 0);
  
  SELECT COUNT(*) FILTER (WHERE status = 'late'), COUNT(*) FILTER (WHERE status = 'absent')
  INTO v_late_days, v_absent_days
  FROM public.attendance
  WHERE employee_id = p_employee_id AND EXTRACT(month FROM date) = p_month AND EXTRACT(year FROM date) = p_year;
  
  v_deductions := (v_absent_days * COALESCE(v_daily_salary, 0)) + (v_late_days * COALESCE(v_daily_salary, 0) * 0.1);
  RETURN COALESCE(v_deductions, 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_leave_deductions(p_employee_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_unpaid_leave_days INTEGER;
  v_base_salary NUMERIC;
  v_working_days INTEGER;
  v_daily_salary NUMERIC;
BEGIN
  SELECT salary INTO v_base_salary FROM public.employees WHERE id = p_employee_id;
  
  v_working_days := (SELECT COUNT(*) FROM generate_series(
    make_date(p_year, p_month, 1),
    (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE, '1 day'::INTERVAL
  ) AS day WHERE EXTRACT(dow FROM day) NOT IN (0, 6));
  
  v_daily_salary := v_base_salary / NULLIF(v_working_days, 0);
  
  SELECT COALESCE(SUM(
    CASE 
      WHEN l.leave_type = 'annual' THEN GREATEST(0, l.days_count - COALESCE(lb.annual_total - lb.annual_used, 0))
      WHEN l.leave_type = 'sick' THEN GREATEST(0, l.days_count - COALESCE(lb.sick_total - lb.sick_used, 0))
      WHEN l.leave_type = 'casual' THEN GREATEST(0, l.days_count - COALESCE(lb.casual_total - lb.casual_used, 0))
      ELSE l.days_count
    END
  ), 0) INTO v_unpaid_leave_days
  FROM public.leaves l
  LEFT JOIN public.leave_balances lb ON lb.employee_id = l.employee_id AND lb.year = p_year
  WHERE l.employee_id = p_employee_id AND l.status = 'approved'
    AND (EXTRACT(month FROM l.start_date) = p_month OR EXTRACT(month FROM l.end_date) = p_month)
    AND (EXTRACT(year FROM l.start_date) = p_year OR EXTRACT(year FROM l.end_date) = p_year);
  
  RETURN COALESCE(v_unpaid_leave_days * COALESCE(v_daily_salary, 0), 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- REALTIME CONFIGURATION
-- =============================================

-- Set REPLICA IDENTITY to DEFAULT for all tables
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

-- Add notifications to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-photos', 'employee-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
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

-- =============================================
-- SEED DATA
-- =============================================

DO $$
DECLARE
  dept_tech UUID := gen_random_uuid();
  dept_business UUID := gen_random_uuid();
  dept_eng UUID := gen_random_uuid();
  dept_hr UUID := gen_random_uuid();
  dept_admin UUID := gen_random_uuid();
  emp_id UUID;
BEGIN
  -- Departments
  INSERT INTO public.departments (id, name, type, description) VALUES
    (dept_tech, 'Technology', 'administrative', 'Technology and IT Services'),
    (dept_business, 'Business Operations', 'administrative', 'Business Operations and Management'),
    (dept_eng, 'Engineering', 'administrative', 'Engineering and Development'),
    (dept_hr, 'Human Resources', 'administrative', 'Human Resources and Recruitment'),
    (dept_admin, 'Administration', 'administrative', 'General Administration and Support');

  -- Admin employee
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES ('John', 'Smith', 'anas.essam.work@gmail.com', '555-0101', '1975-03-15', 'male', '123 Admin St', 'Boston', 'MA', '02101', dept_admin, 'System Administrator', 'full-time', 'active', '2010-01-15', 95000, '[{"degree": "MBA", "institution": "Harvard University"}]', 'Jane Smith', '555-0102');

  -- HR employee
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES ('Sarah', 'Johnson', 'essamanas86@gmail.com', '555-0103', '1982-07-22', 'female', '456 HR Ave', 'Boston', 'MA', '02102', dept_admin, 'HR Manager', 'full-time', 'active', '2015-03-20', 75000, '[{"degree": "MS Human Resources", "institution": "Boston College"}]', 'Mike Johnson', '555-0104');

  -- Staff employee
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES ('Michael', 'Davis', 'tvissam96@gmail.com', '555-0105', '1988-11-10', 'male', '789 Faculty Rd', 'Boston', 'MA', '02103', dept_tech, 'Senior Analyst', 'full-time', 'active', '2018-09-01', 68000, '[{"degree": "PhD Computer Science", "institution": "MIT"}]', 'Emily Davis', '555-0106');

  -- Additional employees
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone) VALUES
    ('Emily', 'Wilson', 'e.wilson@staffhub.com', '555-0107', '1985-05-18', 'female', '321 Academic Ln', 'Boston', 'MA', '02104', dept_tech, 'Director', 'full-time', 'active', '2012-08-15', 85000, '[{"degree": "PhD Computer Science", "institution": "Stanford University"}]', 'Robert Wilson', '555-0108'),
    ('David', 'Brown', 'd.brown@staffhub.com', '555-0109', '1990-02-28', 'male', '654 Tech Blvd', 'Boston', 'MA', '02105', dept_tech, 'Lecturer', 'full-time', 'active', '2019-01-10', 62000, '[{"degree": "MS Computer Science", "institution": "Boston University"}]', 'Lisa Brown', '555-0110'),
    ('Jennifer', 'Martinez', 'j.martinez@staffhub.com', '555-0111', '1987-09-05', 'female', '987 Business Dr', 'Boston', 'MA', '02106', dept_business, 'Team Lead', 'full-time', 'active', '2014-07-01', 78000, '[{"degree": "PhD Business Administration", "institution": "Wharton"}]', 'Carlos Martinez', '555-0112'),
    ('Robert', 'Garcia', 'r.garcia@staffhub.com', '555-0113', '1983-12-20', 'male', '147 Commerce St', 'Boston', 'MA', '02107', dept_business, 'Director', 'full-time', 'active', '2011-09-15', 88000, '[{"degree": "PhD Economics", "institution": "Yale University"}]', 'Maria Garcia', '555-0114'),
    ('Linda', 'Rodriguez', 'l.rodriguez@staffhub.com', '555-0115', '1992-04-12', 'female', '258 Finance Way', 'Boston', 'MA', '02108', dept_business, 'Senior Analyst', 'full-time', 'active', '2020-01-15', 65000, '[{"degree": "PhD Finance", "institution": "NYU"}]', 'Jose Rodriguez', '555-0116'),
    ('James', 'Lee', 'j.lee@staffhub.com', '555-0117', '1986-08-30', 'male', '369 Engineering Ct', 'Boston', 'MA', '02109', dept_eng, 'Director', 'full-time', 'active', '2013-06-01', 90000, '[{"degree": "PhD Mechanical Engineering", "institution": "MIT"}]', 'Susan Lee', '555-0118'),
    ('Mary', 'Anderson', 'm.anderson@staffhub.com', '555-0119', '1989-01-25', 'female', '741 Tech Plaza', 'Boston', 'MA', '02110', dept_eng, 'Team Lead', 'full-time', 'active', '2016-03-10', 76000, '[{"degree": "PhD Electrical Engineering", "institution": "Caltech"}]', 'Tom Anderson', '555-0120'),
    ('William', 'Taylor', 'w.taylor@staffhub.com', '555-0121', '1991-06-14', 'male', '852 Innovation Dr', 'Boston', 'MA', '02111', dept_eng, 'Lecturer', 'part-time', 'active', '2021-09-01', 45000, '[{"degree": "MS Civil Engineering", "institution": "Georgia Tech"}]', 'Ann Taylor', '555-0122'),
    ('Patricia', 'Thomas', 'p.thomas@staffhub.com', '555-0123', '1984-10-08', 'female', '963 Liberal Arts Ave', 'Boston', 'MA', '02112', dept_hr, 'Director', 'full-time', 'active', '2012-08-20', 82000, '[{"degree": "PhD English Literature", "institution": "Columbia"}]', 'George Thomas', '555-0124'),
    ('Richard', 'Jackson', 'r.jackson@staffhub.com', '555-0125', '1987-03-17', 'male', '159 History Ln', 'Boston', 'MA', '02113', dept_hr, 'Team Lead', 'full-time', 'active', '2015-01-12', 74000, '[{"degree": "PhD History", "institution": "Princeton"}]', 'Barbara Jackson', '555-0126'),
    ('Charles', 'Harris', 'c.harris@staffhub.com', '555-0129', '1988-11-03', 'male', '468 Support St', 'Boston', 'MA', '02115', dept_admin, 'IT Manager', 'full-time', 'active', '2016-05-15', 72000, '[{"degree": "BS Information Systems", "institution": "Northeastern"}]', 'Nancy Harris', '555-0130'),
    ('Joseph', 'Lewis', 'j.lewis@staffhub.com', '555-0133', '1986-12-07', 'male', '680 Data Science Blvd', 'Boston', 'MA', '02117', dept_tech, 'Senior Analyst', 'full-time', 'active', '2017-08-01', 70000, '[{"degree": "PhD Data Science", "institution": "Carnegie Mellon"}]', 'Karen Lewis', '555-0134'),
    ('Karen', 'Walker', 'k.walker@staffhub.com', '555-0135', '1991-05-23', 'female', '791 AI Research Ct', 'Boston', 'MA', '02118', dept_tech, 'Research Associate', 'contract', 'active', '2022-01-10', 58000, '[{"degree": "MS Artificial Intelligence", "institution": "Stanford"}]', 'Mark Walker', '555-0136'),
    ('Nancy', 'Hall', 'n.hall@staffhub.com', '555-0137', '1985-09-16', 'female', '892 Marketing Plaza', 'Boston', 'MA', '02119', dept_business, 'Lecturer', 'part-time', 'active', '2020-09-01', 42000, '[{"degree": "MBA Marketing", "institution": "Babson College"}]', 'Daniel Hall', '555-0138'),
    ('Betty', 'Young', 'b.young@staffhub.com', '555-0141', '1992-08-26', 'female', '124 Robotics Way', 'Boston', 'MA', '02121', dept_eng, 'Senior Analyst', 'full-time', 'active', '2020-08-15', 69000, '[{"degree": "PhD Robotics", "institution": "CMU"}]', 'Frank Young', '555-0142'),
    ('Brian', 'Scott', 'b.scott@staffhub.com', '555-0151', '1986-05-27', 'male', '679 Facilities Dr', 'Boston', 'MA', '02126', dept_admin, 'Facilities Manager', 'full-time', 'active', '2015-03-15', 60000, '[{"degree": "BS Facilities Management", "institution": "UMass"}]', 'Carol Scott', '555-0152'),
    ('Carol', 'Green', 'c.green@staffhub.com', '555-0153', '1993-01-08', 'female', '780 Finance Office St', 'Boston', 'MA', '02127', dept_admin, 'Financial Analyst', 'full-time', 'active', '2020-06-01', 58000, '[{"degree": "MS Finance", "institution": "Boston College"}]', 'Eric Green', '555-0154'),
    ('Ryan', 'Nelson', 'r.nelson@staffhub.com', '555-0159', '1987-04-04', 'male', '113 Student Services Rd', 'Boston', 'MA', '02130', dept_admin, 'Student Services Advisor', 'full-time', 'inactive', '2017-09-01', 56000, '[{"degree": "MS Counseling", "institution": "Lesley"}]', 'Jessica Nelson', '555-0160'),
    ('Sandra', 'Wright', 's.wright@staffhub.com', '555-0161', '1990-07-19', 'female', '225 Research Park', 'Boston', 'MA', '02131', dept_tech, 'Research Associate', 'contract', 'on-leave', '2019-11-01', 55000, '[{"degree": "MS Biochemistry", "institution": "Tufts"}]', 'Kevin Wright', '555-0162');

  -- Update department heads
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'e.wilson@staffhub.com') WHERE id = dept_tech;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'r.garcia@staffhub.com') WHERE id = dept_business;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'j.lee@staffhub.com') WHERE id = dept_eng;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'p.thomas@staffhub.com') WHERE id = dept_hr;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'anas.essam.work@gmail.com') WHERE id = dept_admin;
END $$;

-- Leave Balances for 2026 (with partial usage to reflect approved leaves)
INSERT INTO public.leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, casual_total, casual_used)
SELECT id, 2026,
  20,
  CASE WHEN email = 'e.wilson@staffhub.com' THEN 0 WHEN email = 'j.martinez@staffhub.com' THEN 5 WHEN email = 'r.garcia@staffhub.com' THEN 3 ELSE 0 END,
  10,
  CASE WHEN email = 'e.wilson@staffhub.com' THEN 2 WHEN email = 'l.rodriguez@staffhub.com' THEN 3 ELSE 0 END,
  10,
  CASE WHEN email = 'd.brown@staffhub.com' THEN 1 WHEN email = 'm.anderson@staffhub.com' THEN 2 ELSE 0 END
FROM public.employees;

-- ============================================================================
-- LEAVE REQUESTS - All statuses and types
-- ============================================================================
-- Pending leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-02-22', '2026-02-26', 5, 'Family vacation - need time off to travel', 'pending' FROM public.employees WHERE email = 'tvissam96@gmail.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'sabbatical', '2026-03-01', '2026-03-14', 14, 'Research sabbatical for academic paper', 'pending' FROM public.employees WHERE email = 'j.lee@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'casual', '2026-02-25', '2026-02-25', 1, 'Personal errand', 'pending' FROM public.employees WHERE email = 'c.harris@staffhub.com';

-- Approved leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'sick', '2026-02-10', '2026-02-11', 2, 'Medical appointment and recovery', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'hr' LIMIT 1)
FROM public.employees e WHERE e.email = 'e.wilson@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'casual', '2026-02-15', '2026-02-15', 1, 'Personal work - bank appointment', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'hr' LIMIT 1)
FROM public.employees e WHERE e.email = 'd.brown@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'annual', '2026-02-03', '2026-02-07', 5, 'Winter holiday trip', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'admin' LIMIT 1)
FROM public.employees e WHERE e.email = 'j.martinez@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'annual', '2026-01-20', '2026-01-22', 3, 'Family event', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'admin' LIMIT 1)
FROM public.employees e WHERE e.email = 'r.garcia@staffhub.com';

-- Rejected leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'sick', '2026-01-25', '2026-01-26', 2, 'Cold and flu symptoms', 'rejected' FROM public.employees WHERE email = 'l.rodriguez@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-02-14', '2026-02-14', 1, 'Valentine day off', 'rejected' FROM public.employees WHERE email = 'w.taylor@staffhub.com';

-- ============================================================================
-- ATTENDANCE - Mixed statuses including today, late, absent, half-day, passkey
-- ============================================================================

-- Past 7 days attendance for most employees (present/manual)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, d::date, '09:00', '17:00', 'present', 'manual'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 7, CURRENT_DATE - 1, '1 day') d
WHERE e.status = 'active' AND e.email NOT IN (
  'anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com',
  'l.rodriguez@staffhub.com', 'w.taylor@staffhub.com', 'k.walker@staffhub.com'
)
ON CONFLICT (employee_id, date) DO NOTHING;

-- Auth user attendance (past 5 days - present)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, d::date, '08:45', '17:15', 'present', 'manual'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 5, CURRENT_DATE - 1, '1 day') d
WHERE e.email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com')
ON CONFLICT (employee_id, date) DO NOTHING;

-- Today's attendance for some employees (so dashboard shows > 0)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, CURRENT_DATE, '08:55', '17:00', 'present', 'manual'
FROM public.employees e
WHERE e.email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com',
  'e.wilson@staffhub.com', 'j.lee@staffhub.com', 'r.garcia@staffhub.com',
  'p.thomas@staffhub.com', 'c.harris@staffhub.com', 'j.martinez@staffhub.com',
  'd.brown@staffhub.com', 'j.lewis@staffhub.com', 'b.young@staffhub.com')
ON CONFLICT (employee_id, date) DO NOTHING;

-- Late arrivals (multiple days)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, d::date, '10:15', '17:30', 'late', 'manual'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 7, CURRENT_DATE - 1, '1 day') d
WHERE e.email = 'l.rodriguez@staffhub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- Late + passkey method
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, d::date, '09:45', '17:00', 'late', 'passkey'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 4, CURRENT_DATE - 2, '1 day') d
WHERE e.email = 'w.taylor@staffhub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- Absent records
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, (CURRENT_DATE - 3)::date, NULL, NULL, 'absent', 'manual'
FROM public.employees e WHERE e.email = 'k.walker@staffhub.com'
ON CONFLICT (employee_id, date) DO NOTHING;
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, (CURRENT_DATE - 5)::date, NULL, NULL, 'absent', 'manual'
FROM public.employees e WHERE e.email = 'w.taylor@staffhub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- Half-day records
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method)
SELECT e.id, (CURRENT_DATE - 2)::date, '09:00', '13:00', 'half-day', 'manual'
FROM public.employees e WHERE e.email = 'k.walker@staffhub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- ============================================================================
-- AUTH USERS SETUP (GoTrue compatible)
-- Uses fixed UUIDs + pre-computed $2a$ bcrypt hashes + auth.identities
-- Credentials: admin123, Hr1234, emp123
-- ============================================================================

-- Clean slate
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com')
);
DELETE FROM auth.users WHERE email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com');

-- Insert auth.users with fixed UUIDs and native pgcrypto bcrypt hashes
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES 
  -- Admin: anas.essam.work@gmail.com / admin123
  ('00000000-0000-0000-0000-000000000000', 'a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
   'authenticated', 'authenticated', 'anas.essam.work@gmail.com',
   extensions.crypt('admin123', extensions.gen_salt('bf')),  
   now(), '{"provider":"email","providers":["email"],"role":"admin"}',
   '{}', now(), now(), '', '', '', ''),
  -- HR: essamanas86@gmail.com / Hr1234
  ('00000000-0000-0000-0000-000000000000', 'b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
   'authenticated', 'authenticated', 'essamanas86@gmail.com',
   extensions.crypt('Hr1234', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"],"role":"hr"}',
   '{}', now(), now(), '', '', '', ''),
  -- Staff: tvissam96@gmail.com / emp123
  ('00000000-0000-0000-0000-000000000000', 'c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
   'authenticated', 'authenticated', 'tvissam96@gmail.com',
   extensions.crypt('emp123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"],"role":"staff"}',
   '{}', now(), now(), '', '', '', '');

-- Insert auth.identities (GoTrue REQUIRES these for email/password login)
-- The postgres role may lack INSERT on auth.identities, so we grant it first
DO $$
DECLARE
  _row_count INT;
BEGIN
  -- Ensure we have permission to insert into auth.identities
  EXECUTE 'GRANT ALL ON TABLE auth.identities TO postgres';
  RAISE NOTICE 'Granted auth.identities permissions to postgres';
  
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES
    ('a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
     'a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
     '{"sub":"a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab","email":"anas.essam.work@gmail.com","email_verified":true}',
     'email', 'a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
     now(), now(), now()),
    ('b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
     'b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
     '{"sub":"b2c3d4e5-f6a7-4b5c-9d8e-234567890abc","email":"essamanas86@gmail.com","email_verified":true}',
     'email', 'b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
     now(), now(), now()),
    ('c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
     'c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
     '{"sub":"c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd","email":"tvissam96@gmail.com","email_verified":true}',
     'email', 'c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
     now(), now(), now());

  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RAISE NOTICE 'auth.identities: inserted % rows', _row_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auth.identities insert failed (SQLSTATE=%, MSG=%). Run seed-auth.ps1 after reset.', SQLSTATE, SQLERRM;
END $$;

-- ============================================================================
-- PAYROLL - January 2026 (Paid) + February 2026 (Draft + Approved mix)
-- ============================================================================

-- January 2026 Payroll (ALL PAID - historical)
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at)
SELECT e.id, 1, 2026, e.salary,
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  ROUND(e.salary * 0.08, 2),
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END - ROUND(e.salary * 0.08, 2),
  'paid', 'January 2026 payroll - processed and paid', '2026-01-31'::TIMESTAMPTZ
FROM public.employees e WHERE e.status = 'active'
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- February 2026 Payroll - DRAFT (most employees) for testing approve workflow
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at)
SELECT e.id, 2, 2026, e.salary,
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  ROUND(e.salary * 0.08, 2),
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END - ROUND(e.salary * 0.08, 2),
  'draft', 'February 2026 payroll - pending approval', now()
FROM public.employees e
WHERE e.status = 'active'
  AND e.email NOT IN ('e.wilson@staffhub.com', 'r.garcia@staffhub.com', 'j.lee@staffhub.com', 'p.thomas@staffhub.com', 'j.martinez@staffhub.com')
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- February 2026 Payroll - APPROVED (5 department heads) for testing pay workflow
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at, approved_by, approved_at)
SELECT e.id, 2, 2026, e.salary,
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  ROUND(e.salary * 0.08, 2),
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END - ROUND(e.salary * 0.08, 2),
  'approved', 'February 2026 payroll - approved, ready for payment', now(),
  (SELECT u.id FROM public.users u WHERE u.role = 'admin' LIMIT 1), now()
FROM public.employees e
WHERE e.email IN ('e.wilson@staffhub.com', 'r.garcia@staffhub.com', 'j.lee@staffhub.com', 'p.thomas@staffhub.com', 'j.martinez@staffhub.com')
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- Bonuses for January 2026 (housing allowance)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'allowance',
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1000 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 700 WHEN e.position LIKE 'Senior%' THEN 500 ELSE 300 END,
  'Monthly housing allowance', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

-- Performance bonuses for January (Directors & leads)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'performance',
  CASE WHEN e.position LIKE 'Director%' THEN 500 ELSE 300 END,
  'Q4 2025 performance bonus', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.position IN ('Director', 'Team Lead', 'System Administrator');

-- Bonuses for February 2026 (housing allowance for all February payrolls)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'allowance',
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1000 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 700 WHEN e.position LIKE 'Senior%' THEN 500 ELSE 300 END,
  'Monthly housing allowance', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.status = 'active';

-- Overtime bonus for Feb (a few employees)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'overtime', 450, 'Overtime hours - system migration project', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.email IN ('c.harris@staffhub.com', 'j.lewis@staffhub.com', 'tvissam96@gmail.com');

-- Deductions for January 2026 (tax + insurance)
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'tax', ROUND(e.salary * 0.05, 2), 'Income tax - 5%', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'insurance', ROUND(e.salary * 0.02, 2), 'Health insurance premium', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

-- Deductions for February 2026 (tax + insurance + penalties for some)
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'tax', ROUND(e.salary * 0.05, 2), 'Income tax - 5%', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'insurance', ROUND(e.salary * 0.02, 2), 'Health insurance premium', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.status = 'active';

-- Penalty deductions for late employees (February)
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'penalty', 200, 'Late attendance penalty - 5 occurrences', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.email = 'l.rodriguez@staffhub.com';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'penalty', 150, 'Late attendance penalty - 3 occurrences', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.email = 'w.taylor@staffhub.com';

-- ============================================================================
-- TASKS - All statuses, all priorities
-- ============================================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_hr_id UUID;
BEGIN
  SELECT u.id INTO v_admin_id FROM public.users u WHERE u.role = 'admin' LIMIT 1;
  SELECT u.id INTO v_hr_id FROM public.users u WHERE u.role = 'hr' LIMIT 1;
  
  IF v_admin_id IS NOT NULL THEN
    -- Pending tasks (different priorities)
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Complete Q1 Performance Review', 'Submit self-assessment form and schedule meeting with supervisor.', 'high', 'pending', '2026-02-28', 20, 10, v_admin_id
    FROM public.employees e WHERE e.email = 'tvissam96@gmail.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'System Security Audit', 'Conduct comprehensive security audit of all internal systems.', 'urgent', 'pending', '2026-02-25', 30, 20, v_admin_id
    FROM public.employees e WHERE e.email = 'c.harris@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Organize Team Building Event', 'Plan and arrange the quarterly team building activity.', 'low', 'pending', '2026-03-20', 5, 2, v_admin_id
    FROM public.employees e WHERE e.email = 'n.hall@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Review Vendor Contracts', 'Review all vendor contracts expiring in Q1 and prepare renewal recommendations.', 'normal', 'pending', '2026-03-01', 15, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'r.garcia@staffhub.com';

    -- In-progress tasks
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Update Department Documentation', 'Review and update all department procedures and SOPs.', 'normal', 'in_progress', '2026-03-15', 15, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'e.wilson@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Develop New Onboarding Module', 'Create training module for new employee onboarding process.', 'high', 'in_progress', '2026-03-10', 25, 15, v_admin_id
    FROM public.employees e WHERE e.email = 'r.jackson@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Database Migration Planning', 'Plan and document the database migration to new infrastructure.', 'urgent', 'in_progress', '2026-02-28', 30, 20, v_admin_id
    FROM public.employees e WHERE e.email = 'tvissam96@gmail.com';

    -- Completed tasks
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Submit Monthly Report', 'Compile and submit the monthly department activity report.', 'normal', 'completed', '2026-02-10', '2026-02-09 14:30:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'd.brown@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Annual Budget Proposal', 'Prepare department annual budget proposal for FY2026.', 'high', 'completed', '2026-02-05', '2026-02-04 16:00:00+00', 25, 15, v_admin_id
    FROM public.employees e WHERE e.email = 'j.lee@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'IT Inventory Audit', 'Complete inventory of all IT assets and update tracking system.', 'normal', 'completed', '2026-02-12', '2026-02-11 11:00:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'c.harris@staffhub.com';

    -- Overdue tasks (deadline in the past, not completed)
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Submit Research Proposal', 'Draft and submit research grant proposal for spring semester.', 'high', 'overdue', '2026-02-10', 20, 15, v_admin_id
    FROM public.employees e WHERE e.email = 'k.walker@staffhub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Complete Safety Training', 'Finish the mandatory online safety training module.', 'normal', 'overdue', '2026-02-15', 10, 10, v_admin_id
    FROM public.employees e WHERE e.email = 'w.taylor@staffhub.com';

    -- Cancelled task
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Legacy System Documentation', 'Document the legacy payroll system before decommission. (Cancelled - system already decommissioned)', 'low', 'cancelled', '2026-02-20', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'b.scott@staffhub.com';

    -- ============================================================================
    -- WARNINGS - All severities, all statuses
    -- ============================================================================
    
    -- Minor / Acknowledged
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status, acknowledged_at)
    SELECT e.id, v_admin_id, 'Excessive Tardiness', 'Employee has been late 5 times in the past month. Verbal warning issued.', 'minor', 'acknowledged', '2026-02-12 10:00:00+00'
    FROM public.employees e WHERE e.email = 'l.rodriguez@staffhub.com';

    -- Moderate / Active
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status)
    SELECT e.id, v_admin_id, 'Missed Project Deadline', 'Failed to deliver the assigned project by the agreed-upon deadline without prior notice.', 'moderate', 'active'
    FROM public.employees e WHERE e.email = 'w.taylor@staffhub.com';

    -- Major / Resolved
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status, resolution_notes, resolved_at)
    SELECT e.id, v_admin_id, 'Unauthorized System Access', 'Attempted to access restricted admin panel without authorization. Employee counseled and access privileges reviewed.',
      'major', 'resolved', 'Employee attended security training. Access protocols reviewed and updated. No further incidents.', '2026-02-15 14:00:00+00'
    FROM public.employees e WHERE e.email = 'k.walker@staffhub.com';

    -- Critical / Appealed
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status)
    SELECT e.id, v_admin_id, 'Policy Violation - Data Handling', 'Sent sensitive employee data via unencrypted email. Employee has filed an appeal claiming it was accidental.',
      'critical', 'appealed'
    FROM public.employees e WHERE e.email = 'n.hall@staffhub.com';

    -- Another minor / Active (for more variety)
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status)
    SELECT e.id, v_admin_id, 'Dress Code Violation', 'Repeated failure to follow office dress code policy.', 'minor', 'active'
    FROM public.employees e WHERE e.email = 'b.young@staffhub.com';

    -- ============================================================================
    -- ANNOUNCEMENTS - All priorities, active/inactive/expired
    -- ============================================================================
    INSERT INTO public.announcements (title, content, priority, created_by, is_active, expires_at) VALUES
      ('Welcome to StaffHub 3.0', 'StaffHub has been updated with new features including payroll management, task tracking, employee complaints, and performance dashboards. Explore all the new capabilities!', 'high', v_admin_id, true, NULL),
      ('Office Closure Notice', 'The office will be closed on February 28th for annual maintenance. Please plan your work accordingly and ensure all pending tasks are completed before the closure.', 'urgent', v_admin_id, true, '2026-02-28 23:59:59+00'),
      ('New Health Benefits Package', 'We are pleased to announce improved health benefits starting March 2026. This includes dental coverage and extended mental health support. Details will be shared via email.', 'normal', v_admin_id, true, '2026-03-31 23:59:59+00'),
      ('Quarterly Town Hall Meeting', 'Join us for the Q1 town hall meeting on March 5th at 2:00 PM in the main conference hall. Topics include company performance, upcoming projects, and open Q&A.', 'low', v_admin_id, true, '2026-03-05 23:59:59+00'),
      ('Holiday Schedule Updated', 'The company holiday schedule for 2026 has been finalized. Please check the HR portal for the complete list of holidays and plan your leaves accordingly.', 'normal', v_admin_id, true, NULL),
      ('Old Parking Policy', 'Previous parking allocation policy - superseded by new policy.', 'low', v_admin_id, false, NULL),
      ('Expired: January Newsletter', 'Monthly newsletter for January 2026 with company updates and achievements.', 'normal', v_admin_id, true, '2026-01-31 23:59:59+00');

    -- ============================================================================
    -- ACTIVITY LOGS - Diverse entity types
    -- ============================================================================
    INSERT INTO public.activity_logs (user_id, action, entity_type, details) VALUES
      (v_admin_id, 'System initialized with comprehensive seed data', 'system', '{"version": "3.0", "date": "2026-02-19"}'::jsonb),
      (v_admin_id, 'Generated January 2026 payroll for all employees', 'payroll', '{"month": 1, "year": 2026, "count": 21}'::jsonb),
      (v_admin_id, 'Approved and paid January 2026 payroll', 'payroll', '{"month": 1, "year": 2026, "status": "paid"}'::jsonb),
      (v_admin_id, 'Generated February 2026 payroll draft', 'payroll', '{"month": 2, "year": 2026, "count": 21}'::jsonb),
      (v_admin_id, 'Issued warning to Karen Walker - Major severity', 'warning', '{"employee": "Karen Walker", "severity": "major"}'::jsonb);

    IF v_hr_id IS NOT NULL THEN
      INSERT INTO public.activity_logs (user_id, action, entity_type, details) VALUES
        (v_hr_id, 'Approved leave request for Emily Wilson - Sick leave', 'leave', '{"employee": "Emily Wilson", "type": "sick", "days": 2}'::jsonb),
        (v_hr_id, 'Approved leave request for David Brown - Casual leave', 'leave', '{"employee": "David Brown", "type": "casual", "days": 1}'::jsonb),
        (v_hr_id, 'Rejected leave request for Linda Rodriguez - Sick leave', 'leave', '{"employee": "Linda Rodriguez", "type": "sick"}'::jsonb),
        (v_hr_id, 'Reviewed complaint - Office Temperature Issues', 'complaint', '{"status": "under_review", "category": "workplace"}'::jsonb);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- COMPLAINTS - All categories, statuses, priorities
-- ============================================================================
DO $$
DECLARE
  v_hr_id UUID;
  v_admin_id UUID;
BEGIN
  SELECT u.id INTO v_hr_id FROM public.users u WHERE u.role = 'hr' LIMIT 1;
  SELECT u.id INTO v_admin_id FROM public.users u WHERE u.role = 'admin' LIMIT 1;
  
  IF v_hr_id IS NOT NULL THEN
    -- Workplace / Under Review / Normal
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, assigned_to)
    SELECT e.id, 'Office Temperature Issues', 'The AC in our office area has not been working properly for the past 2 weeks. Temperature frequently exceeds comfortable levels.', 'workplace', 'under_review', 'normal', v_hr_id
    FROM public.employees e WHERE e.email = 'd.brown@staffhub.com';

    -- Policy / Pending / Low
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority)
    SELECT e.id, 'Parking Space Allocation', 'Request for review of parking allocation policy. Current system unfairly prioritizes seniority over need.', 'policy', 'pending', 'low'
    FROM public.employees e WHERE e.email = 'm.anderson@staffhub.com';

    -- Safety / Pending / Urgent
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority)
    SELECT e.id, 'Safety Concern - Emergency Exit', 'The emergency exit on 3rd floor is often blocked by storage boxes. This is a serious fire hazard.', 'safety', 'pending', 'urgent'
    FROM public.employees e WHERE e.email = 'b.scott@staffhub.com';

    -- General / Resolved / Normal (with resolution)
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, assigned_to, resolved_by, resolved_at, resolution_notes)
    SELECT e.id, 'Printer Not Working', 'The shared printer on floor 2 has been out of order for a week.', 'general', 'resolved', 'normal', v_hr_id, v_admin_id, '2026-02-15 11:00:00+00',
      'New printer installed. Old unit sent for repair. Backup printer placed on floor 2.'
    FROM public.employees e WHERE e.email = 'c.green@staffhub.com';

    -- Harassment / Pending / High
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, assigned_to)
    SELECT e.id, 'Inappropriate Comments by Colleague', 'A colleague has been making repeated inappropriate comments during meetings. This has been ongoing for 3 weeks.', 'harassment', 'pending', 'high', v_hr_id
    FROM public.employees e WHERE e.email = 'b.young@staffhub.com';

    -- Other / Dismissed / Low
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, resolved_by, resolved_at, resolution_notes)
    SELECT e.id, 'Cafeteria Food Quality', 'The quality of food in the cafeteria has declined significantly.', 'other', 'dismissed', 'low', v_hr_id, '2026-02-10 09:00:00+00',
      'Cafeteria is managed by external vendor. Feedback passed to vendor management. Not within HR purview.'
    FROM public.employees e WHERE e.email = 'r.nelson@staffhub.com';

    -- Staff user complaint (so staff can see their own)
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority)
    SELECT e.id, 'Software License Request', 'Need access to data analysis software for project work. Current free tools are insufficient.', 'policy', 'pending', 'normal'
    FROM public.employees e WHERE e.email = 'tvissam96@gmail.com';
  END IF;
END $$;

-- ============================================================================
-- NOTIFICATIONS - Sample for each type for all 3 auth users
-- ============================================================================
DO $$
DECLARE
  v_admin_uid UUID;
  v_hr_uid UUID;
  v_staff_uid UUID;
BEGIN
  SELECT u.id INTO v_admin_uid FROM public.users u WHERE u.role = 'admin' LIMIT 1;
  SELECT u.id INTO v_hr_uid FROM public.users u WHERE u.role = 'hr' LIMIT 1;
  SELECT u.id INTO v_staff_uid FROM public.users u WHERE u.role = 'staff' LIMIT 1;

  IF v_admin_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at) VALUES
      -- Admin notifications
      (v_admin_uid, 'New Leave Request', 'Michael Davis has submitted a leave request for Feb 22-26.', 'leave', false, now() - interval '1 hour'),
      (v_admin_uid, 'Payroll Generated', 'February 2026 payroll draft has been generated for 21 employees.', 'system', false, now() - interval '2 hours'),
      (v_admin_uid, 'New Complaint Filed', 'A new safety complaint has been filed regarding emergency exits.', 'complaint', false, now() - interval '4 hours'),
      (v_admin_uid, 'Task Overdue', 'Karen Walker has an overdue task: Submit Research Proposal.', 'task', true, now() - interval '1 day'),
      (v_admin_uid, 'Performance Alert', 'Weekly performance scores calculated. 2 employees below threshold.', 'performance', true, now() - interval '2 days'),
      (v_admin_uid, 'Warning Issued', 'Warning issued to Nancy Hall for policy violation - data handling.', 'warning', true, now() - interval '3 days'),
      -- HR notifications
      (v_hr_uid, 'Leave Approved', 'Emily Wilson sick leave (Feb 10-11) has been processed.', 'leave', true, now() - interval '5 hours'),
      (v_hr_uid, 'New Complaint', 'Betty Young has filed a harassment complaint requiring immediate attention.', 'complaint', false, now() - interval '3 hours'),
      (v_hr_uid, 'Attendance Alert', 'Linda Rodriguez has been late 5 times this month.', 'attendance', false, now() - interval '6 hours'),
      (v_hr_uid, 'Payroll Ready for Review', 'February 2026 payroll records are ready for approval.', 'system', false, now() - interval '1 day'),
      (v_hr_uid, 'New Leave Request', 'Sabbatical leave request from James Lee requires review.', 'leave', false, now() - interval '4 hours'),
      -- Staff notifications
      (v_staff_uid, 'Task Assigned', 'You have been assigned a new task: Complete Q1 Performance Review.', 'task', false, now() - interval '2 hours'),
      (v_staff_uid, 'Task Assigned', 'New task: Database Migration Planning - urgent priority.', 'task', false, now() - interval '1 day'),
      (v_staff_uid, 'Leave Status', 'Your annual leave request (Feb 22-26) is pending approval.', 'leave', true, now() - interval '3 hours'),
      (v_staff_uid, 'Performance Update', 'Your weekly performance score has been calculated: 55 points.', 'performance', false, now() - interval '1 day'),
      (v_staff_uid, 'System Update', 'StaffHub has been updated to version 3.0 with new features.', 'system', true, now() - interval '5 days');
  END IF;
END $$;

-- ============================================================================
-- PERFORMANCE & EMPLOYEE OF THE WEEK
-- Automatically calculated based on attendance, tasks, and warnings
-- ============================================================================

-- Calculate weekly performance and select Employee of the Week automatically
DO $$
DECLARE
  v_current_week DATE := (date_trunc('week', CURRENT_DATE))::DATE;
  v_last_week DATE := (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::DATE;
BEGIN
  -- Calculate performance and select Employee of the Week for last week
  -- This populates employee_performance table and employee_of_week table
  PERFORM select_employee_of_week(v_last_week);
  
  -- Calculate performance and select Employee of the Week for current week
  -- Top Performers widget reads from employee_performance table
  PERFORM select_employee_of_week(v_current_week);
  
  RAISE NOTICE 'Performance calculated and Employee of the Week selected for current and last week';
END $$;

-- =============================================
-- SCHEMA COMPLETE
-- =============================================
