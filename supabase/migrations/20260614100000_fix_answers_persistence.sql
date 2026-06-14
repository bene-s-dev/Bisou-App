-- ==========================================
-- MIGRATION: Fix Answers Persistence
-- ==========================================

-- 1. Ensure the UNIQUE constraint is correct.
-- If it was accidentally set to just user_id, it would overwrite every day.
-- It MUST be (user_id, day_key).

DO $$ 
BEGIN
    -- Check if a wrong unique constraint exists (e.g. only on user_id)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'answers_user_id_key'
    ) THEN
        ALTER TABLE public.answers DROP CONSTRAINT answers_user_id_key;
    END IF;

    -- Ensure our target composite unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'answers_user_id_day_key_key' 
        OR conname = 'answers_unique_user_day'
    ) THEN
        -- We try to add it. If there are duplicates, this might fail, 
        -- but answers should already be clean if user only sees $N$ rows.
        ALTER TABLE public.answers ADD CONSTRAINT answers_user_id_day_key_key UNIQUE (user_id, day_key);
    END IF;
END $$;

-- 2. Double check RLS for history access
DROP POLICY IF EXISTS "Users can view their own answers" ON public.answers;
DROP POLICY IF EXISTS "Users can view their partner's answers" ON public.answers;

CREATE POLICY "Users can view their own answers" ON public.answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their partner's answers" ON public.answers FOR SELECT USING (user_id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Update comments to clarify persistence
COMMENT ON TABLE public.answers IS 'Stores user answers per day. History is kept for statistics and variety.';
