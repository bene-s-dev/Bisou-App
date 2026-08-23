CREATE OR REPLACE FUNCTION public.check_email_casing()
RETURNS TABLE(user_id uuid, has_uppercase boolean, domain text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    id, 
    (email <> LOWER(email)),
    split_part(email, '@', 2)
  FROM auth.users;
$$;
