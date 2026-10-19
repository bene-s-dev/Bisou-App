-- Fix Grillanzünder (streak freeze) logic:
-- 1. Deduplicate month freeze count with COUNT(DISTINCT ...) so accidental duplicate records never block freezes.
-- 2. Guard against duplicate freeze_history & streak_history entries.
-- 3. Use FOR UPDATE row locking to prevent race conditions during concurrent RPC calls.
-- 4. Support bridging up to 2 missed days if monthly freeze allowance (max 2 per calendar month) permits.

CREATE OR REPLACE FUNCTION public.check_and_freeze_streak(p_today DATE)
RETURNS void AS $$
DECLARE
    r_streak RECORD;
    v_yesterday DATE;
    v_partner_id UUID;
    v_freeze_count INTEGER;
    v_missed_days INTEGER;
    v_d DATE;
    v_can_freeze BOOLEAN;
    v_new_history JSONB;
    v_new_freezes JSONB;
BEGIN
    v_yesterday := p_today - INTERVAL '1 day';

    -- Get partner ID of the current authenticated user
    SELECT partner_id INTO v_partner_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Find all streaks for the user and their partner that are currently inactive
    -- Use FOR UPDATE to prevent race conditions from concurrent calls
    FOR r_streak IN 
        SELECT * FROM public.streaks 
        WHERE (user_id = auth.uid() OR (v_partner_id IS NOT NULL AND user_id = v_partner_id))
          AND current_streak > 0 
          AND last_answer_date < v_yesterday
        FOR UPDATE
    LOOP
        v_missed_days := (v_yesterday - r_streak.last_answer_date);
        
        -- We can bridge missed days if within monthly freeze limit (max 2 freezes per calendar month)
        -- Support 1 or 2 missed consecutive days if enough freezes are available
        IF v_missed_days >= 1 AND v_missed_days <= 2 THEN
            v_can_freeze := TRUE;
            v_new_history := r_streak.streak_history;
            v_new_freezes := r_streak.freeze_history;
            
            -- Check each missed day
            FOR i IN 1..v_missed_days LOOP
                v_d := r_streak.last_answer_date + (i || ' day')::interval;
                
                -- Count unique freezes used in that calendar month
                SELECT COALESCE(count(DISTINCT f.date_str), 0) INTO v_freeze_count
                FROM jsonb_array_elements_text(v_new_freezes) AS f(date_str)
                WHERE date_trunc('month', f.date_str::date) = date_trunc('month', v_d::date);
                
                IF v_freeze_count < 2 THEN
                    IF NOT (v_new_history @> jsonb_build_array(v_d)) THEN
                        v_new_history := v_new_history || jsonb_build_array(v_d);
                    END IF;
                    IF NOT (v_new_freezes @> jsonb_build_array(v_d)) THEN
                        v_new_freezes := v_new_freezes || jsonb_build_array(v_d);
                    END IF;
                ELSE
                    v_can_freeze := FALSE;
                    EXIT;
                END IF;
            END LOOP;

            IF v_can_freeze THEN
                -- Apply freezes and update streak
                UPDATE public.streaks
                SET current_streak = current_streak + v_missed_days,
                    longest_streak = GREATEST(longest_streak, current_streak + v_missed_days),
                    last_answer_date = v_yesterday,
                    streak_history = v_new_history,
                    freeze_history = v_new_freezes
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
    v_missed_days INTEGER;
    v_d DATE;
    v_can_freeze BOOLEAN;
    v_new_history JSONB;
    v_new_freezes JSONB;
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
    WHERE user_id = NEW.user_id AND partner_id = curr_partner_id
    FOR UPDATE;
    
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
                streak_history = CASE 
                    WHEN streak_history @> jsonb_build_array(today) THEN streak_history
                    ELSE streak_history || jsonb_build_array(today)
                END
            WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
        ELSE
            -- Missed 1 or more days between last_d and today
            v_missed_days := (yesterday - last_d);

            IF v_missed_days >= 1 AND v_missed_days <= 2 THEN
                v_can_freeze := TRUE;
                v_new_history := s_history;
                v_new_freezes := s_freezes;

                FOR i IN 1..v_missed_days LOOP
                    v_d := last_d + (i || ' day')::interval;

                    SELECT COALESCE(count(DISTINCT f.date_str), 0) INTO v_freeze_count
                    FROM jsonb_array_elements_text(v_new_freezes) AS f(date_str)
                    WHERE date_trunc('month', f.date_str::date) = date_trunc('month', v_d::date);

                    IF v_freeze_count < 2 THEN
                        IF NOT (v_new_history @> jsonb_build_array(v_d)) THEN
                            v_new_history := v_new_history || jsonb_build_array(v_d);
                        END IF;
                        IF NOT (v_new_freezes @> jsonb_build_array(v_d)) THEN
                            v_new_freezes := v_new_freezes || jsonb_build_array(v_d);
                        END IF;
                    ELSE
                        v_can_freeze := FALSE;
                        EXIT;
                    END IF;
                END LOOP;

                IF v_can_freeze THEN
                    -- Apply freeze(s) and add today
                    IF NOT (v_new_history @> jsonb_build_array(today)) THEN
                        v_new_history := v_new_history || jsonb_build_array(today);
                    END IF;

                    UPDATE public.streaks
                    SET current_streak = current_s + v_missed_days + 1,
                        longest_streak = GREATEST(longest_streak, current_s + v_missed_days + 1),
                        last_answer_date = today,
                        streak_history = v_new_history,
                        freeze_history = v_new_freezes
                    WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;

                    RETURN NEW;
                END IF;
            END IF;

            -- Streak broken (no freezes left or missed > 2 days)
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
