-- Migration to implement a background queue for retrying failed question generations
-- This script creates a failed_generations table, a retry function using pg_net, and schedules a cron task.

-- 1. Create the table for tracking failed generations
CREATE TABLE IF NOT EXISTS public.failed_generations (
  day_key DATE PRIMARY KEY,
  attempts INTEGER DEFAULT 1,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'failed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.failed_generations ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "Full access to service role" 
  ON public.failed_generations TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read queue status
CREATE POLICY "Allow authenticated users to read failed_generations" 
  ON public.failed_generations FOR SELECT TO authenticated USING (true);

-- 2. Create the retry function
CREATE OR REPLACE FUNCTION public.retry_failed_generations()
RETURNS void AS $$
DECLARE
  r RECORD;
  net_response_id BIGINT;
BEGIN
  -- Select all failed generations with < 3 attempts and last_attempt older than 9 minutes
  FOR r IN 
    SELECT day_key, attempts 
    FROM public.failed_generations 
    WHERE status = 'failed' 
      AND attempts < 3 
      AND last_attempt < NOW() - INTERVAL '9 minutes'
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

-- 3. Schedule the cleanup cron (requires pg_cron extension)
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        cron.schedule('retry-failed-generations', '*/10 * * * *', 'SELECT public.retry_failed_generations()')
    ELSE 
        NULL 
    END;
