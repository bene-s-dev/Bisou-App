-- Add last_nudge_at and nudge_count to profiles to track and enforce cooldowns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_nudge_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nudge_count INT DEFAULT 0;
