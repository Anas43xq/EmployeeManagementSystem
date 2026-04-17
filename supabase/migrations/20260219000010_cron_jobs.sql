-- Migration File 10: Cron Jobs
-- Purpose: Schedule recurring jobs for performance calculation and employee of week selection
-- Dependencies: File 00 (pg_cron extension) + File 09 (functions must exist)
-- Created by: Migration Split Plan

-- ============================================================
-- CLEANUP (Unschedule existing jobs)
-- ============================================================

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-performance-calculation');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-employee-of-week');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- CRON JOBS
-- ============================================================

-- Schedule: Every Monday at 00:05 UTC
-- Purpose: Calculate performance metrics for the previous week (last Sunday to Saturday)
SELECT cron.schedule(
  'weekly-performance-calculation',
  '5 0 * * 1',
  $$
  SELECT calculate_weekly_performance(
    (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::DATE
  );
  $$
);

-- Schedule: Every Monday at 00:10 UTC
-- Purpose: Auto-select employee of the week based on performance scores
SELECT cron.schedule(
  'weekly-employee-of-week',
  '10 0 * * 1',
  $$
  SELECT select_employee_of_week(
    (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::DATE
  );
  $$
);
