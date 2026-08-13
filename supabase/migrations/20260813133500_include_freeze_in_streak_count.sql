-- Migration to make check_and_freeze_streak increment current_streak and update longest_streak
-- when a Grillanzünder (streak freeze) is applied.

CREATE OR REPLACE FUNCTION public.check_and_freeze_streak(p_today DATE)
RETURNS void AS $$
DECLARE
    r_streak RECORD;
    v_yesterday DATE;
    v_partner_id UUID;
    v_freeze_count INTEGER;
BEGIN
    v_yesterday := p_today - INTERVAL '1 day';

    -- Get partner ID of the current authenticated user
    SELECT partner_id INTO v_partner_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Find all streaks for the user and their partner that are currently inactive
    FOR r_streak IN 
        SELECT * FROM public.streaks 
        WHERE (user_id = auth.uid() OR (v_partner_id IS NOT NULL AND user_id = v_partner_id))
          AND current_streak > 0 
          AND last_answer_date < v_yesterday
    LOOP
        -- Check if it was missed by exactly 1 day (i.e. last_answer_date is the day before yesterday)
        IF r_streak.last_answer_date = v_yesterday - INTERVAL '1 day' THEN
            -- Count freezes used in yesterday's calendar month
            SELECT COALESCE(count(*), 0) INTO v_freeze_count
            FROM jsonb_array_elements_text(r_streak.freeze_history) AS f(date_str)
            WHERE date_trunc('month', f.date_str::date) = date_trunc('month', v_yesterday::date);

            IF v_freeze_count < 2 THEN
                -- Apply freeze for yesterday and count it in current_streak & longest_streak
                UPDATE public.streaks
                SET current_streak = current_streak + 1,
                    longest_streak = GREATEST(longest_streak, current_streak + 1),
                    last_answer_date = v_yesterday,
                    streak_history = streak_history || jsonb_build_array(v_yesterday),
                    freeze_history = freeze_history || jsonb_build_array(v_yesterday)
                WHERE id = r_streak.id;
                
                CONTINUE;
            END IF;
        END IF;

        -- If not frozen, reset to 0
        UPDATE public.streaks
        SET current_streak = 0
        WHERE id = r_streak.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
