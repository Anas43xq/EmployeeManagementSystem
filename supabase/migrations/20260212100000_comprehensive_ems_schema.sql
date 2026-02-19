
-- =============================================
-- DROP EXISTING TABLES (Clean Slate)
-- =============================================

-- Drop policies first (they depend on tables)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on tables we're about to drop
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop triggers (wrapped in exception handling since tables may not exist)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_announcements_updated_at_trigger ON public.announcements;
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist, nothing to do
END $$;

DROP FUNCTION IF EXISTS update_announcements_updated_at();

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TABLE IF EXISTS performance_reviews CASCADE;

DROP TABLE IF EXISTS payroll CASCADE;

-- Drop new tables (passkeys, payrolls, bonuses, deductions)
DROP TABLE IF EXISTS public.passkeys CASCADE;
DROP TABLE IF EXISTS public.payrolls CASCADE;
DROP TABLE IF EXISTS public.bonuses CASCADE;
DROP TABLE IF EXISTS public.deductions CASCADE;

-- Drop sequences and functions
DROP SEQUENCE IF EXISTS employee_number_seq CASCADE;
DROP FUNCTION IF EXISTS generate_employee_number() CASCADE;

-- =============================================
-- CREATE TABLES
-- =============================================

-- Users table (links to Supabase auth.users)
-- Email is derived from linked employee (single source of truth)
-- Every user MUST be linked to an employee
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'hr', 'staff')),
  employee_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  banned_at TIMESTAMPTZ DEFAULT NULL,
  ban_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('academic', 'administrative')),
  head_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence for employee numbers
CREATE SEQUENCE IF NOT EXISTS employee_number_seq START 1;

