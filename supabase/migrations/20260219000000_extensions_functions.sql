-- Migration File 00: Extensions & Utility Functions
-- Purpose: Create extensions, sequences, and utility functions that other files depend on
-- Dependencies: None (independent)
-- Created by: Migration Split Plan

-- ============================================================
-- CLEANUP (Run this first to ensure idempotency)
-- ============================================================

DO $$
BEGIN
  -- Drop functions in reverse dependency order
  DROP FUNCTION IF EXISTS public.update_faqs_updated_at() CASCADE;
  DROP FUNCTION IF EXISTS public.validate_otp_request_cooldown(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.reset_login_attempts_rpc(UUID) CASCADE;
  DROP FUNCTION IF EXISTS public.check_ip_mac_limits(TEXT, TEXT, TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.record_failed_login(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.pre_auth_login_check(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.cleanup_old_login_attempts() CASCADE;
  DROP FUNCTION IF EXISTS public.cleanup_expired_login_limits() CASCADE;
  DROP FUNCTION IF EXISTS public.refresh_otp_expiry(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.get_seconds_until_retry(TIMESTAMPTZ) CASCADE;
  DROP FUNCTION IF EXISTS public.get_progressive_delay_seconds(INT) CASCADE;
  DROP FUNCTION IF EXISTS public.get_role_user_emails(TEXT[], UUID) CASCADE;
  DROP FUNCTION IF EXISTS public.get_role_user_emails(TEXT[]) CASCADE;
  DROP FUNCTION IF EXISTS public.notify_role_users(TEXT, TEXT, TEXT, TEXT[], UUID) CASCADE;
  DROP FUNCTION IF EXISTS public.notify_role_users(TEXT, TEXT, TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.clear_own_session_token() CASCADE;
  DROP FUNCTION IF EXISTS public.set_own_session_token(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public.get_own_session_token() CASCADE;
  DROP FUNCTION IF EXISTS generate_employee_number() CASCADE;
  DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
  DROP SEQUENCE IF EXISTS employee_number_seq CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- EXTENSIONS & SEQUENCES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;

CREATE SEQUENCE IF NOT EXISTS employee_number_seq START 1;


-- ============================================================
-- CORE UTILITY FUNCTIONS
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


-- ============================================================
-- PROGRESSIVE LOGIN DELAY HELPERS
-- ============================================================

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


-- ============================================================
-- NOTIFICATION HELPERS
-- ============================================================

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
