-- Migration to update the 3 AM cron job to pre-generate questions 1 day in advance (for tomorrow)
-- and unschedule the legacy 3-question generator job.

-- 1. Unschedule the old 3 AM job
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.unschedule('generate-questions-at-3am')
    ELSE 
        NULL 
    END;

-- 2. Schedule the new 3 AM job targeting tomorrow (current_date + 1)
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.schedule(
          'generate-questions-at-3am',
          '0 1 * * *', -- 1 AM UTC = 3 AM CET/CEST depending on daylight saving
          $$
          select
            net.http_post(
              url:='https://odsghowxbgqnfsyjstcb.supabase.co/functions/v1/generate-questions',
              headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc2dob3d4YmdxbmZzeWpzdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1MTMsImV4cCI6MjA5NDQ0NTUxM30.-3ns3ckkDcBClXix43lek-TKehfv_THqYsqkvGUf1HU"}'::jsonb,
              body:=concat('{"day_key": "', current_date + 1, '"}')::jsonb
            ) as request_id;
          $$
        )
    ELSE 
        NULL 
    END;

-- 3. Unschedule the legacy 3-question job (taeglicher-fragen-job) to prevent incomplete layouts
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.unschedule('taeglicher-fragen-job')
    ELSE 
        NULL 
    END;
