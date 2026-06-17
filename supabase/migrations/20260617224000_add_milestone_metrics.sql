-- 1. Add metrics columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS total_matches INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS nudges_sent INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS morning_answers_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS night_answers_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS journal_views INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS streaks_rebuilt INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS avatar_change_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Create helper function to calculate ranking similarity
CREATE OR REPLACE FUNCTION public.calculate_ranking_similarity(r1 text, r2 text)
RETURNS numeric AS $$
DECLARE
    arr1 text[];
    arr2 text[];
    common text[] := '{}';
    item text;
    myPos integer;
    partnerPos integer;
    sumSqDiff numeric := 0;
    n integer;
    maxSqDiff numeric;
    rawSim numeric;
    sim numeric;
    i integer;
    j integer;
BEGIN
    arr1 := regexp_split_to_array(r1, '\s*>\s*');
    arr2 := regexp_split_to_array(r2, '\s*>\s*');
    
    -- Find common items
    FOR i IN 1..COALESCE(array_length(arr1, 1), 0) LOOP
        FOR j IN 1..COALESCE(array_length(arr2, 1), 0) LOOP
            IF arr1[i] = arr2[j] THEN
                common := array_append(common, arr1[i]);
            END IF;
        END LOOP;
    END LOOP;
    
    n := array_length(common, 1);
    IF n IS NULL OR n <= 1 THEN
        RETURN 0;
    END IF;
    
    FOR i IN 1..n LOOP
        item := common[i];
        FOR j IN 1..array_length(arr1, 1) LOOP
            IF arr1[j] = item THEN
                myPos := j - 1;
            END IF;
        END LOOP;
        FOR j IN 1..array_length(arr2, 1) LOOP
            IF arr2[j] = item THEN
                partnerPos := j - 1;
            END IF;
        END LOOP;
        sumSqDiff := sumSqDiff + power(myPos - partnerPos, 2);
    END LOOP;
    
    maxSqDiff := (n::numeric * (n::numeric * n::numeric - 1)) / 3;
    IF maxSqDiff > 0 THEN
        rawSim := (1 - (sumSqDiff / maxSqDiff)) * 100;
    ELSE
        rawSim := 100;
    END IF;
    
    IF rawSim < 0 THEN
        rawSim := 0;
    END IF;
    
    sim := sqrt(rawSim / 100.0) * 100.0;
    RETURN sim;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create helper function to calculate matched answers (choice overlap)
CREATE OR REPLACE FUNCTION public.calculate_choice_matches(choice1 text, choice2 text)
RETURNS integer AS $$
DECLARE
    parts1 text[];
    parts2 text[];
    tot1 text;
    tot2 text;
    ranking1 text;
    ranking2 text;
    wwe1 text;
    wwe2 text;
    matches_count integer := 0;
    sim numeric;
BEGIN
    -- Strip signature [...]
    choice1 := split_part(choice1, ' [', 1);
    choice2 := split_part(choice2, ' [', 1);
    
    parts1 := regexp_split_to_array(choice1, '\s*\|\s*');
    parts2 := regexp_split_to_array(choice2, '\s*\|\s*');
    
    IF array_length(parts1, 1) >= 1 THEN tot1 := trim(parts1[1]); END IF;
    IF array_length(parts2, 1) >= 1 THEN tot2 := trim(parts2[1]); END IF;
    
    IF array_length(parts1, 1) >= 2 THEN ranking1 := trim(parts1[2]); END IF;
    IF array_length(parts2, 1) >= 2 THEN ranking2 := trim(parts2[2]); END IF;
    
    IF array_length(parts1, 1) >= 4 THEN wwe1 := trim(parts1[4]); END IF;
    IF array_length(parts2, 1) >= 4 THEN wwe2 := trim(parts2[4]); END IF;
    
    -- 1. Dies-oder-Das (tot) Match
    IF tot1 IS NOT NULL AND tot1 <> '' AND tot2 IS NOT NULL AND tot2 <> '' THEN
        IF tot1 = tot2 THEN
            matches_count := matches_count + 1;
        END IF;
    END IF;
    
    -- 2. Wer-würde-eher (wwe) Match
    IF wwe1 IS NOT NULL AND wwe1 <> '' AND wwe2 IS NOT NULL AND wwe2 <> '' THEN
        IF wwe1 <> wwe2 THEN
            matches_count := matches_count + 1;
        END IF;
    END IF;
    
    -- 3. Ranking Match (high similarity >= 75%)
    IF ranking1 IS NOT NULL AND ranking1 <> '' AND ranking2 IS NOT NULL AND ranking2 <> '' THEN
        sim := public.calculate_ranking_similarity(ranking1, ranking2);
        IF sim >= 75 THEN
            matches_count := matches_count + 1;
        END IF;
    END IF;
    
    RETURN matches_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Redefine increment_total_answers trigger function
