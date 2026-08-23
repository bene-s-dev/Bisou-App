CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE(schemaname text, tablename text, policyname text, permissive text, roles text[], cmd text, qual text, with_check text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    schemaname::text, 
    tablename::text, 
    policyname::text, 
    permissive::text, 
    roles::text[], 
    cmd::text, 
    qual::text, 
    with_check::text
  FROM pg_policies
  WHERE schemaname = 'public';
$$;
