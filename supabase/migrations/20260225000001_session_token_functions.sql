-- SECURITY DEFINER functions for session token management.
-- These bypass RLS so any authenticated user can read/write their own
-- current_session_token regardless of their role.

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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_own_session_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_session_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_own_session_token() TO authenticated;
