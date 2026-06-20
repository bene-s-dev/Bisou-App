-- Create is_admin helper function checking for Bene's exact User ID
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = '438bce53-5c85-4035-82a1-d6fbd23bc1e8';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies for public.daily_questions
DROP POLICY IF EXISTS "Admin can manage daily_questions" ON public.daily_questions;
CREATE POLICY "Admin can manage daily_questions" ON public.daily_questions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Policies for public.announcements
DROP POLICY IF EXISTS "Admin can manage announcements" ON public.announcements;
CREATE POLICY "Admin can manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Policies for public.failed_generations
DROP POLICY IF EXISTS "Admin can manage failed_generations" ON public.failed_generations;
CREATE POLICY "Admin can manage failed_generations" ON public.failed_generations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Policies for public.answers (allows admin to SELECT all answers for dashboard stats)
DROP POLICY IF EXISTS "Admin can view all answers" ON public.answers;
CREATE POLICY "Admin can view all answers" ON public.answers
  FOR SELECT TO authenticated USING (public.is_admin());
