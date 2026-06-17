-- Add dynamic UI control columns to announcements table
ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '✨',
  ADD COLUMN IF NOT EXISTS button_label TEXT DEFAULT 'Verstanden! ✨',
  ADD COLUMN IF NOT EXISTS action_route TEXT DEFAULT NULL;