-- Function to generate employee number (EMP001, EMP002, etc.)
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'EMP' || LPAD(nextval('employee_number_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT UNIQUE NOT NULL DEFAULT generate_employee_number(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
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

-- Add foreign key constraints after employees table exists
ALTER TABLE public.departments ADD CONSTRAINT fk_department_head 
  FOREIGN KEY (head_id) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.users ADD CONSTRAINT fk_user_employee 
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

-- Leaves table
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

-- Leave balances table
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

-- Attendance table (extended for passkey biometric attendance)
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half-day')),
  notes TEXT DEFAULT '',
  -- Passkey attendance fields
  attendance_method TEXT NOT NULL DEFAULT 'manual' CHECK (attendance_method IN ('manual', 'passkey')),
  verification_type TEXT CHECK (verification_type IN ('face', 'fingerprint', 'device', 'pin')),
  device_info JSONB DEFAULT '{}'::jsonb,
  --
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Passkeys table for WebAuthn authentication
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

-- Payroll system tables
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

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('leave', 'attendance', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_leave_approvals BOOLEAN DEFAULT true,
  email_attendance_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements table
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
-- INDEXES
-- =============================================

CREATE INDEX idx_employees_department ON public.employees(department_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_email ON public.employees(email);
CREATE INDEX idx_leaves_employee ON public.leaves(employee_id);
CREATE INDEX idx_leaves_status ON public.leaves(status);
CREATE INDEX idx_leave_balances_employee ON public.leave_balances(employee_id);
CREATE INDEX idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_method ON public.attendance(attendance_method);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;
CREATE INDEX idx_announcements_created ON public.announcements(created_at DESC);

-- New indexes for passkey and payroll tables
CREATE INDEX idx_passkeys_user ON public.passkeys(user_id);
CREATE INDEX idx_passkeys_credential ON public.passkeys(credential_id);
CREATE INDEX idx_payrolls_employee ON public.payrolls(employee_id);
CREATE INDEX idx_payrolls_period ON public.payrolls(period_year, period_month);
CREATE INDEX idx_payrolls_status ON public.payrolls(status);
CREATE INDEX idx_bonuses_employee ON public.bonuses(employee_id);
CREATE INDEX idx_bonuses_period ON public.bonuses(period_year, period_month);
CREATE INDEX idx_bonuses_payroll ON public.bonuses(payroll_id);
CREATE INDEX idx_deductions_employee ON public.deductions(employee_id);
CREATE INDEX idx_deductions_period ON public.deductions(period_year, period_month);
CREATE INDEX idx_deductions_payroll ON public.deductions(payroll_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at for announcements
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at_trigger
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- =============================================
-- EMAIL SYNC TRIGGERS (Single source of truth)
-- =============================================
-- Employee email is authoritative; auth.users email syncs FROM employee

-- Trigger to sync auth.users email when employee email changes
CREATE OR REPLACE FUNCTION sync_auth_email_from_employee()
RETURNS TRIGGER AS $$
DECLARE
  linked_user_id UUID;
BEGIN
  -- Find the user linked to this employee
  SELECT id INTO linked_user_id
  FROM public.users
  WHERE employee_id = NEW.id;
  
  -- If found, update auth.users email
  IF linked_user_id IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE auth.users
    SET email = NEW.email,
        updated_at = now()
    WHERE id = linked_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_auth_email_on_employee_update ON public.employees;
CREATE TRIGGER sync_auth_email_on_employee_update
  AFTER UPDATE OF email ON public.employees
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_auth_email_from_employee();

-- =============================================
-- AUTO-SETUP NEW AUTH USERS (Fully Automatic)
-- =============================================
-- When a new user signs up via Supabase Auth, this trigger automatically:
-- 1. Finds the matching employee by email (REQUIRED - fails if not found)
-- 2. Creates a record in public.users linked to the employee
-- 3. Creates default user preferences
-- NOTE: An employee record MUST exist before creating an auth user

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  matched_employee_id UUID;
  user_role TEXT;
BEGIN
  -- Find the matching employee by email (REQUIRED)
  SELECT id INTO matched_employee_id
  FROM public.employees
  WHERE email = NEW.email
  LIMIT 1;
  
  -- FAIL if no employee found - every user must be an employee
  IF matched_employee_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create user: No employee found with email %. Create employee record first.', NEW.email;
  END IF;
  
  -- Get role from app_metadata, user_metadata, or default to 'staff'
  user_role := COALESCE(
    NEW.raw_app_meta_data->>'role',
    NEW.raw_user_meta_data->>'role',
    'staff'
  );
  
  -- Create the public.users record (no email column - comes from employee)
  INSERT INTO public.users (id, role, employee_id, created_at, updated_at)
  VALUES (NEW.id, user_role, matched_employee_id, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    employee_id = EXCLUDED.employee_id,
    updated_at = now();
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id, email_leave_approvals, email_attendance_reminders)
  VALUES (NEW.id, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Also handle auth user email updates (sync to employee)
CREATE OR REPLACE FUNCTION handle_auth_user_email_change()
RETURNS TRIGGER AS $$
DECLARE
  linked_employee_id UUID;
BEGIN
  -- Find the linked employee
  SELECT employee_id INTO linked_employee_id
  FROM public.users
  WHERE id = NEW.id;
  
  -- Update the employee's email (employee is source of truth)
  IF linked_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET email = NEW.email,
        updated_at = now()
    WHERE id = linked_employee_id;
  END IF;
  
  -- Update user's updated_at
  UPDATE public.users
  SET updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION handle_auth_user_email_change();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
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
-- New tables RLS
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Using JWT metadata to avoid recursion
-- =============================================

-- Helper function to get role from JWT with fallback to users table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
  db_role TEXT;
BEGIN
  -- First try to get role from JWT app_metadata (fastest)
  jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';
  
  IF jwt_role IS NOT NULL THEN
    RETURN jwt_role;
  END IF;
  
  -- Fallback: query the users table directly
  -- This is safe because function is SECURITY DEFINER (bypasses RLS)
  SELECT role INTO db_role 
  FROM public.users 
  WHERE id = auth.uid();
  
  -- Return the database role or default to 'staff'
  RETURN COALESCE(db_role, 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get employee_id for current user
CREATE OR REPLACE FUNCTION get_user_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT employee_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get email for current user (from linked employee)
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT e.email 
    FROM public.employees e
    JOIN public.users u ON u.employee_id = e.id
    WHERE u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== USERS POLICIES =====
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ===== DEPARTMENTS POLICIES =====
CREATE POLICY "departments_select_all" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "departments_insert_admin_hr" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "departments_update_admin_hr" ON public.departments
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "departments_delete_admin" ON public.departments
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ===== EMPLOYEES POLICIES =====
CREATE POLICY "employees_select_all" ON public.employees
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employees_insert_admin_hr" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "employees_update_admin_hr" ON public.employees
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "employees_delete_admin" ON public.employees
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ===== LEAVES POLICIES =====
CREATE POLICY "leaves_select_own_or_admin_hr" ON public.leaves
  FOR SELECT TO authenticated
  USING (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "leaves_insert_own" ON public.leaves
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "leaves_update_admin_hr" ON public.leaves
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "leaves_delete_admin_hr" ON public.leaves
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

-- ===== LEAVE BALANCES POLICIES =====
CREATE POLICY "leave_balances_select_own_or_admin_hr" ON public.leave_balances
  FOR SELECT TO authenticated
  USING (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "leave_balances_manage_admin_hr" ON public.leave_balances
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

-- ===== ATTENDANCE POLICIES =====
CREATE POLICY "attendance_select_own_or_admin_hr" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "attendance_insert_own_or_admin_hr" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "attendance_update_own" ON public.attendance
  FOR UPDATE TO authenticated
  USING (employee_id = get_user_employee_id());

CREATE POLICY "attendance_update_admin_hr" ON public.attendance
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "attendance_delete_admin_hr" ON public.attendance
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));


-- ===== NOTIFICATIONS POLICIES =====
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_all" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ===== ACTIVITY LOGS POLICIES =====
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "activity_logs_insert_all" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ===== USER PREFERENCES POLICIES =====
CREATE POLICY "user_preferences_select_own" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preferences_update_own" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ===== ANNOUNCEMENTS POLICIES =====
CREATE POLICY "announcements_select_active" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "announcements_select_admin_hr" ON public.announcements
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'hr'));

CREATE POLICY "announcements_manage_admin_hr" ON public.announcements
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'hr'))
  WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- ===== PASSKEYS POLICIES =====
CREATE POLICY "passkeys_select_own" ON public.passkeys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "passkeys_insert_own" ON public.passkeys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "passkeys_update_own" ON public.passkeys
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "passkeys_delete_own" ON public.passkeys
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ===== PAYROLLS POLICIES =====
CREATE POLICY "payrolls_select_own_or_admin_hr" ON public.payrolls
  FOR SELECT TO authenticated
  USING (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "payrolls_manage_admin_hr" ON public.payrolls
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'hr'))
  WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- ===== BONUSES POLICIES =====
CREATE POLICY "bonuses_select_own_or_admin_hr" ON public.bonuses
  FOR SELECT TO authenticated
  USING (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "bonuses_manage_admin_hr" ON public.bonuses
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'hr'))
  WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- ===== DEDUCTIONS POLICIES =====
CREATE POLICY "deductions_select_own_or_admin_hr" ON public.deductions
  FOR SELECT TO authenticated
  USING (
    employee_id = get_user_employee_id()
    OR get_user_role() IN ('admin', 'hr')
  );

CREATE POLICY "deductions_manage_admin_hr" ON public.deductions
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'hr'))
  WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- =============================================
