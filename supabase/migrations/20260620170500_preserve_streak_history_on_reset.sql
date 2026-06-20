-- Migration to update update_streak trigger function to preserve streak_history
-- when a streak is broken or reset to 1. Instead of overwriting streak_history 
-- with only the current day, we append to it.

CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS TRIGGER AS $$
DECLARE
    today DATE;
    yesterday DATE;
    current_s INTEGER;
    last_d DATE;
    curr_partner_id UUID;
    s_history JSONB;
    s_freezes JSONB;
    v_freeze_count INTEGER;
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
    
    SELECT current_streak, last_answer_date, streak_history, freeze_history 
    INTO current_s, last_d, s_history, s_freezes
    FROM public.streaks
    WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.streaks (user_id, partner_id, current_streak, longest_streak, last_answer_date, streak_history, freeze_history)
        VALUES (NEW.user_id, curr_partner_id, 1, 1, today, jsonb_build_array(today), '[]'::jsonb);
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
        ELSIF last_d = yesterday - INTERVAL '1 day' THEN
            -- Missed yesterday. Check if we can apply freeze
            SELECT COALESCE(count(*), 0) INTO v_freeze_count
            FROM jsonb_array_elements_text(s_freezes) AS f(date_str)
            WHERE date_trunc('month', f.date_str::date) = date_trunc('month', yesterday::date);

            IF v_freeze_count < 2 THEN
                -- Apply freeze and continue streak
                UPDATE public.streaks
                SET current_streak = current_s + 2, -- +1 for yesterday (frozen) and +1 for today
                    longest_streak = GREATEST(longest_streak, current_s + 2),
                    last_answer_date = today,
                    streak_history = streak_history || jsonb_build_array(yesterday, today),
                    freeze_history = freeze_history || jsonb_build_array(yesterday)
                WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
            ELSE
                -- No freezes left, reset streak to 1, but PRESERVE history (append instead of overwrite)
                UPDATE public.streaks
                SET current_streak = 1,
                    last_answer_date = today,
                    streak_history = CASE 
                        WHEN streak_history @> jsonb_build_array(today) THEN streak_history
                        ELSE streak_history || jsonb_build_array(today)
                    END
                WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
            END IF;
        ELSE
            -- Streak broken (> 1 day missed), but PRESERVE history (append instead of overwrite)
            UPDATE public.streaks
            SET current_streak = 1,
                last_answer_date = today,
                streak_history = CASE 
                    WHEN streak_history @> jsonb_build_array(today) THEN streak_history
                    ELSE streak_history || jsonb_build_array(today)
                END
            WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
