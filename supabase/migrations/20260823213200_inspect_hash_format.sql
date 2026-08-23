CREATE OR REPLACE FUNCTION public.inspect_password_hash_format()
RETURNS TABLE(hash_prefix text, hash_length int)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    SUBSTRING(encrypted_password FROM 1 FOR 4)::text,
    length(encrypted_password)
  FROM auth.users
  WHERE id = '438bce53-5c85-4035-82a1-d6fbd23bc1e8';
$$;