-- SEED DATA (Auto-generated UUIDs)
-- =============================================

DO $$
DECLARE
  -- Department IDs
  dept_tech UUID := gen_random_uuid();
  dept_business UUID := gen_random_uuid();
  dept_eng UUID := gen_random_uuid();
  dept_hr UUID := gen_random_uuid();
  dept_admin UUID := gen_random_uuid();
  
  -- Employee IDs (declare all 30)
  emp_id UUID;
  emp_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Insert Departments (auto-generated UUIDs)
  INSERT INTO public.departments (id, name, type, description) VALUES
    (dept_tech, 'Technology', 'administrative', 'Technology and IT Services'),
    (dept_business, 'Business Operations', 'administrative', 'Business Operations and Management'),
    (dept_eng, 'Engineering', 'administrative', 'Engineering and Development'),
    (dept_hr, 'Human Resources', 'administrative', 'Human Resources and Recruitment'),
    (dept_admin, 'Administration', 'administrative', 'General Administration and Support');

  -- Insert Employees with auto-generated UUIDs and employee_numbers
  -- Admin employee (login: anas.essam.work@gmail.com / admin123)
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'John', 'Smith', 'anas.essam.work@gmail.com', '555-0101', '1975-03-15', 'male', '123 Admin St', 'Boston', 'MA', '02101', dept_admin, 'System Administrator', 'full-time', 'active', '2010-01-15', 95000, '[{"degree": "MBA", "institution": "Harvard University"}]', 'Jane Smith', '555-0102');

  -- HR employee
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Sarah', 'Johnson', 'essamanas86@gmail.com', '555-0103', '1982-07-22', 'female', '456 HR Ave', 'Boston', 'MA', '02102', dept_admin, 'HR Manager', 'full-time', 'active', '2015-03-20', 75000, '[{"degree": "MS Human Resources", "institution": "Boston College"}]', 'Mike Johnson', '555-0104');

  -- Regular employee
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Michael', 'Davis', 'tvissam96@gmail.com', '555-0105', '1988-11-10', 'male', '789 Faculty Rd', 'Boston', 'MA', '02103', dept_tech, 'Senior Analyst', 'full-time', 'active', '2018-09-01', 68000, '[{"degree": "PhD Computer Science", "institution": "MIT"}]', 'Emily Davis', '555-0106');

  -- Director Tech
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Emily', 'Wilson', 'e.wilson@staffhub.com', '555-0107', '1985-05-18', 'female', '321 Academic Ln', 'Boston', 'MA', '02104', dept_tech, 'Director', 'full-time', 'active', '2012-08-15', 85000, '[{"degree": "PhD Computer Science", "institution": "Stanford University"}]', 'Robert Wilson', '555-0108');

  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'David', 'Brown', 'd.brown@staffhub.com', '555-0109', '1990-02-28', 'male', '654 Tech Blvd', 'Boston', 'MA', '02105', dept_tech, 'Lecturer', 'full-time', 'active', '2019-01-10', 62000, '[{"degree": "MS Computer Science", "institution": "Boston University"}]', 'Lisa Brown', '555-0110');

  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Jennifer', 'Martinez', 'j.martinez@staffhub.com', '555-0111', '1987-09-05', 'female', '987 Business Dr', 'Boston', 'MA', '02106', dept_business, 'Team Lead', 'full-time', 'active', '2014-07-01', 78000, '[{"degree": "PhD Business Administration", "institution": "Wharton"}]', 'Carlos Martinez', '555-0112');

  -- Director Business
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Robert', 'Garcia', 'r.garcia@staffhub.com', '555-0113', '1983-12-20', 'male', '147 Commerce St', 'Boston', 'MA', '02107', dept_business, 'Director', 'full-time', 'active', '2011-09-15', 88000, '[{"degree": "PhD Economics", "institution": "Yale University"}]', 'Maria Garcia', '555-0114');

  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Linda', 'Rodriguez', 'l.rodriguez@staffhub.com', '555-0115', '1992-04-12', 'female', '258 Finance Way', 'Boston', 'MA', '02108', dept_business, 'Senior Analyst', 'full-time', 'active', '2020-01-15', 65000, '[{"degree": "PhD Finance", "institution": "NYU"}]', 'Jose Rodriguez', '555-0116');

  -- Director Engineering
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'James', 'Lee', 'j.lee@staffhub.com', '555-0117', '1986-08-30', 'male', '369 Engineering Ct', 'Boston', 'MA', '02109', dept_eng, 'Director', 'full-time', 'active', '2013-06-01', 90000, '[{"degree": "PhD Mechanical Engineering", "institution": "MIT"}]', 'Susan Lee', '555-0118');

  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Mary', 'Anderson', 'm.anderson@staffhub.com', '555-0119', '1989-01-25', 'female', '741 Tech Plaza', 'Boston', 'MA', '02110', dept_eng, 'Team Lead', 'full-time', 'active', '2016-03-10', 76000, '[{"degree": "PhD Electrical Engineering", "institution": "Caltech"}]', 'Tom Anderson', '555-0120');

  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'William', 'Taylor', 'w.taylor@staffhub.com', '555-0121', '1991-06-14', 'male', '852 Innovation Dr', 'Boston', 'MA', '02111', dept_eng, 'Lecturer', 'part-time', 'active', '2021-09-01', 45000, '[{"degree": "MS Civil Engineering", "institution": "Georgia Tech"}]', 'Ann Taylor', '555-0122');

  -- Director HR
  emp_id := gen_random_uuid();
  emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Patricia', 'Thomas', 'p.thomas@staffhub.com', '555-0123', '1984-10-08', 'female', '963 Liberal Arts Ave', 'Boston', 'MA', '02112', dept_hr, 'Director', 'full-time', 'active', '2012-08-20', 82000, '[{"degree": "PhD English Literature", "institution": "Columbia"}]', 'George Thomas', '555-0124');

  -- Remaining employees
  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Richard', 'Jackson', 'r.jackson@staffhub.com', '555-0125', '1987-03-17', 'male', '159 History Ln', 'Boston', 'MA', '02113', dept_hr, 'Team Lead', 'full-time', 'active', '2015-01-12', 74000, '[{"degree": "PhD History", "institution": "Princeton"}]', 'Barbara Jackson', '555-0126');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Barbara', 'White', 'b.white@staffhub.com', '555-0127', '1993-07-29', 'female', '357 Philosophy Rd', 'Boston', 'MA', '02114', dept_hr, 'Senior Analyst', 'full-time', 'active', '2019-09-01', 63000, '[{"degree": "PhD Philosophy", "institution": "UC Berkeley"}]', 'Steven White', '555-0128');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Charles', 'Harris', 'c.harris@staffhub.com', '555-0129', '1988-11-03', 'male', '468 Support St', 'Boston', 'MA', '02115', dept_admin, 'IT Manager', 'full-time', 'active', '2016-05-15', 72000, '[{"degree": "BS Information Systems", "institution": "Northeastern"}]', 'Nancy Harris', '555-0130');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Susan', 'Clark', 's.clark@staffhub.com', '555-0131', '1990-04-19', 'female', '579 Operations Ave', 'Boston', 'MA', '02116', dept_admin, 'Operations Coordinator', 'full-time', 'active', '2018-02-20', 55000, '[{"degree": "BA Business", "institution": "Suffolk University"}]', 'Paul Clark', '555-0132');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Joseph', 'Lewis', 'j.lewis@staffhub.com', '555-0133', '1986-12-07', 'male', '680 Data Science Blvd', 'Boston', 'MA', '02117', dept_tech, 'Senior Analyst', 'full-time', 'active', '2017-08-01', 70000, '[{"degree": "PhD Data Science", "institution": "Carnegie Mellon"}]', 'Karen Lewis', '555-0134');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Karen', 'Walker', 'k.walker@staffhub.com', '555-0135', '1991-05-23', 'female', '791 AI Research Ct', 'Boston', 'MA', '02118', dept_tech, 'Research Associate', 'contract', 'active', '2022-01-10', 58000, '[{"degree": "MS Artificial Intelligence", "institution": "Stanford"}]', 'Mark Walker', '555-0136');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Nancy', 'Hall', 'n.hall@staffhub.com', '555-0137', '1985-09-16', 'female', '892 Marketing Plaza', 'Boston', 'MA', '02119', dept_business, 'Lecturer', 'part-time', 'active', '2020-09-01', 42000, '[{"degree": "MBA Marketing", "institution": "Babson College"}]', 'Daniel Hall', '555-0138');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Daniel', 'Allen', 'd.allen@staffhub.com', '555-0139', '1989-02-11', 'male', '903 Strategy St', 'Boston', 'MA', '02120', dept_business, 'Senior Lecturer', 'full-time', 'active', '2017-01-15', 66000, '[{"degree": "PhD Management", "institution": "Northwestern"}]', 'Rachel Allen', '555-0140');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Betty', 'Young', 'b.young@staffhub.com', '555-0141', '1992-08-26', 'female', '124 Robotics Way', 'Boston', 'MA', '02121', dept_eng, 'Senior Analyst', 'full-time', 'active', '2020-08-15', 69000, '[{"degree": "PhD Robotics", "institution": "CMU"}]', 'Frank Young', '555-0142');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Paul', 'King', 'p.king@staffhub.com', '555-0143', '1987-12-01', 'male', '235 Materials Ln', 'Boston', 'MA', '02122', dept_eng, 'Director', 'full-time', 'active', '2013-09-01', 87000, '[{"degree": "PhD Materials Science", "institution": "MIT"}]', 'Laura King', '555-0144');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Laura', 'Wright', 'l.wright@staffhub.com', '555-0145', '1990-06-18', 'female', '346 Literature Rd', 'Boston', 'MA', '02123', dept_hr, 'Lecturer', 'part-time', 'active', '2021-01-15', 40000, '[{"degree": "MA English", "institution": "Tufts"}]', 'Kevin Wright', '555-0146');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Kevin', 'Lopez', 'k.lopez@staffhub.com', '555-0147', '1988-03-09', 'male', '457 Sociology Ave', 'Boston', 'MA', '02124', dept_hr, 'Team Lead', 'full-time', 'active', '2016-08-20', 75000, '[{"degree": "PhD Sociology", "institution": "Harvard"}]', 'Michelle Lopez', '555-0148');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Michelle', 'Hill', 'm.hill@staffhub.com', '555-0149', '1991-10-13', 'female', '568 Psychology Blvd', 'Boston', 'MA', '02125', dept_hr, 'Senior Analyst', 'full-time', 'active', '2019-01-10', 67000, '[{"degree": "PhD Psychology", "institution": "UCLA"}]', 'Brian Hill', '555-0150');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Brian', 'Scott', 'b.scott@staffhub.com', '555-0151', '1986-05-27', 'male', '679 Facilities Dr', 'Boston', 'MA', '02126', dept_admin, 'Facilities Manager', 'full-time', 'active', '2015-03-15', 60000, '[{"degree": "BS Facilities Management", "institution": "UMass"}]', 'Carol Scott', '555-0152');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Carol', 'Green', 'c.green@staffhub.com', '555-0153', '1993-01-08', 'female', '780 Finance Office St', 'Boston', 'MA', '02127', dept_admin, 'Financial Analyst', 'full-time', 'active', '2020-06-01', 58000, '[{"degree": "MS Finance", "institution": "Boston College"}]', 'Eric Green', '555-0154');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Eric', 'Adams', 'e.adams@staffhub.com', '555-0155', '1989-07-21', 'male', '891 Registrar Ave', 'Boston', 'MA', '02128', dept_admin, 'Registrar Coordinator', 'full-time', 'active', '2018-08-20', 52000, '[{"degree": "BA Administration", "institution": "Emerson"}]', 'Diana Adams', '555-0156');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Diana', 'Baker', 'd.baker@staffhub.com', '555-0157', '1990-11-30', 'female', '902 Library Plaza', 'Boston', 'MA', '02129', dept_admin, 'Librarian', 'full-time', 'active', '2019-05-15', 54000, '[{"degree": "MLS Library Science", "institution": "Simmons"}]', 'Ryan Baker', '555-0158');

  emp_id := gen_random_uuid(); emp_ids := emp_ids || emp_id;
  INSERT INTO public.employees (id, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES (emp_id, 'Ryan', 'Nelson', 'r.nelson@staffhub.com', '555-0159', '1987-04-04', 'male', '113 Student Services Rd', 'Boston', 'MA', '02130', dept_admin, 'Student Services Advisor', 'full-time', 'active', '2017-09-01', 56000, '[{"degree": "MS Counseling", "institution": "Lesley"}]', 'Jessica Nelson', '555-0160');

  -- Update department heads using email lookup
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'e.wilson@staffhub.com') WHERE id = dept_tech;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'r.garcia@staffhub.com') WHERE id = dept_business;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'j.lee@staffhub.com') WHERE id = dept_eng;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'p.thomas@staffhub.com') WHERE id = dept_hr;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'admin@staffhub.com') WHERE id = dept_admin;

