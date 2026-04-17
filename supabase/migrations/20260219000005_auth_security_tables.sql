-- Migration File 05: Authentication & Security Tables
-- Purpose: Create passkeys, login attempts, and auth security functions
-- Dependencies: File 00 (uses get_progressive_delay_seconds, get_seconds_until_retry)
-- Note: Cleanup is handled by 20260218999999_cleanup_all.sql
-- Created by: Migration Split Plan


-- ============================================================
-- AUTHENTICATION & SECURITY TABLES
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


-- ============================================================
-- AUTHENTICATION & SECURITY FUNCTIONS
-- ============================================================

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
        last_attempt_at = v_now,
        updated_at      = v_now
    WHERE login_attempt_limits.window_start_at + (v_window_minutes || ' minutes')::INTERVAL > v_now
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
