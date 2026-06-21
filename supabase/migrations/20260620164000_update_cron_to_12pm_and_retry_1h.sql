-- Migration to update the daily questions cron job to run at 12 PM (noon) CET/CEST,
-- and update the retry cron logic to retry failed generations every 60 minutes.
-- Retries 5 times with Gemini (attempts 1 to 5), then switches to Gemma and retries 5 times (attempts 6 to 10).
-- If all 10 attempts fail, it stops retrying.

-- 1. Unschedule the old 3 AM job
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
              AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-questions-at-3am')
    THEN 
        cron.unschedule('generate-questions-at-3am')
    ELSE 
        NULL 
    END;

-- Also unschedule generate-questions-at-12pm if it already exists to avoid duplicate key violations
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
              AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-questions-at-12pm')
    THEN 
        cron.unschedule('generate-questions-at-12pm')
    ELSE 
        NULL 
    END;

-- 2. Schedule the new 12 PM (noon) job targeting the next 7 days in advance (current_date + 1 to current_date + 7)
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
              body:=jsonb_build_object('day_key', (current_date + d)::text)
            ) as request_id
          FROM generate_series(1, 7) as d;
          $$
        )
    ELSE 
        NULL 
    END;

-- 3. Update the retry function to run up to 10 times total (attempts <= 9) and wait 1 hour between retries
CREATE OR REPLACE FUNCTION public.retry_failed_generations()
RETURNS void AS $$
DECLARE
  r RECORD;
  net_response_id BIGINT;
BEGIN
  -- Select failed generations with attempts <= 9 and last_attempt older than 1 hour.
  -- Attempts 1-5 use Gemini. Attempt 6-10 (when attempts >= 5) use Gemma.
  -- After 10 attempts (once attempts = 10), it stops retrying.
  FOR r IN 
    SELECT day_key, attempts 
    FROM public.failed_generations 
    WHERE status = 'failed' 
      AND attempts <= 9
      AND last_attempt < NOW() - INTERVAL '1 hour'
  LOOP
    -- Update attempt status before firing request
    UPDATE public.failed_generations
    SET attempts = attempts + 1,
        last_attempt = NOW()
    WHERE day_key = r.day_key;

    -- Fire asynchronous HTTP POST request using pg_net
    SELECT net.http_post(
      url := 'https://odsghowxbgqnfsyjstcb.supabase.co/functions/v1/generate-questions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc2dob3d4YmdxbmZzeWpzdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1MTMsImV4cCI6MjA5NDQ0NTUxM30.-3ns3ckkDcBClXix43lek-TKehfv_THqYsqkvGUf1HU',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc2dob3d4YmdxbmZzeWpzdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1MTMsImV4cCI6MjA5NDQ0NTUxM30.-3ns3ckkDcBClXix43lek-TKehfv_THqYsqkvGUf1HU'
      ),
      body := jsonb_build_object('day_key', r.day_key::text)
    ) INTO net_response_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
