CREATE OR REPLACE FUNCTION public.check_user_status()
RETURNS TABLE(user_id uuid, email_preview text, is_confirmed boolean, is_banned boolean)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    id, 
    LOWER(SUBSTRING(email FROM 1 FOR 3)) || '***@' || split_part(email, '@', 2),
    (confirmed_at IS NOT NULL),
    (banned_until IS NOT NULL AND banned_until > now())
  FROM auth.users;
$$;
