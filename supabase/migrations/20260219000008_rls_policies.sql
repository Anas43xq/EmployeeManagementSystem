-- Migration File 08: RLS Policies
-- Purpose: Enable RLS on all tables and create security policies
-- Dependencies: Files 01-05 (all tables must exist)
-- Note: Cleanup is handled by 20260218999999_cleanup_all.sql
-- Created by: Migration Split Plan


-- ============================================================
-- ENABLE RLS ON ALL TABLES
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


-- ============================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================

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


-- ============================================================
-- RLS POLICIES: USERS
-- ============================================================

CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR id = (select auth.uid()));
CREATE POLICY "users_insert_admin" ON public.users FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) = 'admin');
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE TO authenticated
  USING ((select get_user_role()) = 'admin');
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');


-- ============================================================
-- RLS POLICIES: DEPARTMENTS
-- ============================================================

CREATE POLICY "departments_select_all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert_admin_hr" ON public.departments FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "departments_update_admin_hr" ON public.departments FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');


-- ============================================================
-- RLS POLICIES: EMPLOYEES
-- ============================================================

CREATE POLICY "employees_select_all" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert_admin_hr" ON public.employees FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employees_update_admin_hr" ON public.employees FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employees_delete_admin" ON public.employees FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');


-- ============================================================
-- RLS POLICIES: LEAVES
-- ============================================================

CREATE POLICY "leaves_select_own_or_admin_hr" ON public.leaves FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leaves_insert_own" ON public.leaves FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leaves_update_admin_hr" ON public.leaves FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leaves_delete_admin_hr" ON public.leaves FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: LEAVE BALANCES
-- ============================================================

CREATE POLICY "leave_balances_select_policy" ON public.leave_balances FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "leave_balances_insert_admin_hr" ON public.leave_balances FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leave_balances_update_admin_hr" ON public.leave_balances FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "leave_balances_delete_admin_hr" ON public.leave_balances FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: ATTENDANCE
-- ============================================================

CREATE POLICY "attendance_select_own_or_admin_hr" ON public.attendance FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_insert_own_or_admin_hr" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_update_policy" ON public.attendance FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "attendance_delete_admin_hr" ON public.attendance FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "notifications_insert_admin_hr" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));


-- ============================================================
-- RLS POLICIES: ACTIVITY LOGS
-- ============================================================

CREATE POLICY "activity_logs_select_admin" ON public.activity_logs FOR SELECT TO authenticated
  USING ((select get_user_role()) = 'admin');


-- ============================================================
-- RLS POLICIES: USER PREFERENCES
-- ============================================================

CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "user_preferences_delete_admin" ON public.user_preferences FOR DELETE TO authenticated
  USING ((select get_user_role()) = 'admin');


-- ============================================================
-- RLS POLICIES: ANNOUNCEMENTS
-- ============================================================

CREATE POLICY "announcements_select_policy" ON public.announcements FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR (is_active = true AND (expires_at IS NULL OR expires_at > now())));
CREATE POLICY "announcements_insert_admin_hr" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "announcements_update_admin_hr" ON public.announcements FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "announcements_delete_admin_hr" ON public.announcements FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: PASSKEYS
-- ============================================================

CREATE POLICY "passkeys_select_own" ON public.passkeys FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "passkeys_insert_own" ON public.passkeys FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "passkeys_update_own" ON public.passkeys FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "passkeys_delete_own" ON public.passkeys FOR DELETE TO authenticated USING (user_id = (select auth.uid()));


-- ============================================================
-- RLS POLICIES: LOGIN ATTEMPTS
-- ============================================================

CREATE POLICY "login_attempts_select_own" ON public.login_attempts FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "login_attempts_insert_own" ON public.login_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "login_attempts_update_own" ON public.login_attempts FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "login_attempts_select_admin_hr" ON public.login_attempts FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: LOGIN ATTEMPT LIMITS
-- ============================================================

CREATE POLICY "login_attempt_limits_deny_all" ON public.login_attempt_limits FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY "login_attempt_limits_deny_insert" ON public.login_attempt_limits FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "login_attempt_limits_deny_update" ON public.login_attempt_limits FOR UPDATE TO authenticated USING (FALSE) WITH CHECK (FALSE);
CREATE POLICY "login_attempt_limits_deny_delete" ON public.login_attempt_limits FOR DELETE TO authenticated USING (FALSE);


-- ============================================================
-- RLS POLICIES: PAYROLLS
-- ============================================================

CREATE POLICY "payrolls_select_policy" ON public.payrolls FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "payrolls_insert_admin_hr" ON public.payrolls FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "payrolls_update_admin_hr" ON public.payrolls FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "payrolls_delete_admin_hr" ON public.payrolls FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: BONUSES
-- ============================================================

CREATE POLICY "bonuses_select_policy" ON public.bonuses FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "bonuses_insert_admin_hr" ON public.bonuses FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "bonuses_update_admin_hr" ON public.bonuses FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "bonuses_delete_admin_hr" ON public.bonuses FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: DEDUCTIONS
-- ============================================================

CREATE POLICY "deductions_select_policy" ON public.deductions FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "deductions_insert_admin_hr" ON public.deductions FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "deductions_update_admin_hr" ON public.deductions FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "deductions_delete_admin_hr" ON public.deductions FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: EMPLOYEE TASKS
-- ============================================================

CREATE POLICY "tasks_select_policy" ON public.employee_tasks FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "tasks_insert_admin_hr" ON public.employee_tasks FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "tasks_update_policy" ON public.employee_tasks FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()))
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "tasks_delete_admin_hr" ON public.employee_tasks FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: EMPLOYEE WARNINGS
-- ============================================================

CREATE POLICY "warnings_select_policy" ON public.employee_warnings FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "warnings_insert_admin_hr" ON public.employee_warnings FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "warnings_update_policy" ON public.employee_warnings FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()))
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "warnings_delete_admin_hr" ON public.employee_warnings FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: EMPLOYEE COMPLAINTS
-- ============================================================

CREATE POLICY "complaints_select_policy" ON public.employee_complaints FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "complaints_insert_policy" ON public.employee_complaints FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "complaints_update_admin_hr" ON public.employee_complaints FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "complaints_delete_admin_hr" ON public.employee_complaints FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: EMPLOYEE PERFORMANCE
-- ============================================================

CREATE POLICY "performance_select_policy" ON public.employee_performance FOR SELECT TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr') OR employee_id = (select get_user_employee_id()));
CREATE POLICY "performance_insert_admin_hr" ON public.employee_performance FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "performance_update_admin_hr" ON public.employee_performance FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "performance_delete_admin_hr" ON public.employee_performance FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: EMPLOYEE OF WEEK
-- ============================================================

CREATE POLICY "employee_of_week_select_all" ON public.employee_of_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "employee_of_week_insert_admin_hr" ON public.employee_of_week FOR INSERT TO authenticated
  WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employee_of_week_update_admin_hr" ON public.employee_of_week FOR UPDATE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr')) WITH CHECK ((select get_user_role()) IN ('admin', 'hr'));
CREATE POLICY "employee_of_week_delete_admin_hr" ON public.employee_of_week FOR DELETE TO authenticated
  USING ((select get_user_role()) IN ('admin', 'hr'));


-- ============================================================
-- RLS POLICIES: FAQs
-- ============================================================

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