CREATE OR REPLACE FUNCTION public.increment_total_answers()
RETURNS TRIGGER AS $$
DECLARE
    v_local_hour INTEGER;
    v_partner_id UUID;
    v_partner_answer RECORD;
    v_matches INTEGER;
BEGIN
    -- 1. Increment total_answers
    UPDATE public.profiles
    SET total_answers = COALESCE(total_answers, 0) + 1
    WHERE id = NEW.user_id;

    -- 2. Increment habit counters (morning/night)
    v_local_hour := EXTRACT(HOUR FROM (NEW.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
    IF v_local_hour >= 5 AND v_local_hour < 7 THEN
        UPDATE public.profiles
        SET morning_answers_count = COALESCE(morning_answers_count, 0) + 1
        WHERE id = NEW.user_id;
    ELSIF v_local_hour >= 23 OR v_local_hour < 4 THEN
        UPDATE public.profiles
        SET night_answers_count = COALESCE(night_answers_count, 0) + 1
        WHERE id = NEW.user_id;
    END IF;

    -- 3. Check for matches with partner
    SELECT partner_id INTO v_partner_id
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF v_partner_id IS NOT NULL THEN
        SELECT * INTO v_partner_answer
        FROM public.answers
        WHERE user_id = v_partner_id AND day_key = NEW.day_key;

        IF FOUND THEN
            v_matches := public.calculate_choice_matches(NEW.choice, v_partner_answer.choice);
            IF v_matches > 0 THEN
                UPDATE public.profiles
                SET total_matches = COALESCE(total_matches, 0) + v_matches
                WHERE id IN (NEW.user_id, v_partner_id);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Redefine decrement_total_answers trigger function
CREATE OR REPLACE FUNCTION public.decrement_total_answers()
RETURNS TRIGGER AS $$
DECLARE
    v_local_hour INTEGER;
    v_partner_id UUID;
    v_partner_answer RECORD;
    v_matches INTEGER;
BEGIN
    IF OLD.day_key >= CURRENT_DATE - INTERVAL '2 days' THEN
        -- 1. Decrement total_answers
        UPDATE public.profiles
        SET total_answers = GREATEST(0, COALESCE(total_answers, 0) - 1)
        WHERE id = OLD.user_id;

        -- 2. Decrement habit counters
        v_local_hour := EXTRACT(HOUR FROM (OLD.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
        IF v_local_hour >= 5 AND v_local_hour < 7 THEN
            UPDATE public.profiles
            SET morning_answers_count = GREATEST(0, COALESCE(morning_answers_count, 0) - 1)
            WHERE id = OLD.user_id;
        ELSIF v_local_hour >= 23 OR v_local_hour < 4 THEN
            UPDATE public.profiles
            SET night_answers_count = GREATEST(0, COALESCE(night_answers_count, 0) - 1)
            WHERE id = OLD.user_id;
        END IF;

        -- 3. Decrement matches if they matched
        SELECT partner_id INTO v_partner_id
        FROM public.profiles
        WHERE id = OLD.user_id;

        IF v_partner_id IS NOT NULL THEN
            SELECT * INTO v_partner_answer
            FROM public.answers
            WHERE user_id = v_partner_id AND day_key = OLD.day_key;

            IF FOUND THEN
                v_matches := public.calculate_choice_matches(OLD.choice, v_partner_answer.choice);
                IF v_matches > 0 THEN
                    UPDATE public.profiles
                    SET total_matches = GREATEST(0, COALESCE(total_matches, 0) - v_matches)
                    WHERE id IN (OLD.user_id, v_partner_id);
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update update_streak trigger function to check for streak rebuilds
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
    
    SELECT partner_id INTO curr_partner_id
    FROM public.profiles
    WHERE id = NEW.user_id;

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
            IF last_d > today AND NOT (s_history @> jsonb_build_array(today)) THEN
                UPDATE public.streaks
                SET streak_history = streak_history || jsonb_build_array(today)
                WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;
            END IF;
            RETURN NEW;
        ELSIF last_d = yesterday THEN
            UPDATE public.streaks
            SET current_streak = current_s + 1,
                longest_streak = GREATEST(longest_streak, current_s + 1),
                last_answer_date = today,
                streak_history = streak_history || jsonb_build_array(today)
            WHERE user_id = NEW.user_id AND partner_id = curr_partner_id;

            -- Check if user rebuilt a streak back up to 7
            IF current_s + 1 = 7 THEN
                UPDATE public.profiles
                SET streaks_rebuilt = COALESCE(streaks_rebuilt, 0) + 1
                WHERE id = NEW.user_id;
            END IF;
        ELSE
            -- Streak broken (reset to 1)
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

-- 7. Add Nudge and Avatar hooks via BEFORE UPDATE triggers
CREATE OR REPLACE FUNCTION public.trigger_on_profile_metrics_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Detect Nudge changes
    IF NEW.last_nudge_at IS DISTINCT FROM OLD.last_nudge_at AND NEW.last_nudge_at IS NOT NULL THEN
        NEW.nudges_sent := COALESCE(OLD.nudges_sent, 0) + 1;
    END IF;

    -- Detect Avatar changes
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NEW.avatar_url IS NOT NULL THEN
        NEW.avatar_change_count := COALESCE(OLD.avatar_change_count, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_metrics_trigger ON public.profiles;
CREATE TRIGGER on_profile_metrics_trigger
  BEFORE UPDATE OF last_nudge_at, avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_on_profile_metrics_update();

-- 8. Add RPC to increment journal views
CREATE OR REPLACE FUNCTION public.increment_journal_views()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET journal_views = COALESCE(journal_views, 0) + 1
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Expand check_and_unlock_milestones with all new metrics
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
        COALESCE(EXTRACT(DAY FROM (NOW() - partner_since)), 0)::integer
    INTO 
        v_answers_count,
        v_total_matches,
        v_nudges_sent,
        v_morning_answers,
        v_night_answers,
        v_journal_views,
        v_streaks_rebuilt,
        v_avatar_changes,
        v_days_connected
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
            (r_milestone.trigger_type = 'avatar_changes' AND v_avatar_changes >= r_milestone.trigger_value)
        ) THEN
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Re-create RLS-trigger profile check to trigger milestone validation
DROP TRIGGER IF EXISTS on_profile_check_milestones ON public.profiles;
CREATE TRIGGER on_profile_check_milestones
  AFTER UPDATE OF 
    partner_since, partner_id, total_answers, total_matches, 
    nudges_sent, morning_answers_count, night_answers_count, 
    journal_views, streaks_rebuilt, avatar_change_count 
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_profile_check_milestones();

-- 11. Initial seed for existing profiles metrics based on historical answers
DO $$
DECLARE
    a RECORD;
    v_partner_id UUID;
    v_partner_answer RECORD;
    v_local_hour INTEGER;
    v_matches INTEGER;
BEGIN
    UPDATE public.profiles
    SET total_matches = 0,
        morning_answers_count = 0,
        night_answers_count = 0;

    FOR a IN SELECT * FROM public.answers LOOP
        -- Habits
        v_local_hour := EXTRACT(HOUR FROM (a.created_at AT TIME ZONE 'Europe/Berlin'))::integer;
        IF v_local_hour >= 5 AND v_local_hour < 7 THEN
            UPDATE public.profiles
            SET morning_answers_count = morning_answers_count + 1
            WHERE id = a.user_id;
        ELSIF v_local_hour >= 23 OR v_local_hour < 4 THEN
            UPDATE public.profiles
            SET night_answers_count = night_answers_count + 1
            WHERE id = a.user_id;
        END IF;

        -- Matches
        SELECT partner_id INTO v_partner_id FROM public.profiles WHERE id = a.user_id;
        IF v_partner_id IS NOT NULL AND a.user_id < v_partner_id THEN
            SELECT * INTO v_partner_answer
            FROM public.answers
            WHERE user_id = v_partner_id AND day_key = a.day_key;

            IF FOUND THEN
                v_matches := public.calculate_choice_matches(a.choice, v_partner_answer.choice);
                IF v_matches > 0 THEN
                    UPDATE public.profiles
                    SET total_matches = total_matches + v_matches
                    WHERE id IN (a.user_id, v_partner_id);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 12. Seed milestones for the new metrics
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Gemeinsame Wellenlänge', 'Eure erste Übereinstimmung bei den Fragen!', '🌊', 'total_matches', 1),
  ('Gedankenleser', 'Findet 10 Übereinstimmungen bei euren Antworten.', '🔮', 'total_matches', 10),
  ('Blindes Verständnis', 'Findet 25 Übereinstimmungen bei euren Antworten.', '🙈', 'total_matches', 25),
  ('Seelenverwandte', 'Findet 50 Übereinstimmungen bei euren Antworten.', '☯️', 'total_matches', 50),
  ('Zwei Herzen, ein Rhythmus', 'Findet 100 Übereinstimmungen bei euren Antworten.', '💓', 'total_matches', 100),
  ('Telepathische Liebe', 'Findet 200 Übereinstimmungen bei euren Antworten.', '🧠', 'total_matches', 200),
  
  ('Kleiner Stupser', 'Stupse deinen Partner zum ersten Mal an.', '👉', 'nudges_sent', 1),
  ('Aufmerksamkeits-Magnet', 'Sende deinem Partner insgesamt 10 Anstupser.', '🧲', 'nudges_sent', 10),
  ('Hartnäckige Liebe', 'Sende deinem Partner insgesamt 30 Anstupser.', '🔔', 'nudges_sent', 30),
  ('Immer im Kopf', 'Sende deinem Partner insgesamt 75 Anstupser.', '💭', 'nudges_sent', 75),
  ('Stups-Großmeister', 'Sende deinem Partner insgesamt 150 Anstupser.', '👑', 'nudges_sent', 150),
  
  ('Früher Vogel', 'Beantworte eine Frage morgens vor 7:00 Uhr.', '🌅', 'morning_answers', 1),
  ('Morgen-Turteltaube', 'Beantworte 10 Fragen morgens vor 7:00 Uhr.', '🐦', 'morning_answers', 10),
  ('Sonnenaufgangs-Liebe', 'Beantworte 30 Fragen morgens vor 7:00 Uhr.', '☀️', 'morning_answers', 30),
  ('Morgenroutine des Herzens', 'Beantworte 75 Fragen morgens vor 7:00 Uhr.', '☕', 'morning_answers', 75),
  
  ('Nachteule', 'Beantworte eine Frage nachts nach 23:00 Uhr.', '🦉', 'night_answers', 1),
  ('Mitternachts-Gedanke', 'Beantworte 10 Fragen nachts nach 23:00 Uhr.', '🌙', 'night_answers', 10),
  ('Sternenhimmel-Liebe', 'Beantworte 30 Fragen nachts nach 23:00 Uhr.', '🌌', 'night_answers', 30),
  ('Träumer der Nacht', 'Beantworte 75 Fragen nachts nach 23:00 Uhr.', '🌠', 'night_answers', 75),
  
  ('Archivar der Liebe', 'Wirf deinen ersten Blick ins Journal.', '📖', 'journal_views', 1),
  ('Nostalgiker', 'Besuche das Journal insgesamt 10-mal.', '🕰️', 'journal_views', 10),
  ('Erinnerungs-Sammler', 'Besuche das Journal insgesamt 30-mal.', '📸', 'journal_views', 30),
  ('Hüter der Vergangenheit', 'Besuche das Journal insgesamt 75-mal.', '🏛️', 'journal_views', 75),
  
  ('Phönix aus der Asche', 'Baue nach einer Pause wieder eine 7-Tage-Serie auf.', '🦅', 'streaks_rebuilt', 1),
  ('Stehaufmännchen', 'Baue zum 3. Mal eine 7-Tage-Serie nach einer Pause auf.', '🎈', 'streaks_rebuilt', 3),
  ('Unverwüstliches Band', 'Baue zum 5. Mal eine 7-Tage-Serie nach einer Pause auf.', '🔗', 'streaks_rebuilt', 5),
  
  ('Neuer Look', 'Ändere zum ersten Mal deinen Avatar.', '🎭', 'avatar_changes', 1),
  ('Chamäleon', 'Ändere 3-mal deinen Avatar.', '🦎', 'avatar_changes', 3),
  ('Model der Liebe', 'Ändere 10-mal deinen Avatar.', '📸', 'avatar_changes', 10)
  ON CONFLICT DO NOTHING;

-- 13. Re-calculate milestones for all existing profiles using the expanded validation
DO $$
DECLARE
    p RECORD;
BEGIN
    -- Clear and rebuild milestones
    TRUNCATE TABLE public.unlocked_milestones CASCADE;
    
    FOR p IN SELECT id FROM public.profiles LOOP
        PERFORM public.check_and_unlock_milestones(p.id);
    END LOOP;
END $$;
