-- Add is_seen column to unlocked_milestones
ALTER TABLE public.unlocked_milestones 
ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT FALSE;

-- Mark all existing milestones as seen so users don't get spammed with old notifications
UPDATE public.unlocked_milestones SET is_seen = TRUE;

-- Ensure RLS allows updating the is_seen flag for the owner
DROP POLICY IF EXISTS "Allow users to update their own unlocked milestones" ON public.unlocked_milestones;
CREATE POLICY "Allow users to update their own unlocked milestones" 
ON public.unlocked_milestones
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
