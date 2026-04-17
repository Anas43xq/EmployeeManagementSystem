-- Migration File 07: Email Sync & Auth Triggers
-- Purpose: Create triggers and functions for email synchronization between employees and auth.users
-- Dependencies: File 01 (employees, users tables must exist)
-- Note: Cleanup is handled by 20260218999999_cleanup_all.sql
-- Created by: Migration Split Plan


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
-- Employee ID is passed via raw_app_meta_data by grant-user-access or other creation flows
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  employee_id_from_metadata UUID;
  matched_employee_id UUID;
  user_role TEXT;
BEGIN
  -- First, try to get employee_id from raw_app_meta_data (set by grant-user-access)
  employee_id_from_metadata := (NEW.raw_app_meta_data->>'employee_id')::UUID;
  
  -- If no employee_id in metadata, try to match by email (case-insensitive)
  IF employee_id_from_metadata IS NULL THEN
    SELECT id INTO matched_employee_id FROM public.employees WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
    IF matched_employee_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create user: No employee found with email % and no employee_id provided. Create employee record first.', NEW.email;
    END IF;
    employee_id_from_metadata := matched_employee_id;
  END IF;
  
  user_role := COALESCE(NEW.raw_app_meta_data->>'role', 'staff');
  
  INSERT INTO public.users (id, role, employee_id, created_at, updated_at)
  VALUES (NEW.id, user_role, employee_id_from_metadata, now(), now())
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
