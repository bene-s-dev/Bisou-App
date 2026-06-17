-- Update check_and_unlock_milestones to use streaks.longest_streak and profiles.partner_since
-- This avoids using the incomplete public.answers table for calculations.
CREATE OR REPLACE FUNCTION public.check_and_unlock_milestones(user_id_param UUID)
RETURNS void AS $$
DECLARE
    v_longest_streak INTEGER;
    v_days_connected INTEGER;
    r_milestone RECORD;
BEGIN
    -- 1. Get longest streak from streaks table
    SELECT COALESCE(longest_streak, 0) INTO v_longest_streak
    FROM public.streaks
    WHERE user_id = user_id_param;

    -- 2. Get days connected (difference between partner_since and now)
    SELECT COALESCE(EXTRACT(DAY FROM (NOW() - partner_since)), 0)::integer INTO v_days_connected
    FROM public.profiles
    WHERE id = user_id_param;

    -- 3. Loop through milestone configurations and insert unlocked ones
    FOR r_milestone IN SELECT id, trigger_type, trigger_value FROM public.milestones LOOP
        IF r_milestone.trigger_type = 'answers_count' AND v_longest_streak >= r_milestone.trigger_value THEN
            -- Map answers_count to longest_streak because the answers table is historically incomplete
            INSERT INTO public.unlocked_milestones (user_id, milestone_id)
            VALUES (user_id_param, r_milestone.id)
            ON CONFLICT DO NOTHING;
        ELSIF r_milestone.trigger_type = 'streak' AND v_longest_streak >= r_milestone.trigger_value THEN
            -- Streak achievements are evaluated against longest_streak
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

-- Re-calculate milestones for all existing profiles using the new logic
DO $$
DECLARE
    p RECORD;
BEGIN
    -- Clear unlocked_milestones first to rebuild them cleanly with the new logic
    TRUNCATE TABLE public.unlocked_milestones CASCADE;
    
    FOR p IN SELECT id FROM public.profiles LOOP
        PERFORM public.check_and_unlock_milestones(p.id);
    END LOOP;
END $$;
