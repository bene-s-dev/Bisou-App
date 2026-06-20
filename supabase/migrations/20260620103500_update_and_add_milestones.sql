-- 1. Add extra holiday columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS answered_christmas BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS answered_halloween BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS answered_labor_day BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS answered_unity_day BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS answered_anniversary BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS answered_leap_day BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Redefine increment_total_answers trigger function
CREATE OR REPLACE FUNCTION public.increment_total_answers()
RETURNS TRIGGER AS $$
DECLARE
    v_local_hour INTEGER;
    v_local_minute INTEGER;
    v_partner_id UUID;
    v_partner_answer RECORD;
    v_matches INTEGER;
    
    -- Split choice elements
    v_parts_new text[];
    v_parts_partner text[];
    v_text_new text := '';
    v_text_partner text := '';
    v_ranking_new text := '';
    v_ranking_partner text := '';
    v_tot_new text := '';
    v_tot_partner text := '';
    v_wwe_new text := '';
    v_wwe_partner text := '';
    v_sim numeric;
    
    v_time_diff integer;
    v_partner_since TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Increment total_answers
    UPDATE public.profiles
    SET total_answers = COALESCE(total_answers, 0) + 1
    WHERE id = NEW.user_id;

    -- 2. Local Time check (Europe/Berlin)
    v_local_hour := EXTRACT(HOUR FROM (NEW.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
    v_local_minute := EXTRACT(MINUTE FROM (NEW.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
    
    -- Morning/Night answers habit
    IF v_local_hour >= 5 AND v_local_hour < 7 THEN
        UPDATE public.profiles
        SET morning_answers_count = COALESCE(morning_answers_count, 0) + 1
        WHERE id = NEW.user_id;
    ELSIF v_local_hour >= 23 OR v_local_hour < 4 THEN
        UPDATE public.profiles
        SET night_answers_count = COALESCE(night_answers_count, 0) + 1
        WHERE id = NEW.user_id;
    END IF;

    -- Lunch time answers (12:00 - 13:30)
    IF v_local_hour = 12 OR (v_local_hour = 13 AND v_local_minute <= 30) THEN
        UPDATE public.profiles
        SET lunch_answers_count = COALESCE(lunch_answers_count, 0) + 1
        WHERE id = NEW.user_id;
    END IF;

    -- Last minute answers (23:45 - 23:59)
    IF v_local_hour = 23 AND v_local_minute >= 45 THEN
        UPDATE public.profiles
        SET last_minute_answers_count = COALESCE(last_minute_answers_count, 0) + 1
        WHERE id = NEW.user_id;
    END IF;

    -- 3. Communication Depth (character length of free-text answer)
    v_parts_new := regexp_split_to_array(split_part(NEW.choice, ' [', 1), '\s*\|\s*');
    IF array_length(v_parts_new, 1) >= 3 THEN
        v_text_new := trim(v_parts_new[3]);
        IF char_length(v_text_new) > 150 THEN
            UPDATE public.profiles
            SET long_answers_count = COALESCE(long_answers_count, 0) + 1
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    -- 4. Special calendar days (based on day_key)
    -- Valentine's Day (14. Feb)
    IF EXTRACT(MONTH FROM NEW.day_key) = 2 AND EXTRACT(DAY FROM NEW.day_key) = 14 THEN
        UPDATE public.profiles
        SET answered_valentines = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- New Year's Day (1. Jan)
    IF EXTRACT(MONTH FROM NEW.day_key) = 1 AND EXTRACT(DAY FROM NEW.day_key) = 1 THEN
        UPDATE public.profiles
        SET answered_new_years = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- Christmas (24., 25., 26. Dec)
    IF EXTRACT(MONTH FROM NEW.day_key) = 12 AND EXTRACT(DAY FROM NEW.day_key) IN (24, 25, 26) THEN
        UPDATE public.profiles
        SET answered_christmas = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- Halloween (31. Oct)
    IF EXTRACT(MONTH FROM NEW.day_key) = 10 AND EXTRACT(DAY FROM NEW.day_key) = 31 THEN
        UPDATE public.profiles
        SET answered_halloween = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- Tag der Arbeit (1. May)
    IF EXTRACT(MONTH FROM NEW.day_key) = 5 AND EXTRACT(DAY FROM NEW.day_key) = 1 THEN
        UPDATE public.profiles
        SET answered_labor_day = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- Tag der Deutschen Einheit (3. Oct)
    IF EXTRACT(MONTH FROM NEW.day_key) = 10 AND EXTRACT(DAY FROM NEW.day_key) = 3 THEN
        UPDATE public.profiles
        SET answered_unity_day = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- Leap Day (29. Feb)
    IF EXTRACT(MONTH FROM NEW.day_key) = 2 AND EXTRACT(DAY FROM NEW.day_key) = 29 THEN
        UPDATE public.profiles
        SET answered_leap_day = TRUE
        WHERE id = NEW.user_id;
    END IF;
    -- Anniversary check
    SELECT partner_since INTO v_partner_since FROM public.profiles WHERE id = NEW.user_id;
    IF v_partner_since IS NOT NULL THEN
        IF EXTRACT(MONTH FROM NEW.day_key) = EXTRACT(MONTH FROM v_partner_since) AND 
           EXTRACT(DAY FROM NEW.day_key) = EXTRACT(DAY FROM v_partner_since) THEN
            UPDATE public.profiles
            SET answered_anniversary = TRUE
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    -- 5. Partner Interactions (matches, time sync, perfect matches)
    SELECT partner_id INTO v_partner_id
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF v_partner_id IS NOT NULL THEN
        SELECT * INTO v_partner_answer
        FROM public.answers
        WHERE user_id = v_partner_id AND day_key = NEW.day_key;

        IF FOUND THEN
            -- Matches calculation
            v_matches := public.calculate_choice_matches(NEW.choice, v_partner_answer.choice);
            IF v_matches > 0 THEN
                UPDATE public.profiles
                SET total_matches = COALESCE(total_matches, 0) + v_matches
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;

            -- Time Sync calculations
            v_time_diff := ABS(EXTRACT(EPOCH FROM (NEW.created_at - v_partner_answer.created_at)))::integer;
            -- 5 minutes synchrony
            IF v_time_diff <= 300 THEN
                UPDATE public.profiles
                SET time_sync_5min_count = COALESCE(time_sync_5min_count, 0) + 1
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;
            -- 1 minute synchrony
            IF v_time_diff <= 60 THEN
                UPDATE public.profiles
                SET time_sync_1min_count = COALESCE(time_sync_1min_count, 0) + 1
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;

            -- Parse partner choice elements
            v_parts_partner := regexp_split_to_array(split_part(v_partner_answer.choice, ' [', 1), '\s*\|\s*');
            
            -- Extract text parts for both-long-answers check
            IF array_length(v_parts_partner, 1) >= 3 THEN
                v_text_partner := trim(v_parts_partner[3]);
            END IF;

            IF char_length(v_text_new) > 200 AND char_length(v_text_partner) > 200 THEN
                UPDATE public.profiles
                SET both_long_answers_count = COALESCE(both_long_answers_count, 0) + 1
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;

            -- Extract rankings for perfect ranking check
            IF array_length(v_parts_new, 1) >= 2 THEN v_ranking_new := trim(v_parts_new[2]); END IF;
            IF array_length(v_parts_partner, 1) >= 2 THEN v_ranking_partner := trim(v_parts_partner[2]); END IF;

            IF v_ranking_new <> '' AND v_ranking_partner <> '' THEN
                v_sim := public.calculate_ranking_similarity(v_ranking_new, v_ranking_partner);
                IF v_sim = 100.0 THEN
                    UPDATE public.profiles
                    SET perfect_rankings_count = COALESCE(perfect_rankings_count, 0) + 1
                    WHERE id IN (NEW.user_id, v_partner_id);
                END IF;
            END IF;

            -- Parse Dies-oder-Das (tot) for new and partner
            IF array_length(v_parts_new, 1) >= 1 THEN v_tot_new := trim(v_parts_new[1]); END IF;
            IF array_length(v_parts_partner, 1) >= 1 THEN v_tot_partner := trim(v_parts_partner[1]); END IF;

            -- Gedanken-Zwillinge: check if Dies-oder-Das matches
            IF v_tot_new = v_tot_partner AND v_tot_new <> '' THEN
                UPDATE public.profiles
                SET perfect_tot_days_count = COALESCE(perfect_tot_days_count, 0) + 1
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;

            -- Perfect match days check (all choice questions match)
            IF array_length(v_parts_new, 1) >= 4 THEN v_wwe_new := trim(v_parts_new[4]); END IF;
            IF array_length(v_parts_partner, 1) >= 4 THEN v_wwe_partner := trim(v_parts_partner[4]); END IF;

            IF (v_tot_new = v_tot_partner AND v_tot_new <> '') AND 
               (v_wwe_new <> v_wwe_partner AND v_wwe_new <> '') AND
               (v_ranking_new <> '' AND v_ranking_partner <> '' AND v_sim >= 95.0) THEN
                UPDATE public.profiles
                SET perfect_match_days_count = COALESCE(perfect_match_days_count, 0) + 1
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine decrement_total_answers trigger function
CREATE OR REPLACE FUNCTION public.decrement_total_answers()
RETURNS TRIGGER AS $$
DECLARE
    v_local_hour INTEGER;
    v_local_minute INTEGER;
    v_partner_id UUID;
    v_partner_answer RECORD;
    v_matches INTEGER;
    
    v_parts_old text[];
    v_parts_partner text[];
    v_text_old text := '';
    v_text_partner text := '';
    v_ranking_old text := '';
    v_ranking_partner text := '';
    v_tot_old text := '';
    v_tot_partner text := '';
    v_wwe_old text := '';
    v_wwe_partner text := '';
    v_sim numeric;
    
    v_time_diff integer;
    v_partner_since TIMESTAMP WITH TIME ZONE;
BEGIN
    IF OLD.day_key >= CURRENT_DATE - INTERVAL '2 days' THEN
        -- 1. Decrement total_answers
        UPDATE public.profiles
        SET total_answers = GREATEST(0, COALESCE(total_answers, 0) - 1)
        WHERE id = OLD.user_id;

        -- 2. Local Time check (Europe/Berlin)
        v_local_hour := EXTRACT(HOUR FROM (OLD.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
        v_local_minute := EXTRACT(MINUTE FROM (OLD.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
        
        -- Habits
        IF v_local_hour >= 5 AND v_local_hour < 7 THEN
            UPDATE public.profiles
            SET morning_answers_count = GREATEST(0, COALESCE(morning_answers_count, 0) - 1)
            WHERE id = OLD.user_id;
        ELSIF v_local_hour >= 23 OR v_local_hour < 4 THEN
            UPDATE public.profiles
            SET night_answers_count = GREATEST(0, COALESCE(night_answers_count, 0) - 1)
            WHERE id = OLD.user_id;
        END IF;

        -- Lunch time answers
        IF v_local_hour = 12 OR (v_local_hour = 13 AND v_local_minute <= 30) THEN
            UPDATE public.profiles
            SET lunch_answers_count = GREATEST(0, COALESCE(lunch_answers_count, 0) - 1)
            WHERE id = OLD.user_id;
        END IF;

        -- Last minute answers
        IF v_local_hour = 23 AND v_local_minute >= 45 THEN
            UPDATE public.profiles
            SET last_minute_answers_count = GREATEST(0, COALESCE(last_minute_answers_count, 0) - 1)
            WHERE id = OLD.user_id;
        END IF;

        -- 3. Communication Depth
        v_parts_old := regexp_split_to_array(split_part(OLD.choice, ' [', 1), '\s*\|\s*');
        IF array_length(v_parts_old, 1) >= 3 THEN
            v_text_old := trim(v_parts_old[3]);
            IF char_length(v_text_old) > 150 THEN
                UPDATE public.profiles
                SET long_answers_count = GREATEST(0, COALESCE(long_answers_count, 0) - 1)
                WHERE id = OLD.user_id;
            END IF;
        END IF;

        -- 4. Special calendar days
        IF EXTRACT(MONTH FROM OLD.day_key) = 2 AND EXTRACT(DAY FROM OLD.day_key) = 14 THEN
            UPDATE public.profiles
            SET answered_valentines = FALSE
            WHERE id = OLD.user_id;
        END IF;
        IF EXTRACT(MONTH FROM OLD.day_key) = 1 AND EXTRACT(DAY FROM OLD.day_key) = 1 THEN
            UPDATE public.profiles
            SET answered_new_years = FALSE
            WHERE id = OLD.user_id;
        END IF;
        IF EXTRACT(MONTH FROM OLD.day_key) = 12 AND EXTRACT(DAY FROM OLD.day_key) IN (24, 25, 26) THEN
            UPDATE public.profiles
            SET answered_christmas = FALSE
            WHERE id = OLD.user_id;
        END IF;
        IF EXTRACT(MONTH FROM OLD.day_key) = 10 AND EXTRACT(DAY FROM OLD.day_key) = 31 THEN
            UPDATE public.profiles
            SET answered_halloween = FALSE
            WHERE id = OLD.user_id;
        END IF;
        IF EXTRACT(MONTH FROM OLD.day_key) = 5 AND EXTRACT(DAY FROM OLD.day_key) = 1 THEN
            UPDATE public.profiles
            SET answered_labor_day = FALSE
            WHERE id = OLD.user_id;
        END IF;
        IF EXTRACT(MONTH FROM OLD.day_key) = 10 AND EXTRACT(DAY FROM OLD.day_key) = 3 THEN
            UPDATE public.profiles
            SET answered_unity_day = FALSE
            WHERE id = OLD.user_id;
        END IF;
        IF EXTRACT(MONTH FROM OLD.day_key) = 2 AND EXTRACT(DAY FROM OLD.day_key) = 29 THEN
            UPDATE public.profiles
            SET answered_leap_day = FALSE
            WHERE id = OLD.user_id;
        END IF;
        
        -- Anniversary check
        SELECT partner_since INTO v_partner_since FROM public.profiles WHERE id = OLD.user_id;
        IF v_partner_since IS NOT NULL THEN
            IF EXTRACT(MONTH FROM OLD.day_key) = EXTRACT(MONTH FROM v_partner_since) AND 
               EXTRACT(DAY FROM OLD.day_key) = EXTRACT(DAY FROM v_partner_since) THEN
                UPDATE public.profiles
                SET answered_anniversary = FALSE
                WHERE id = OLD.user_id;
            END IF;
        END IF;

        -- 5. Partner Interactions
        SELECT partner_id INTO v_partner_id
        FROM public.profiles
        WHERE id = OLD.user_id;

        IF v_partner_id IS NOT NULL THEN
            SELECT * INTO v_partner_answer
            FROM public.answers
            WHERE user_id = v_partner_id AND day_key = OLD.day_key;

            IF FOUND THEN
                -- Matches decrement
                v_matches := public.calculate_choice_matches(OLD.choice, v_partner_answer.choice);
                IF v_matches > 0 THEN
                    UPDATE public.profiles
                    SET total_matches = GREATEST(0, COALESCE(total_matches, 0) - v_matches)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;

                -- Time Sync decrement
                v_time_diff := ABS(EXTRACT(EPOCH FROM (OLD.created_at - v_partner_answer.created_at)))::integer;
                IF v_time_diff <= 300 THEN
                    UPDATE public.profiles
                    SET time_sync_5min_count = GREATEST(0, COALESCE(time_sync_5min_count, 0) - 1)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;
                IF v_time_diff <= 60 THEN
                    UPDATE public.profiles
                    SET time_sync_1min_count = GREATEST(0, COALESCE(time_sync_1min_count, 0) - 1)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;

                -- Parse partner choice elements
                v_parts_partner := regexp_split_to_array(split_part(v_partner_answer.choice, ' [', 1), '\s*\|\s*');
                IF array_length(v_parts_partner, 1) >= 3 THEN
                    v_text_partner := trim(v_parts_partner[3]);
                END IF;

                IF char_length(v_text_old) > 200 AND char_length(v_text_partner) > 200 THEN
                    UPDATE public.profiles
                    SET both_long_answers_count = GREATEST(0, COALESCE(both_long_answers_count, 0) - 1)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;

                -- Perfect ranking decrement
                IF array_length(v_parts_old, 1) >= 2 THEN v_ranking_old := trim(v_parts_old[2]); END IF;
                IF array_length(v_parts_partner, 1) >= 2 THEN v_ranking_partner := trim(v_parts_partner[2]); END IF;

                IF v_ranking_old <> '' AND v_ranking_partner <> '' THEN
                    v_sim := public.calculate_ranking_similarity(v_ranking_old, v_ranking_partner);
                    IF v_sim = 100.0 THEN
                        UPDATE public.profiles
                        SET perfect_rankings_count = GREATEST(0, COALESCE(perfect_rankings_count, 0) - 1)
                        WHERE id IN (OLD.user_id, v_partner_id);
                    END IF;
                END IF;

                -- Parse Dies-oder-Das (tot) for new and partner
                IF array_length(v_parts_old, 1) >= 1 THEN v_tot_old := trim(v_parts_old[1]); END IF;
                IF array_length(v_parts_partner, 1) >= 1 THEN v_tot_partner := trim(v_parts_partner[1]); END IF;

                -- Gedanken-Zwillinge: decrement if Dies-oder-Das matches
                IF v_tot_old = v_tot_partner AND v_tot_old <> '' THEN
                    UPDATE public.profiles
                    SET perfect_tot_days_count = GREATEST(0, COALESCE(perfect_tot_days_count, 0) - 1)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;

                -- Perfect match days decrement
                IF array_length(v_parts_old, 1) >= 4 THEN v_wwe_old := trim(v_parts_old[4]); END IF;
                IF array_length(v_parts_partner, 1) >= 4 THEN v_wwe_partner := trim(v_parts_partner[4]); END IF;

                IF (v_tot_old = v_tot_partner AND v_tot_old <> '') AND 
                   (v_wwe_old <> v_wwe_partner AND v_wwe_old <> '') AND
                   (v_ranking_old <> '' AND v_ranking_partner <> '' AND v_sim >= 95.0) THEN
                    UPDATE public.profiles
                    SET perfect_match_days_count = GREATEST(0, COALESCE(perfect_match_days_count, 0) - 1)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;

            END IF;
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Redefine check_and_unlock_milestones with perfect_tot_days_count and holiday columns
CREATE OR REPLACE FUNCTION public.check_and_unlock_milestones(user_id_param UUID)
RETURNS void AS $$
DECLARE
    v_answers_count INTEGER;
    v_longest_streak INTEGER;
    v_days_connected INTEGER;
    
    v_total_matches INTEGER;
    v_nudges_sent INTEGER;
    v_morning_answers INTEGER;
    v_night_answers INTEGER;
    v_journal_views INTEGER;
    v_streaks_rebuilt INTEGER;
    v_avatar_changes INTEGER;
    
    -- Extra metrics
    v_time_sync_5min INTEGER;
    v_time_sync_1min INTEGER;
    v_lunch_answers INTEGER;
    v_last_minute_answers INTEGER;
    v_long_answers INTEGER;
    v_both_long_answers INTEGER;
    v_perfect_rankings INTEGER;
    v_perfect_match_days INTEGER;
    v_perfect_tot_days INTEGER;
    
    -- Holidays
    v_answered_valentines BOOLEAN;
    v_answered_new_years BOOLEAN;
    v_answered_christmas BOOLEAN;
    v_answered_halloween BOOLEAN;
    v_answered_labor_day BOOLEAN;
    v_answered_unity_day BOOLEAN;
    v_answered_anniversary BOOLEAN;
    v_answered_leap_day BOOLEAN;
    
    r_milestone RECORD;
BEGIN
    SELECT 
        COALESCE(total_answers, 0),
        COALESCE(total_matches, 0),
        COALESCE(nudges_sent, 0),
        COALESCE(morning_answers_count, 0),
        COALESCE(night_answers_count, 0),
        COALESCE(journal_views, 0),
        COALESCE(streaks_rebuilt, 0),
        COALESCE(avatar_change_count, 0),
        COALESCE(EXTRACT(DAY FROM (NOW() - partner_since)), 0)::integer,
        
        COALESCE(time_sync_5min_count, 0),
        COALESCE(time_sync_1min_count, 0),
        COALESCE(lunch_answers_count, 0),
        COALESCE(last_minute_answers_count, 0),
        COALESCE(long_answers_count, 0),
        COALESCE(both_long_answers_count, 0),
        COALESCE(perfect_rankings_count, 0),
        COALESCE(perfect_match_days_count, 0),
        COALESCE(perfect_tot_days_count, 0),
        
        COALESCE(answered_valentines, FALSE),
        COALESCE(answered_new_years, FALSE),
        COALESCE(answered_christmas, FALSE),
        COALESCE(answered_halloween, FALSE),
        COALESCE(answered_labor_day, FALSE),
        COALESCE(answered_unity_day, FALSE),
        COALESCE(answered_anniversary, FALSE),
        COALESCE(answered_leap_day, FALSE)
    INTO 
        v_answers_count,
        v_total_matches,
        v_nudges_sent,
        v_morning_answers,
        v_night_answers,
        v_journal_views,
        v_streaks_rebuilt,
        v_avatar_changes,
        v_days_connected,
        
        v_time_sync_5min,
        v_time_sync_1min,
        v_lunch_answers,
        v_last_minute_answers,
        v_long_answers,
        v_both_long_answers,
        v_perfect_rankings,
        v_perfect_match_days,
        v_perfect_tot_days,
        
        v_answered_valentines,
        v_answered_new_years,
        v_answered_christmas,
        v_answered_halloween,
        v_answered_labor_day,
        v_answered_unity_day,
        v_answered_anniversary,
        v_answered_leap_day
    FROM public.profiles
    WHERE id = user_id_param;

    SELECT COALESCE(longest_streak, 0) INTO v_longest_streak
    FROM public.streaks
    WHERE user_id = user_id_param;

    FOR r_milestone IN SELECT id, trigger_type, trigger_value FROM public.milestones LOOP
        IF (
            (r_milestone.trigger_type = 'answers_count' AND v_answers_count >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'streak' AND v_longest_streak >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'days_connected' AND v_days_connected >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'total_matches' AND v_total_matches >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'nudges_sent' AND v_nudges_sent >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'morning_answers' AND v_morning_answers >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'night_answers' AND v_night_answers >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'journal_views' AND v_journal_views >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'streaks_rebuilt' AND v_streaks_rebuilt >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'avatar_changes' AND v_avatar_changes >= r_milestone.trigger_value) OR
            
            -- Extra triggers
            (r_milestone.trigger_type = 'time_sync_5min' AND v_time_sync_5min >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'time_sync_1min' AND v_time_sync_1min >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'lunch_answers' AND v_lunch_answers >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'last_minute_answers' AND v_last_minute_answers >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'long_answers' AND v_long_answers >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'both_long_answers' AND v_both_long_answers >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'perfect_rankings' AND v_perfect_rankings >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'perfect_match_days' AND v_perfect_match_days >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'perfect_tot_days' AND v_perfect_tot_days >= r_milestone.trigger_value) OR
            
            -- Calendar days
            (r_milestone.trigger_type = 'answered_valentines' AND v_answered_valentines = TRUE) OR
            (r_milestone.trigger_type = 'answered_new_years' AND v_answered_new_years = TRUE) OR
            (r_milestone.trigger_type = 'answered_christmas' AND v_answered_christmas = TRUE) OR
            (r_milestone.trigger_type = 'answered_halloween' AND v_answered_halloween = TRUE) OR
            (r_milestone.trigger_type = 'answered_labor_day' AND v_answered_labor_day = TRUE) OR
            (r_milestone.trigger_type = 'answered_unity_day' AND v_answered_unity_day = TRUE) OR
            (r_milestone.trigger_type = 'answered_anniversary' AND v_answered_anniversary = TRUE) OR
            (r_milestone.trigger_type = 'answered_leap_day' AND v_answered_leap_day = TRUE)
        ) THEN
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate profile check trigger definition for all milestone-relevant columns
DROP TRIGGER IF EXISTS on_profile_check_milestones ON public.profiles;
CREATE TRIGGER on_profile_check_milestones
  AFTER UPDATE OF 
    partner_since, partner_id, total_answers, total_matches, 
    nudges_sent, morning_answers_count, night_answers_count, 
    journal_views, streaks_rebuilt, avatar_change_count,
    time_sync_5min_count, time_sync_1min_count, lunch_answers_count,
    last_minute_answers_count, long_answers_count, both_long_answers_count,
    perfect_rankings_count, perfect_match_days_count, perfect_tot_days_count,
    answered_valentines, answered_new_years,
    answered_christmas, answered_halloween, answered_labor_day,
    answered_unity_day, answered_anniversary, answered_leap_day
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_profile_check_milestones();

-- 6. Seed metrics for existing profiles based on historical answers
DO $$
DECLARE
    a RECORD;
    v_partner_id UUID;
    v_partner_since TIMESTAMP WITH TIME ZONE;
BEGIN
    UPDATE public.profiles
    SET answered_christmas = FALSE,
        answered_halloween = FALSE,
        answered_labor_day = FALSE,
        answered_unity_day = FALSE,
        answered_anniversary = FALSE,
        answered_leap_day = FALSE;

    FOR a IN SELECT * FROM public.answers LOOP
        -- Christmas (24., 25., 26. Dez)
        IF EXTRACT(MONTH FROM a.day_key) = 12 AND EXTRACT(DAY FROM a.day_key) IN (24, 25, 26) THEN
            UPDATE public.profiles
            SET answered_christmas = TRUE
            WHERE id = a.user_id;
        END IF;
        -- Halloween (31. Okt)
        IF EXTRACT(MONTH FROM a.day_key) = 10 AND EXTRACT(DAY FROM a.day_key) = 31 THEN
            UPDATE public.profiles
            SET answered_halloween = TRUE
            WHERE id = a.user_id;
        END IF;
        -- Tag der Arbeit (1. Mai)
        IF EXTRACT(MONTH FROM a.day_key) = 5 AND EXTRACT(DAY FROM a.day_key) = 1 THEN
            UPDATE public.profiles
            SET answered_labor_day = TRUE
            WHERE id = a.user_id;
        END IF;
        -- Tag der Deutschen Einheit (3. Okt)
        IF EXTRACT(MONTH FROM a.day_key) = 10 AND EXTRACT(DAY FROM a.day_key) = 3 THEN
            UPDATE public.profiles
            SET answered_unity_day = TRUE
            WHERE id = a.user_id;
        END IF;
        -- Leap Day (29. Feb)
        IF EXTRACT(MONTH FROM a.day_key) = 2 AND EXTRACT(DAY FROM a.day_key) = 29 THEN
            UPDATE public.profiles
            SET answered_leap_day = TRUE
            WHERE id = a.user_id;
        END IF;
        -- Anniversary
        SELECT partner_id, partner_since INTO v_partner_id, v_partner_since FROM public.profiles WHERE id = a.user_id;
        IF v_partner_since IS NOT NULL THEN
            IF EXTRACT(MONTH FROM a.day_key) = EXTRACT(MONTH FROM v_partner_since) AND 
               EXTRACT(DAY FROM a.day_key) = EXTRACT(DAY FROM v_partner_since) THEN
                UPDATE public.profiles
                SET answered_anniversary = TRUE
                WHERE id = a.user_id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 7. Update weird/strange milestone names in database
-- Fix Typos
UPDATE public.milestones SET name = 'Fruchtbare Beziehung' WHERE trigger_type = 'days_connected' AND trigger_value = 280;
-- Rename suggestively named or unfitting milestones
UPDATE public.milestones SET name = 'Gemeinsame Abenteuer', icon = '🎡', description = 'Seid seit 400 Tagen miteinander gekoppelt.' WHERE trigger_type = 'days_connected' AND trigger_value = 400;
UPDATE public.milestones SET name = 'Reise durch die Zeit', icon = '⛵', description = 'Seid seit 430 Tagen miteinander gekoppelt.' WHERE trigger_type = 'days_connected' AND trigger_value = 430;
UPDATE public.milestones SET name = 'Fokus der Zärtlichkeit', icon = '🎯', description = 'Haltet eine Antwort-Serie (Streak) von 21 Tagen.' WHERE trigger_type = 'streak' AND trigger_value = 21;
UPDATE public.milestones SET name = 'Sichere Zuflucht', icon = '🏡', description = 'Haltet eine Antwort-Serie (Streak) von 55 Tagen.' WHERE trigger_type = 'streak' AND trigger_value = 55;
UPDATE public.milestones SET name = 'Höhenflüge der Liebe', icon = '✈️', description = 'Haltet eine Antwort-Serie (Streak) von 760 Tagen.' WHERE trigger_type = 'streak' AND trigger_value = 760;
UPDATE public.milestones SET name = 'Gefestigter Rhythmus', icon = '💫', description = 'Haltet eine Antwort-Serie (Streak) von 430 Tagen.' WHERE trigger_type = 'streak' AND trigger_value = 430;
UPDATE public.milestones SET name = 'Zirkus der Emotionen', icon = '✨', description = 'Haltet eine Antwort-Serie (Streak) von 630 Tagen.' WHERE trigger_type = 'streak' AND trigger_value = 630;
UPDATE public.milestones SET name = 'Stimme der Liebe', icon = '📣', description = 'Beantwortet insgesamt 380 Fragen.' WHERE trigger_type = 'answers_count' AND trigger_value = 380;
UPDATE public.milestones SET name = 'Farbenfrohe Gespräche', icon = '🎨', description = 'Beantwortet insgesamt 230 Fragen.' WHERE trigger_type = 'answers_count' AND trigger_value = 230;
UPDATE public.milestones SET name = 'Fluss der Gedanken', icon = '🌊', description = 'Beantwortet insgesamt 830 Fragen.' WHERE trigger_type = 'answers_count' AND trigger_value = 830;
UPDATE public.milestones SET name = 'Zweisame Umlaufbahn' WHERE trigger_type = 'streak' AND trigger_value = 110;
UPDATE public.milestones SET name = 'Triumph der Liebe' WHERE trigger_type = 'streak' AND trigger_value = 150;
UPDATE public.milestones SET name = 'Krone der Kompatibilität' WHERE trigger_type = 'total_matches' AND trigger_value = 950;
UPDATE public.milestones SET icon = '🌟' WHERE trigger_type = 'days_connected' AND trigger_value = 1000;

-- 8. Insert new calendar/special event milestones
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Weihnachtszauber', 'Beantwortet eure Fragen an den Weihnachtsfeiertagen (24.-26. Dezember).', '🎄', 'answered_christmas', 1),
  ('Süßes oder Saures', 'Beantwortet eure Fragen an Halloween (31. Oktober).', '🎃', 'answered_halloween', 1),
  ('Tag der Beziehungsarbeit', 'Beantwortet eure Fragen am Tag der Arbeit (1. Mai).', '🛠️', 'answered_labor_day', 1),
  ('Tag der deutschen Zweisamkeit', 'Beantwortet eure Fragen am Tag der Deutschen Einheit (3. Oktober).', '💑', 'answered_unity_day', 1),
  ('Schaltjahr-Liebe', 'Beantwortet eure Fragen am Schalttag (29. Februar).', '📅', 'answered_leap_day', 1),
  ('Unser Jahrestag', 'Beantwortet eure Fragen am Jahrestag eurer Kopplung.', '✨', 'answered_anniversary', 1)
ON CONFLICT DO NOTHING;

-- 9. Re-calculate milestones for all existing profiles to apply updates
DO $$
DECLARE
    p RECORD;
BEGIN
    TRUNCATE TABLE public.unlocked_milestones CASCADE;
    FOR p IN SELECT id FROM public.profiles LOOP
        PERFORM public.check_and_unlock_milestones(p.id);
    END LOOP;
END $$;
