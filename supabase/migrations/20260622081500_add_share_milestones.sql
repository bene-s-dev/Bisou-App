-- 1. Add shares_count column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Create RPC function to increment shares_count
CREATE OR REPLACE FUNCTION public.increment_shares_count()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET shares_count = COALESCE(shares_count, 0) + 1
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine check_and_unlock_milestones with shares_count trigger
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
    v_answered_valentines BOOLEAN;
    v_answered_new_years BOOLEAN;
    v_perfect_rankings INTEGER;
    v_perfect_match_days INTEGER;
    
    -- New metric
    v_shares_count INTEGER;
    
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
        COALESCE(answered_valentines, FALSE),
        COALESCE(answered_new_years, FALSE),
        COALESCE(perfect_rankings_count, 0),
        COALESCE(perfect_match_days_count, 0),
        COALESCE(shares_count, 0)
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
        v_answered_valentines,
        v_answered_new_years,
        v_perfect_rankings,
        v_perfect_match_days,
        v_shares_count
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
            (r_milestone.trigger_type = 'answered_valentines' AND v_answered_valentines = TRUE) OR
            (r_milestone.trigger_type = 'answered_new_years' AND v_answered_new_years = TRUE) OR
            (r_milestone.trigger_type = 'perfect_rankings' AND v_perfect_rankings >= r_milestone.trigger_value) OR
            (r_milestone.trigger_type = 'perfect_match_days' AND v_perfect_match_days >= r_milestone.trigger_value) OR
            
            -- New trigger
            (r_milestone.trigger_type = 'shares_count' AND v_shares_count >= r_milestone.trigger_value)
        ) THEN
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create trigger with shares_count column update tracking
DROP TRIGGER IF EXISTS on_profile_check_milestones ON public.profiles;
CREATE TRIGGER on_profile_check_milestones
  AFTER UPDATE OF 
    partner_since, partner_id, total_answers, total_matches, 
    nudges_sent, morning_answers_count, night_answers_count, 
    journal_views, streaks_rebuilt, avatar_change_count,
    time_sync_5min_count, time_sync_1min_count, lunch_answers_count,
    last_minute_answers_count, long_answers_count, both_long_answers_count,
    answered_valentines, answered_new_years, perfect_rankings_count,
    perfect_match_days_count, shares_count
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_profile_check_milestones();

-- 5. Seed milestones for shares_count avoiding duplicate rows
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value)
SELECT m.name, m.description, m.icon, m.trigger_type, m.trigger_value
FROM (VALUES
  ('Erste Schritte im Rampenlicht', 'Teilt eure Antworten 5-mal mit anderen.', '📸', 'shares_count', 5),
  ('Beziehungs-Botschafter', 'Teilt eure Antworten 10-mal mit anderen.', '📣', 'shares_count', 10),
  ('Stolz wie Oskar', 'Teilt eure Antworten 15-mal mit anderen.', '🦚', 'shares_count', 15),
  ('Offene Liebesgeschichte', 'Teilt eure Antworten 20-mal mit anderen.', '📖', 'shares_count', 20),
  ('Inspiration für andere', 'Teilt eure Antworten 25-mal mit anderen.', '✨', 'shares_count', 25),
  ('Liebe ohne Geheimnisse', 'Teilt eure Antworten 30-mal mit anderen.', '💖', 'shares_count', 30),
  ('Gemeinsames Album', 'Teilt eure Antworten 35-mal mit anderen.', '🖼️', 'shares_count', 35),
  ('Ein offenes Buch', 'Teilt eure Antworten 40-mal mit anderen.', '📚', 'shares_count', 40),
  ('Chronik unserer Liebe', 'Teilt eure Antworten 45-mal mit anderen.', '📜', 'shares_count', 45),
  ('Unendliche Liebesgeschichte', 'Teilt eure Antworten 50-mal mit anderen.', '♾️', 'shares_count', 50)
) AS m(name, description, icon, trigger_type, trigger_value)
WHERE NOT EXISTS (
  SELECT 1 FROM public.milestones WHERE milestones.name = m.name
);
