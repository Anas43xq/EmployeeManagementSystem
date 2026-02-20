-- Fix: Allow HR users to read the users table
-- Previously, only admins and self-lookups were allowed, which prevented
-- HR users from looking up target user IDs when sending notifications
-- (warnings, complaints, tasks, leaves, etc.)

DROP POLICY IF EXISTS "users_select_policy" ON public.users;

CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated
  USING (
    (select get_user_role()) IN ('admin', 'hr')
    OR id = (select auth.uid())
  );
