-- Policies for public.streaks (allows admin to SELECT all streaks)
DROP POLICY IF EXISTS "Admin can view all streaks" ON public.streaks;
CREATE POLICY "Admin can view all streaks" ON public.streaks
  FOR SELECT TO authenticated USING (public.is_admin());
