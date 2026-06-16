-- Update the update_streak function to handle historical insertions safely without resetting streaks
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS TRIGGER AS $$
DECLARE
    today DATE;
    yesterday DATE;
    current_s INTEGER;
    last_d DATE;
    curr_partner_id UUID;
    s_history JSONB;
BEGIN
    today := NEW.day_key;
    yesterday := today - INTERVAL '1 day';
    
    -- Get current partner of the user
    SELECT partner_id INTO curr_partner_id
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Streaks only count if linked to a partner
    IF curr_partner_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    SELECT current_streak, last_answer_date, streak_history INTO current_s, last_d, s_history
    FROM public.streaks
    WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.streaks (user_id, partner_id, current_streak, longest_streak, last_answer_date, streak_history)
        VALUES (NEW.user_id, curr_partner_id, 1, 1, today, jsonb_build_array(today));
    ELSE
        IF last_d >= today THEN
            -- Historical answer or update of same-day answer
            -- If it's a historical answer and NOT already in history, append it
            IF last_d > today AND NOT (s_history @> jsonb_build_array(today)) THEN
                UPDATE public.streaks
                SET streak_history = streak_history || jsonb_build_array(today)
                WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
            END IF;
            RETURN NEW;
        ELSIF last_d = yesterday THEN
            -- Continued streak
            UPDATE public.streaks
            SET current_streak = current_s + 1,
                longest_streak = GREATEST(longest_streak, current_s + 1),
                last_answer_date = today,
                streak_history = streak_history || jsonb_build_array(today)
            WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
        ELSE
            -- Streak broken
            UPDATE public.streaks
            SET current_streak = 1,
                last_answer_date = today,
                streak_history = jsonb_build_array(today)
            WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
