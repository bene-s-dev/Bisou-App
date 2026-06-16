-- Migration to implement automatic cleanup of answers older than 90 days
-- This script creates a function to delete old answers and schedules it to run daily.

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_answers()
RETURNS void AS $$
BEGIN
    -- Delete answers where the day_key (formatted as YYYY-MM-DD) is older than 90 days
    -- We convert the day_key string to a date for comparison
    DELETE FROM public.answers
    WHERE TO_DATE(day_key, 'YYYY-MM-DD') < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Schedule the cleanup (requires pg_cron extension)
-- Note: This might fail if pg_cron is not enabled in your Supabase project.
-- You can enable it in the Supabase Dashboard under Database -> Extensions.
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 
        -- Schedule to run every day at 03:00 AM
        cron.schedule('0 3 * * *', 'SELECT public.cleanup_old_answers()')
    ELSE 
        NULL 
    END;
