-- Migration File 06: Triggers (Updated_at)
-- Purpose: Create BEFORE UPDATE triggers on all tables with updated_at column
-- Dependencies: File 00 (update_updated_at_column function) + Files 01-05 (all tables must exist)
-- Note: Cleanup is handled by 20260218999999_cleanup_all.sql
-- Created by: Migration Split Plan


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

CREATE TRIGGER faqs_updated_at_trigger
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
