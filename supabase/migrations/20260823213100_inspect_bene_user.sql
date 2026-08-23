CREATE OR REPLACE FUNCTION public.inspect_bene_user()
RETURNS TABLE(
  user_id uuid,
  email text,
  has_password boolean,
  confirmed boolean,
  provider text,
  last_sign_in timestamptz
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    id, 
    email::text, 
    (encrypted_password IS NOT NULL AND length(encrypted_password) > 0),
    (confirmed_at IS NOT NULL),
    raw_app_meta_data->>'provider',
    last_sign_in_at
  FROM auth.users
  WHERE id = '438bce53-5c85-4035-82a1-d6fbd23bc1e8';
$$;