END $$;

-- Insert Leave Balances for 2026
INSERT INTO public.leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, casual_total, casual_used)
SELECT id, 2026, 20, 0, 10, 0, 10, 0 FROM public.employees;

-- Insert Sample Leave Applications (using email lookup)
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-02-20', '2026-02-24', 5, 'Family vacation', 'pending' FROM public.employees WHERE email = 'employee@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'sick', '2026-02-10', '2026-02-11', 2, 'Medical appointment', 'approved' FROM public.employees WHERE email = 'e.wilson@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'casual', '2026-02-15', '2026-02-15', 1, 'Personal work', 'approved' FROM public.employees WHERE email = 'd.brown@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-03-01', '2026-03-07', 7, 'Conference attendance', 'pending' FROM public.employees WHERE email = 'j.martinez@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'sick', '2026-01-25', '2026-01-26', 2, 'Flu', 'rejected' FROM public.employees WHERE email = 'l.rodriguez@staffhub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-02-18', '2026-02-19', 2, 'Personal matters', 'pending' FROM public.employees WHERE email = 'j.lee@staffhub.com';

-- Insert Attendance Records for the past 7 days (excluding today and excluding demo users)
DO $$
DECLARE
  emp_record RECORD;
  day_offset INTEGER;
BEGIN
  FOR emp_record IN 
    SELECT e.id FROM public.employees e
    WHERE e.status = 'active'
      AND e.email NOT IN ('admin@staffhub.com', 'hr@staffhub.com', 'employee@staffhub.com')
  LOOP
    FOR day_offset IN 1..7 LOOP
      INSERT INTO public.attendance (employee_id, date, check_in, check_out, status, attendance_method, verification_type, device_info)
      VALUES (
        emp_record.id,
        CURRENT_DATE - day_offset,
        '09:00',
        '17:00',
        'present',
        'manual',
        null,
        '{}'::jsonb
      )
      ON CONFLICT (employee_id, date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =============================================
-- SEED PAYROLL DATA (January 2026 - Paid)
-- =============================================

-- Insert payroll records for all active employees for January 2026
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at)
SELECT 
  e.id,
  1, -- January
  2026,
  e.salary,
  CASE 
    WHEN e.position IN ('Director', 'System Administrator') THEN 1500
    WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000
    WHEN e.position LIKE 'Senior%' THEN 750
    ELSE 500
  END AS total_bonuses,
  ROUND(e.salary * 0.08, 2) AS total_deductions, -- ~8% standard deductions (tax + insurance)
  e.salary + CASE 
    WHEN e.position IN ('Director', 'System Administrator') THEN 1500
    WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000
    WHEN e.position LIKE 'Senior%' THEN 750
    ELSE 500
  END AS gross_salary,
  e.salary + CASE 
    WHEN e.position IN ('Director', 'System Administrator') THEN 1500
    WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000
    WHEN e.position LIKE 'Senior%' THEN 750
    ELSE 500
  END - ROUND(e.salary * 0.08, 2) AS net_salary,
  'paid',
  'January 2026 payroll - processed',
  '2026-01-31'::TIMESTAMPTZ
