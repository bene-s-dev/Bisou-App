-- Add missing UPDATE policy on public.answers to allow upserts without 403 Forbidden errors
DROP POLICY IF EXISTS "Users can update their own answers" ON public.answers;

CREATE POLICY "Users can update their own answers" 
ON public.answers FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
