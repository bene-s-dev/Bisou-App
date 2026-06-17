-- Migration to fix parameter type mismatch in reset_today_answers: day_key in answers is DATE, day_key_param is TEXT
-- We add the explicit ::date cast back to prevent database execution errors.

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

    -- 3. Delete ONLY the user's answers for TODAY (casting parameter to date to avoid mismatch)
    DELETE FROM public.answers
    WHERE user_id = v_user_id AND day_key = day_key_param::date;

    -- 4. Update the profiles table with the new reset timestamp
    UPDATE public.profiles
    SET last_answer_reset_at = NOW()
    WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_today_answers(text) TO authenticated;
