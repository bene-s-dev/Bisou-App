-- Migration to update daily question generation to generate days individually
-- and schedule the cron job to target exactly current_date + 7.

-- 1. Unschedule old jobs if they exist safely
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
              AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-questions-at-3am')
    THEN 
        cron.unschedule('generate-questions-at-3am')
    ELSE 
        NULL 
    END;

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
              AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-questions-at-12pm')
    THEN 
        cron.unschedule('generate-questions-at-12pm')
    ELSE 
        NULL 
    END;

-- 2. Schedule the new 12 PM (noon) job targeting exactly the 7th day in advance (current_date + 7)
-- 10:00 AM UTC corresponds to 12:00 PM (noon) in CEST (UTC+2)
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.schedule(
          'generate-questions-at-12pm',
          '0 10 * * *', -- 10 AM UTC = 12 PM local time (CEST)
          $$
          SELECT
            net.http_post(
              url:='https://odsghowxbgqnfsyjstcb.supabase.co/functions/v1/generate-questions',
              headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc2dob3d4YmdxbmZzeWpzdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1MTMsImV4cCI6MjA5NDQ0NTUxM30.-3ns3ckkDcBClXix43lek-TKehfv_THqYsqkvGUf1HU"}'::jsonb,
              body:=jsonb_build_object('day_key', (current_date + 7)::text)
            ) as request_id;
          $$
        )
    ELSE 
        NULL 
    END;
