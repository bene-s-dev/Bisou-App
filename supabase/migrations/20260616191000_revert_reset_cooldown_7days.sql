-- Update the reset_today_answers function to enforce a 7-day cooldown
CREATE OR REPLACE FUNCTION public.reset_today_answers(day_key_param text)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_last_reset timestamp with time zone;
    v_remaining_interval interval;
    v_time_string text;
    v_today_key text;
BEGIN
    -- Get the authenticated user's ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert';
    END IF;

    -- Ensure we only reset "today's" answers (or the specific day provided, usually today)
    -- In this app's context, day_key is usually getLocalDateString(new Date())
    -- We'll just enforce the cooldown based on the last time ANY reset was performed.

    -- Check the last reset time from the profiles table
    SELECT last_answer_reset_at INTO v_last_reset
    FROM public.profiles
    WHERE id = v_user_id;

    -- Enforce the 7-day limit (7 days)
    IF v_last_reset IS NOT NULL AND v_last_reset > NOW() - INTERVAL '7 days' THEN
        v_remaining_interval := (v_last_reset + INTERVAL '7 days') - NOW();
        
        -- Build a user-friendly time string
        IF EXTRACT(DAY FROM v_remaining_interval) >= 1 THEN
            v_time_string := FLOOR(EXTRACT(DAY FROM v_remaining_interval))::text || ' Tagen';
        ELSIF EXTRACT(HOUR FROM v_remaining_interval) >= 1 THEN
            v_time_string := FLOOR(EXTRACT(HOUR FROM v_remaining_interval))::text || ' Stunden';
        ELSE
            v_time_string := GREATEST(1, FLOOR(EXTRACT(MINUTE FROM v_remaining_interval)))::text || ' Minuten';
        END IF;

        RAISE EXCEPTION 'Du kannst deine Antworten nur einmal alle 7 Tage zurücksetzen. Nächster Neustart möglich in %.', v_time_string;
    END IF;

    -- Delete the user's answers for the given day key
    DELETE FROM public.answers
    WHERE user_id = v_user_id AND day_key = day_key_param;

    -- Update the profiles table with the new reset timestamp
    UPDATE public.profiles
    SET last_answer_reset_at = NOW()
    WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
