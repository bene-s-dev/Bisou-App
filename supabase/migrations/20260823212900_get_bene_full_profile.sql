CREATE OR REPLACE FUNCTION public.get_bene_full_profile()
RETURNS TABLE(
  profile_id uuid,
  display_name text,
  partner_id uuid,
  partner_name text,
  answers_count bigint,
  streaks_count bigint
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.partner_id,
    part.display_name,
    (SELECT count(*) FROM public.answers a WHERE a.user_id = p.id),
    (SELECT count(*) FROM public.streaks s WHERE s.user_id = p.id)
  FROM public.profiles p
  LEFT JOIN public.profiles part ON part.id = p.partner_id
  WHERE p.id = '438bce53-5c85-4035-82a1-d6fbd23bc1e8';
$$;
