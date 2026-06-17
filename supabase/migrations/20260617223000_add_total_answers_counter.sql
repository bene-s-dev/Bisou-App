-- 1. Add persistent total_answers column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS total_answers INTEGER DEFAULT 0;

-- 2. Initialize total_answers for existing profiles
-- We initialize to the greater of their existing answers count OR their longest streak
-- to give them full credit for historical answers before the 90-day pruning cron.
UPDATE public.profiles p 
SET total_answers = GREATEST(
  (SELECT COALESCE(count(*), 0)::integer FROM public.answers a WHERE a.user_id = p.id), 
  (SELECT COALESCE(longest_streak, 0) FROM public.streaks s WHERE s.user_id = p.id)
);

-- 3. Create increment trigger function
CREATE OR REPLACE FUNCTION public.increment_total_answers()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET total_answers = COALESCE(total_answers, 0) + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create decrement trigger function
CREATE OR REPLACE FUNCTION public.decrement_total_answers()
RETURNS TRIGGER AS $$
BEGIN
    -- Only decrement if the deleted answer is recent (within 2 days),
    -- which corresponds to a user resetting today's answer, NOT the 90-day cron pruning.
    IF OLD.day_key >= CURRENT_DATE - INTERVAL '2 days' THEN
        UPDATE public.profiles
        SET total_answers = GREATEST(0, COALESCE(total_answers, 0) - 1)
        WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_answer_increment ON public.answers;
DROP TRIGGER IF EXISTS on_answer_decrement ON public.answers;

-- 6. Attach triggers to answers table
CREATE TRIGGER on_answer_increment
  AFTER INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.increment_total_answers();

CREATE TRIGGER on_answer_decrement
  AFTER DELETE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.decrement_total_answers();

-- 7. Update check_and_unlock_milestones to use profiles.total_answers
CREATE OR REPLACE FUNCTION public.check_and_unlock_milestones(user_id_param UUID)
RETURNS void AS $$
DECLARE
    v_answers_count INTEGER;
    v_longest_streak INTEGER;
    v_days_connected INTEGER;
    r_milestone RECORD;
BEGIN
    -- 1. Get total answers count from profiles table
    SELECT COALESCE(total_answers, 0) INTO v_answers_count
    FROM public.profiles
    WHERE id = user_id_param;

    -- 2. Get longest streak from streaks table
    SELECT COALESCE(longest_streak, 0) INTO v_longest_streak
    FROM public.streaks
    WHERE user_id = user_id_param;

    -- 3. Get days connected (difference between partner_since and now)
    SELECT COALESCE(EXTRACT(DAY FROM (NOW() - partner_since)), 0)::integer INTO v_days_connected
    FROM public.profiles
    WHERE id = user_id_param;

    -- 4. Loop through milestone configurations and insert unlocked ones
    FOR r_milestone IN SELECT id, trigger_type, trigger_value FROM public.milestones LOOP
        IF r_milestone.trigger_type = 'answers_count' AND v_answers_count >= r_milestone.trigger_value THEN
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        ELSIF r_milestone.trigger_type = 'streak' AND v_longest_streak >= r_milestone.trigger_value THEN
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        ELSIF r_milestone.trigger_type = 'days_connected' AND v_days_connected >= r_milestone.trigger_value THEN
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Re-calculate milestones for all existing profiles using the persistent counters
DO $$
DECLARE
    p RECORD;
BEGIN
    TRUNCATE TABLE public.unlocked_milestones CASCADE;
    
    FOR p IN SELECT id FROM public.profiles LOOP
        PERFORM public.check_and_unlock_milestones(p.id);
    END LOOP;
END $$;
