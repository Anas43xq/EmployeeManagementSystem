-- ============================================================================
-- Migration: Login attempt RPC functions (SECURITY DEFINER)
-- ============================================================================
-- These functions run pre-auth (before the user has a session), so they must
-- bypass RLS.  They are granted to both anon and authenticated roles.
--
-- 1. pre_auth_login_check  — resolve email → user_id, return attempt status
-- 2. record_failed_login   — increment counter, set OTP window at threshold
-- 3. reset_login_attempts  — zero out counters (called post-auth)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. pre_auth_login_check(p_email TEXT)
--    Looks up the user by email via auth.users, checks login_attempts,
--    and returns a JSON object with attempt status.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pre_auth_login_check(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id     UUID;
  v_record      RECORD;
  v_failed      INT;
  v_remaining   INT;
  v_requires    BOOLEAN;
  v_seconds     INT;
  v_threshold   INT := 5;
  v_otp_ms      INT := 600; -- 10 minutes in seconds
BEGIN
  -- Resolve user_id from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Don't reveal whether the email exists
    RETURN jsonb_build_object(
      'user_id',           NULL,
      'failed_attempts',   0,
      'attempts_remaining', v_threshold,
      'requires_otp',      false,
      'otp_expires_at',    NULL,
      'otp_seconds_left',  0
    );
  END IF;

  SELECT * INTO v_record
  FROM public.login_attempts
  WHERE user_id = v_user_id;

  v_failed    := COALESCE(v_record.failed_attempts, 0);
  v_remaining := GREATEST(0, v_threshold - v_failed);
  v_requires  := v_failed >= v_threshold;
  v_seconds   := 0;

  IF v_requires AND v_record.otp_expires_at IS NOT NULL THEN
    v_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_record.otp_expires_at - now()))::INT);
  END IF;

  RETURN jsonb_build_object(
    'user_id',            v_user_id,
    'failed_attempts',    v_failed,
    'attempts_remaining', v_remaining,
    'requires_otp',       v_requires,
    'otp_expires_at',     v_record.otp_expires_at,
    'otp_seconds_left',   v_seconds
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. record_failed_login(p_email TEXT)
--    Increments the counter for the user (resolved by email).
--    On the 5th failure, sets the OTP expiry window.
--    Returns updated status JSON.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id      UUID;
  v_new_fails    INT;
  v_remaining    INT;
  v_requires     BOOLEAN;
  v_seconds      INT := 0;
  v_threshold    INT := 5;
  v_otp_minutes  INT := 10;
  v_otp_expires  TIMESTAMPTZ;
  v_now          TIMESTAMPTZ := now();
BEGIN
  -- Resolve user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id',            NULL,
      'failed_attempts',    0,
      'attempts_remaining', v_threshold,
      'requires_otp',       false,
      'otp_expires_at',     NULL,
      'otp_seconds_left',   0
    );
  END IF;

  -- Upsert and increment
  INSERT INTO public.login_attempts (user_id, failed_attempts, last_attempt_at)
  VALUES (v_user_id, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE
    SET failed_attempts = login_attempts.failed_attempts + 1,
        last_attempt_at = v_now,
        updated_at      = v_now
  RETURNING failed_attempts INTO v_new_fails;

  -- Set OTP window on exact threshold
  IF v_new_fails = v_threshold THEN
    v_otp_expires := v_now + (v_otp_minutes || ' minutes')::INTERVAL;
    UPDATE public.login_attempts
    SET otp_sent_at    = v_now,
        otp_expires_at = v_otp_expires,
        updated_at     = v_now
    WHERE user_id = v_user_id;
  ELSE
    SELECT otp_expires_at INTO v_otp_expires
    FROM public.login_attempts
    WHERE user_id = v_user_id;
  END IF;

  v_remaining := GREATEST(0, v_threshold - v_new_fails);
  v_requires  := v_new_fails >= v_threshold;

  IF v_requires AND v_otp_expires IS NOT NULL THEN
    v_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_otp_expires - v_now))::INT);
  END IF;

  -- Log activity
  BEGIN
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
      v_user_id, 'user_login_failed', 'user', v_user_id,
      jsonb_build_object(
        'email',           p_email,
        'failed_attempts', v_new_fails,
        'requires_otp',    v_requires
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- non-critical, swallow
    NULL;
  END;

  RETURN jsonb_build_object(
    'user_id',            v_user_id,
    'failed_attempts',    v_new_fails,
    'attempts_remaining', v_remaining,
    'requires_otp',       v_requires,
    'otp_expires_at',     v_otp_expires,
    'otp_seconds_left',   v_seconds
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. reset_login_attempts(p_user_id UUID)
--    Called post-auth after successful login / OTP verification.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_login_attempts_rpc(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_attempts
  SET failed_attempts = 0,
      last_attempt_at = NULL,
      otp_sent_at     = NULL,
      otp_expires_at  = NULL,
      updated_at      = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. refresh_otp_expiry(p_email TEXT)
--    Refreshes the OTP window after re-sending an OTP.
-- ────────────────────────────────────────────────────────────────────────────
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
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.login_attempts
    SET otp_sent_at    = v_now,
        otp_expires_at = v_now + INTERVAL '10 minutes',
        updated_at     = v_now
    WHERE user_id = v_user_id;
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTs – callable by both anon (pre-auth) and authenticated (post-auth)
-- ────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.pre_auth_login_check(TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(TEXT)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts_rpc(UUID)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_otp_expiry(TEXT)          TO anon, authenticated;
