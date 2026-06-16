-- Update the reset_today_answers function to strictly enforce resetting ONLY today's answer
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

    -- 1. Strictly enforce that day_key_param matches today's date string (YYYY-MM-DD)
    -- We use the database's current time in the project's timezone (assumed to be UTC or user local as per day_key convention)
    -- The day_key format in the app is YYYY-MM-DD in local time. 
    -- Since the DB might be in UTC, we compare with the provided param but the app usually sends the local date string.
    -- To be safest and match user expectation: we'll check if the param equals today's date string.
    v_today_key := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
    
    IF day_key_param != v_today_key THEN
        RAISE EXCEPTION 'Du kannst nur die Antworten des heutigen Tages (%) zurücksetzen.', v_today_key;
    END IF;

    -- 2. Enforce the 7-day cooldown
    SELECT last_answer_reset_at INTO v_last_reset
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_last_reset IS NOT NULL AND v_last_reset > NOW() - INTERVAL '7 days' THEN
        v_remaining_interval := (v_last_reset + INTERVAL '7 days') - NOW();
        
        IF EXTRACT(DAY FROM v_remaining_interval) >= 1 THEN
            v_time_string := FLOOR(EXTRACT(DAY FROM v_remaining_interval))::text || ' Tagen';
        ELSIF EXTRACT(HOUR FROM v_remaining_interval) >= 1 THEN
            v_time_string := FLOOR(EXTRACT(HOUR FROM v_remaining_interval))::text || ' Stunden';
        ELSE
            v_time_string := GREATEST(1, FLOOR(EXTRACT(MINUTE FROM v_remaining_interval)))::text || ' Minuten';
        END IF;

        RAISE EXCEPTION 'Du kannst deine Antworten nur einmal alle 7 Tage zurücksetzen. Nächster Neustart möglich in %.', v_time_string;
    END IF;

    -- 3. Delete ONLY the user's answers for TODAY
    DELETE FROM public.answers
    WHERE user_id = v_user_id AND day_key = day_key_param;

    -- 4. Update the profiles table with the new reset timestamp
    UPDATE public.profiles
    SET last_answer_reset_at = NOW()
    WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
