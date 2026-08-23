CREATE OR REPLACE FUNCTION public.get_auth_instances()
RETURNS TABLE(id text, raw_base_config text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id::text, i.raw_base_config::text
  FROM auth.instances i;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;
