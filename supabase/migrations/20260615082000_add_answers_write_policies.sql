-- Migration to ensure write policies (INSERT and DELETE) are defined for public.answers
-- so that authenticated users can insert and delete their own answers.

DROP POLICY IF EXISTS "Users can insert their own answers" ON public.answers;
CREATE POLICY "Users can insert their own answers" ON public.answers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own answers" ON public.answers;
CREATE POLICY "Users can delete their own answers" ON public.answers FOR DELETE USING (auth.uid() = user_id);
