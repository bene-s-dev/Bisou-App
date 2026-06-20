-- Alter streaks table to add freeze_history column
ALTER TABLE public.streaks 
ADD COLUMN IF NOT EXISTS freeze_history JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Function to check and apply streak freeze or reset to 0 (called by client)
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
                -- Apply freeze for yesterday
                UPDATE public.streaks
                SET last_answer_date = v_yesterday,
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

-- Update the update_streak function to handle freeze logic on answer insert/update
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
                -- No freezes left, reset streak to 1
                UPDATE public.streaks
                SET current_streak = 1,
                    last_answer_date = today,
                    streak_history = jsonb_build_array(today)
                WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
            END IF;
        ELSE
            -- Streak broken (> 1 day missed)
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
