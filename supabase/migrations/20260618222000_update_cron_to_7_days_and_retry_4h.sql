-- Migration to update the daily questions cron job to generate questions 7 days in advance
-- and update the retry cron logic to retry failed generations every 4 hours without an attempt cap.

-- 1. Unschedule the old 3 AM job
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.unschedule('generate-questions-at-3am')
    ELSE 
        NULL 
    END;

-- 2. Schedule the new 3 AM job targeting the next 7 days in advance (current_date + 1 to current_date + 7)
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.schedule(
          'generate-questions-at-3am',
          '0 1 * * *', -- 1 AM UTC = 3 AM CET/CEST depending on daylight saving
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

-- 3. Update the retry function to run every 4 hours and retry indefinitely (no attempts cap)
CREATE OR REPLACE FUNCTION public.retry_failed_generations()
RETURNS void AS $$
DECLARE
  r RECORD;
  net_response_id BIGINT;
BEGIN
  -- Select all failed generations where last_attempt was more than 4 hours ago.
  -- No limit on attempts is set so it retries every 4 hours until it succeeds.
  FOR r IN 
    SELECT day_key, attempts 
    FROM public.failed_generations 
    WHERE status = 'failed' 
      AND last_attempt < NOW() - INTERVAL '4 hours'
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
