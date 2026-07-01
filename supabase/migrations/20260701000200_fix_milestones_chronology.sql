-- 1. Update existing milestones timestamps to their actual chronological achievement dates
-- Backdate days_connected milestones
UPDATE public.unlocked_milestones um
SET unlocked_at = COALESCE(
  p.partner_since + (m.trigger_value || ' days')::interval,
  um.unlocked_at
)
FROM public.profiles p, public.milestones m
WHERE um.user_id = p.id AND um.milestone_id = m.id 
  AND m.trigger_type = 'days_connected';

-- Backdate answers_count milestones
UPDATE public.unlocked_milestones um
SET unlocked_at = COALESCE(
  (
    SELECT a.created_at
    FROM public.answers a
    WHERE a.user_id = um.user_id
    ORDER BY a.created_at ASC
    LIMIT 1 OFFSET (m.trigger_value - 1)
  ),
  um.unlocked_at
)
FROM public.milestones m
WHERE um.milestone_id = m.id 
  AND m.trigger_type = 'answers_count';

-- Backdate streak milestones
UPDATE public.unlocked_milestones um
SET unlocked_at = COALESCE(
  (
    SELECT (s.streak_history->>(m.trigger_value - 1) || ' 12:00:00+02')::timestamp WITH TIME ZONE
    FROM public.streaks s
    WHERE s.user_id = um.user_id
    LIMIT 1
  ),
  um.unlocked_at
)
FROM public.milestones m
WHERE um.milestone_id = m.id 
  AND m.trigger_type = 'streak';


-- 2. Update trigger function to automatically set precise chronological unlocked_at dates for future unlocks
CREATE OR REPLACE FUNCTION public.check_and_unlock_milestones(user_id_param UUID)
RETURNS void AS $$
DECLARE
    v_answers_count INTEGER;
    v_streak INTEGER;
    v_days_connected INTEGER;
    v_partner_since TIMESTAMP WITH TIME ZONE;
    r_milestone RECORD;
    v_unlocked_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Get user answers count
    SELECT count(*)::integer INTO v_answers_count
    FROM public.answers
    WHERE user_id = user_id_param;

    -- 2. Get user current streak
    SELECT COALESCE(current_streak, 0) INTO v_streak
    FROM public.streaks
    WHERE user_id = user_id_param;

    -- 3. Get days connected and partner_since
    SELECT COALESCE(EXTRACT(DAY FROM (NOW() - partner_since)), 0)::integer, partner_since
    INTO v_days_connected, v_partner_since
    FROM public.profiles
    WHERE id = user_id_param;

    -- 4. Loop through milestone configurations and insert unlocked ones
    FOR r_milestone IN SELECT id, trigger_type, trigger_value FROM public.milestones LOOP
        v_unlocked_at := NULL;

        IF r_milestone.trigger_type = 'answers_count' AND v_answers_count >= r_milestone.trigger_value THEN
            -- Find the timestamp of the Y-th answer
            SELECT created_at INTO v_unlocked_at
            FROM public.answers
            WHERE user_id = user_id_param
            ORDER BY created_at ASC
            LIMIT 1 OFFSET (r_milestone.trigger_value - 1);

            INSERT INTO public.unlocked_milestones (user_id, milestone_id, unlocked_at)
            VALUES (user_id_param, r_milestone.id, COALESCE(v_unlocked_at, now()))
            ON CONFLICT DO NOTHING;

        ELSIF r_milestone.trigger_type = 'streak' AND v_streak >= r_milestone.trigger_value THEN
            -- Find the date of the Y-th streak completion
            SELECT (streak_history->>(r_milestone.trigger_value - 1) || ' 12:00:00+02')::timestamp WITH TIME ZONE INTO v_unlocked_at
            FROM public.streaks
            WHERE user_id = user_id_param;

            INSERT INTO public.unlocked_milestones (user_id, milestone_id, unlocked_at)
            VALUES (user_id_param, r_milestone.id, COALESCE(v_unlocked_at, now()))
            ON CONFLICT DO NOTHING;

        ELSIF r_milestone.trigger_type = 'days_connected' AND v_days_connected >= r_milestone.trigger_value THEN
            -- Calculate partner_since + Y days
            IF v_partner_since IS NOT NULL THEN
                v_unlocked_at := v_partner_since + (r_milestone.trigger_value || ' days')::interval;
            END IF;

            INSERT INTO public.unlocked_milestones (user_id, milestone_id, unlocked_at)
            VALUES (user_id_param, r_milestone.id, COALESCE(v_unlocked_at, now()))
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
