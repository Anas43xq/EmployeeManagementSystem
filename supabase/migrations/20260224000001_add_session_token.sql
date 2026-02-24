-- Add single-session enforcement column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_session_token TEXT DEFAULT NULL;
