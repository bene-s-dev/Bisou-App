-- Fix avatar change count to only increment on actual changes (not first time upload)
CREATE OR REPLACE FUNCTION public.trigger_on_profile_metrics_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Detect Nudge changes
    IF NEW.last_nudge_at IS DISTINCT FROM OLD.last_nudge_at AND NEW.last_nudge_at IS NOT NULL THEN
        NEW.nudges_sent := COALESCE(OLD.nudges_sent, 0) + 1;
    END IF;

    -- Detect Avatar changes (only count actual changes, not the first setup)
    IF OLD.avatar_url IS NOT NULL AND NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NEW.avatar_url IS NOT NULL THEN
        NEW.avatar_change_count := COALESCE(OLD.avatar_change_count, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
