-- Add emoji status columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emoji_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emoji_status_updated_at TIMESTAMP WITH TIME ZONE;
