-- Rename onboarding_completed to intro_completed
ALTER TABLE public.profiles 
RENAME COLUMN onboarding_completed TO intro_completed;
