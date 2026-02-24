-- Enable Realtime on users table for single-session eviction
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
