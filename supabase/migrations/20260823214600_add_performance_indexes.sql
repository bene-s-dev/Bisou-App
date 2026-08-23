-- Performance Indexes for High Scale & Future Proofing
CREATE INDEX IF NOT EXISTS idx_answers_user_day ON public.answers(user_id, day_key);
CREATE INDEX IF NOT EXISTS idx_answers_day_key ON public.answers(day_key);
CREATE INDEX IF NOT EXISTS idx_streaks_user_partner ON public.streaks(user_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_code ON public.profiles(partner_code);