FROM public.employees e
WHERE e.status = 'active'
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- Insert bonuses for January 2026
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT 
  e.id,
  p.id,
  'allowance',
  CASE 
    WHEN e.position IN ('Director', 'System Administrator') THEN 1000
    WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 700
    WHEN e.position LIKE 'Senior%' THEN 500
    ELSE 300
  END,
  'Monthly housing allowance',
  1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT 
  e.id,
  p.id,
  'allowance',
  CASE 
    WHEN e.position IN ('Director', 'System Administrator') THEN 500
    WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 300
    WHEN e.position LIKE 'Senior%' THEN 250
    ELSE 200
  END,
  'Monthly transport allowance',
  1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

-- Insert deductions for January 2026
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT 
  e.id,
  p.id,
  'tax',
  ROUND(e.salary * 0.05, 2),
  'Income tax - 5%',
  1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT 
  e.id,
  p.id,
  'insurance',
  ROUND(e.salary * 0.02, 2),
  'Health insurance premium',
  1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT 
  e.id,
  p.id,
  'retirement',
  ROUND(e.salary * 0.01, 2),
  'Retirement fund contribution',
  1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

-- =============================================
-- PAYROLL UTILITY FUNCTIONS
-- =============================================

-- Function to calculate attendance-based deductions
CREATE OR REPLACE FUNCTION calculate_attendance_deductions(
  p_employee_id UUID,
  p_month INTEGER,
  p_year INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_working_days INTEGER;
  v_present_days INTEGER;
  v_late_days INTEGER;
  v_absent_days INTEGER;
  v_base_salary NUMERIC;
  v_daily_salary NUMERIC;
  v_deductions NUMERIC := 0;
BEGIN
  -- Get employee base salary
  SELECT salary INTO v_base_salary
  FROM public.employees
  WHERE id = p_employee_id;
  
  -- Get working days in month
  v_working_days := (
    SELECT COUNT(*)
    FROM generate_series(
      make_date(p_year, p_month, 1),
      (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE,
      '1 day'::INTERVAL
    ) AS day
    WHERE EXTRACT(dow FROM day) NOT IN (0, 6) -- Exclude weekends
  );
  
  v_daily_salary := v_base_salary / v_working_days;
  
  -- Count attendance records
  SELECT 
    COUNT(*) FILTER (WHERE status = 'present') as present,
    COUNT(*) FILTER (WHERE status = 'late') as late,
    COUNT(*) FILTER (WHERE status = 'absent') as absent
  INTO v_present_days, v_late_days, v_absent_days
  FROM public.attendance
  WHERE employee_id = p_employee_id
    AND EXTRACT(month FROM date) = p_month
    AND EXTRACT(year FROM date) = p_year;
  
  -- Calculate deductions
  v_deductions := v_deductions + (v_absent_days * v_daily_salary); -- Full day deduction for absence
  v_deductions := v_deductions + (v_late_days * v_daily_salary * 0.1); -- 10% deduction for late
  
  RETURN COALESCE(v_deductions, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate leave-based deductions  
CREATE OR REPLACE FUNCTION calculate_leave_deductions(
  p_employee_id UUID,
  p_month INTEGER,
  p_year INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_unpaid_leave_days INTEGER;
  v_base_salary NUMERIC;
  v_working_days INTEGER;
  v_daily_salary NUMERIC;
  v_deductions NUMERIC := 0;
BEGIN
  -- Get employee base salary
  SELECT salary INTO v_base_salary
  FROM public.employees
  WHERE id = p_employee_id;
  
  -- Get working days in month
  v_working_days := (
    SELECT COUNT(*)
    FROM generate_series(
      make_date(p_year, p_month, 1),
      (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE,
      '1 day'::INTERVAL
    ) AS day
    WHERE EXTRACT(dow FROM day) NOT IN (0, 6) -- Exclude weekends
  );
  
  v_daily_salary := v_base_salary / v_working_days;
  
  -- Get unpaid leave days (leaves that exceed balance)
  SELECT COALESCE(SUM(
    CASE 
      WHEN l.leave_type = 'annual' THEN GREATEST(0, l.days_count - COALESCE(lb.annual_total - lb.annual_used, 0))
      WHEN l.leave_type = 'sick' THEN GREATEST(0, l.days_count - COALESCE(lb.sick_total - lb.sick_used, 0))
      WHEN l.leave_type = 'casual' THEN GREATEST(0, l.days_count - COALESCE(lb.casual_total - lb.casual_used, 0))
      ELSE l.days_count -- Other leave types are unpaid by default
    END
  ), 0) INTO v_unpaid_leave_days
  FROM public.leaves l
  LEFT JOIN public.leave_balances lb ON lb.employee_id = l.employee_id AND lb.year = p_year
  WHERE l.employee_id = p_employee_id
    AND l.status = 'approved'
    AND (
      (EXTRACT(month FROM l.start_date) = p_month AND EXTRACT(year FROM l.start_date) = p_year)
      OR (EXTRACT(month FROM l.end_date) = p_month AND EXTRACT(year FROM l.end_date) = p_year)
    );
  
  v_deductions := v_unpaid_leave_days * v_daily_salary;
  
  RETURN COALESCE(v_deductions, 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ENABLE REALTIME
-- =============================================

-- Set REPLICA IDENTITY to FULL for realtime tables
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.leaves REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leaves'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.leaves;
    END IF;
  END IF;
END $$;

-- =============================================
-- CREATE AUTH USERS (Demo accounts)
-- =============================================
-- Creates auth users directly in the database

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Delete existing demo users to avoid conflicts
DELETE FROM auth.users WHERE email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com');

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES 
-- Admin user
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'anas.essam.work@gmail.com',
  extensions.crypt('admin123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
-- HR user
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'essamanas86@gmail.com',
  extensions.crypt('hr123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "hr"}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
-- Employee user
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'tvissam96@gmail.com',
  extensions.crypt('emp123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "staff"}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- =============================================
-- AUTO-LINK AUTH USERS TO EMPLOYEES
-- =============================================
-- Links users to employees. Employee MUST exist first.

-- Set roles in app_metadata for demo users
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}' WHERE email = 'anas.essam.work@gmail.com';
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "hr"}' WHERE email = 'essamanas86@gmail.com';
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "staff"}' WHERE email = 'tvissam96@gmail.com';

-- Link auth users to employees in the users table (no email column - comes from employee)
INSERT INTO public.users (id, role, employee_id)
SELECT 
  au.id,
  COALESCE(au.raw_app_meta_data->>'role', 'staff') as role,
  e.id as employee_id
FROM auth.users au
INNER JOIN public.employees e ON e.email = au.email
WHERE au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET 
  role = EXCLUDED.role,
  employee_id = EXCLUDED.employee_id,
  updated_at = now();

-- Create user preferences for each user
INSERT INTO public.user_preferences (user_id, email_leave_approvals, email_attendance_reminders)
SELECT id, true, true FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- Insert announcements (only if admin user exists)
INSERT INTO public.announcements (title, content, priority, created_by, is_active) 
SELECT 
  'Welcome to StaffHub', 
  'StaffHub has been updated with new features including announcements, improved leave management, and better attendance tracking.', 
  'high', 
  u.id, 
  true
FROM public.users u WHERE u.role = 'admin' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, content, priority, created_by, is_active) 
SELECT 
  'Office Closure Notice', 
  'The office will be closed on February 15th for maintenance. Please plan accordingly.', 
  'urgent', 
  u.id, 
  true
FROM public.users u WHERE u.role = 'admin' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, content, priority, created_by, is_active) 
SELECT 
  'New Health Benefits', 
  'We are pleased to announce improved health benefits starting March 2026. Details will be shared via email.', 
  'normal', 
  u.id, 
  true
FROM public.users u WHERE u.role = 'admin' LIMIT 1
ON CONFLICT DO NOTHING;

-- Add activity log for system init
INSERT INTO public.activity_logs (user_id, action, entity_type, details)
SELECT id, 'System initialized with seed data', 'system', '{"version": "2.0", "date": "2026-02-14"}'::jsonb
FROM public.users WHERE role = 'admin' LIMIT 1;

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create employee-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload employee photos
CREATE POLICY "Authenticated users can upload employee photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-photos');

-- Allow authenticated users to update employee photos
CREATE POLICY "Authenticated users can update employee photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'employee-photos');

-- Allow authenticated users to delete employee photos
CREATE POLICY "Authenticated users can delete employee photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'employee-photos');

-- Allow public read access to employee photos
CREATE POLICY "Public read access for employee photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'employee-photos');
