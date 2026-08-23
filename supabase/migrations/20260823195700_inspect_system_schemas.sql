CREATE OR REPLACE FUNCTION public.get_auth_schema_info()
RETURNS TABLE(schemaname text, tablename text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT schemaname::text, tablename::text
  FROM pg_tables
  WHERE schemaname IN ('auth', 'supabase_auth', 'supabase_functions', 'extensions', 'net');
$$;
