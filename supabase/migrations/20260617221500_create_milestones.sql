-- Create milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji or lucide icon identifier
  trigger_type TEXT NOT NULL, -- 'answers_count', 'streak', 'days_connected'
  trigger_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default milestone configurations
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Aller Anfang...', 'Verbindet euch erfolgreich als Partner.', '🤝', 'days_connected', 1)
  ON CONFLICT DO NOTHING;

INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Eine Woche Liebe', 'Erreicht eine Antwort-Serie (Streak) von 7 Tagen.', '🔥', 'streak', 7)
  ON CONFLICT DO NOTHING;

INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Gewohnheit des Herzens', 'Erreicht eine Antwort-Serie (Streak) von 21 Tagen.', '🎯', 'streak', 21)
  ON CONFLICT DO NOTHING;

INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Erste Schritte', 'Beantwortet eure ersten 5 täglichen Fragen.', '✍️', 'answers_count', 5)
  ON CONFLICT DO NOTHING;

INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Goldene Feder', 'Beantwortet insgesamt 50 tägliche Fragen.', '🏆', 'answers_count', 50)
  ON CONFLICT DO NOTHING;

INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  ('Ein Monat Verbundenheit', 'Seid seit 30 Tagen miteinander gekoppelt.', '💖', 'days_connected', 30)
  ON CONFLICT DO NOTHING;

-- Create unlocked_milestones tracking table
CREATE TABLE IF NOT EXISTS public.unlocked_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, milestone_id)
);

-- Enable Row Level Security
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow read access to milestones for authenticated users" ON public.milestones;
CREATE POLICY "Allow read access to milestones for authenticated users" ON public.milestones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access to unlocked milestones for authenticated users" ON public.unlocked_milestones;
CREATE POLICY "Allow read access to unlocked milestones for authenticated users" ON public.unlocked_milestones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert to unlocked milestones for service_role" ON public.unlocked_milestones;
CREATE POLICY "Allow insert to unlocked milestones for service_role" ON public.unlocked_milestones
  FOR INSERT TO service_role WITH CHECK (true);

-- Function to check and unlock milestones
CREATE OR REPLACE FUNCTION public.check_and_unlock_milestones(user_id_param UUID)
RETURNS void AS $$
DECLARE
    v_answers_count INTEGER;
    v_streak INTEGER;
    v_days_connected INTEGER;
    r_milestone RECORD;
BEGIN
    -- 1. Get user answers count
    SELECT count(*)::integer INTO v_answers_count
    FROM public.answers
    WHERE user_id = user_id_param;

    -- 2. Get user current streak (longest streak is also an option, but current streak fits the trigger criteria)
    SELECT COALESCE(current_streak, 0) INTO v_streak
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
        ELSIF r_milestone.trigger_type = 'streak' AND v_streak >= r_milestone.trigger_value THEN
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

-- Trigger functions to call check_and_unlock_milestones
CREATE OR REPLACE FUNCTION public.trigger_check_milestones()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.check_and_unlock_milestones(OLD.user_id);
        RETURN OLD;
    ELSE
        PERFORM public.check_and_unlock_milestones(NEW.user_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for profile changes (since columns are id instead of user_id)
CREATE OR REPLACE FUNCTION public.trigger_profile_check_milestones()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.check_and_unlock_milestones(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers to avoid errors
DROP TRIGGER IF EXISTS on_answer_check_milestones ON public.answers;
DROP TRIGGER IF EXISTS on_streak_check_milestones ON public.streaks;
DROP TRIGGER IF EXISTS on_profile_check_milestones ON public.profiles;

-- Create triggers
CREATE TRIGGER on_answer_check_milestones
  AFTER INSERT OR UPDATE OR DELETE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_milestones();

CREATE TRIGGER on_streak_check_milestones
  AFTER INSERT OR UPDATE OR DELETE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_milestones();

CREATE TRIGGER on_profile_check_milestones
  AFTER UPDATE OF partner_since, partner_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_profile_check_milestones();
