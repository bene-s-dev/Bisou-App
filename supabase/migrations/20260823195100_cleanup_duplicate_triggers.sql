-- Clean up duplicate triggers on profiles, answers, and streaks

-- 1. Deduplicate on_profile_change trigger
DROP TRIGGER IF EXISTS on_profile_change ON public.profiles;
CREATE TRIGGER on_profile_change
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.send_ntfy_notification();

-- 2. Deduplicate on_answer_check_milestones trigger
DROP TRIGGER IF EXISTS on_answer_check_milestones ON public.answers;
CREATE TRIGGER on_answer_check_milestones
  AFTER INSERT OR UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_milestones();

-- 3. Deduplicate on_streak_check_milestones trigger
DROP TRIGGER IF EXISTS on_streak_check_milestones ON public.streaks;
CREATE TRIGGER on_streak_check_milestones
  AFTER INSERT OR UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_milestones();
