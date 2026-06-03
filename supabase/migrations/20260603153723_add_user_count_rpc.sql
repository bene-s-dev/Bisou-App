CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS integer AS $$
DECLARE
  total_users integer;
BEGIN
  SELECT count(*) INTO total_users FROM public.profiles;
  RETURN total_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
