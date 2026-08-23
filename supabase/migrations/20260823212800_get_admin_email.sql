CREATE OR REPLACE FUNCTION public.get_admin_email_info()
RETURNS TABLE(user_id uuid, email text, display_name text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT u.id, u.email::text, p.display_name::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = '438bce53-5c85-4035-82a1-d6fbd23bc1e8'
     OR LOWER(p.display_name) = 'bene';
$$;
