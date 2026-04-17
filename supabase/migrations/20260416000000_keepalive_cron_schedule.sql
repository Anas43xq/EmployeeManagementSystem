-- Enable http extension for making HTTP requests from pg_cron
CREATE EXTENSION IF NOT EXISTS http;

-- Unschedule any existing keepalive jobs
DO $$
BEGIN
  PERFORM cron.unschedule('keepalive-vercel-6am');
  PERFORM cron.unschedule('keepalive-vercel-2pm');
  PERFORM cron.unschedule('keepalive-vercel-10pm');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule keepalive-vercel function to run at 6 AM UTC
SELECT cron.schedule(
  'keepalive-vercel-6am',
  '0 6 * * *',
  $$
  SELECT http_post(
    'https://' || current_setting('app.supabase_url') || '/functions/v1/keepalive-vercel',
    '{"timestamp": "' || now() || '"}',
    'application/json'
  );
  $$
);

-- Schedule keepalive-vercel function to run at 2 PM UTC
SELECT cron.schedule(
  'keepalive-vercel-2pm',
  '0 14 * * *',
  $$
  SELECT http_post(
    'https://' || current_setting('app.supabase_url') || '/functions/v1/keepalive-vercel',
    '{"timestamp": "' || now() || '"}',
    'application/json'
  );
  $$
);

-- Schedule keepalive-vercel function to run at 10 PM UTC
SELECT cron.schedule(
  'keepalive-vercel-10pm',
  '0 22 * * *',
  $$
  SELECT http_post(
    'https://' || current_setting('app.supabase_url') || '/functions/v1/keepalive-vercel',
    '{"timestamp": "' || now() || '"}',
    'application/json'
  );
  $$
);
