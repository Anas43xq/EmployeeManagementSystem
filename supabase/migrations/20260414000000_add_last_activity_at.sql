-- Add last_activity_at column to users table for session inactivity tracking
ALTER TABLE public.users
ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT now();

-- Create an index on last_activity_at for faster queries
CREATE INDEX idx_users_last_activity_at ON public.users(last_activity_at);

-- Add comment explaining the column
COMMENT ON COLUMN public.users.last_activity_at IS 'Tracks when the user last performed an action. Used for inactivity-based session validation.';
