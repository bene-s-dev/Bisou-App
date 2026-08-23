-- Comprehensive Database Audit Helper
CREATE OR REPLACE FUNCTION public.audit_db_health()
RETURNS TABLE(
  tablename text,
  has_rls boolean,
  policy_count bigint,
  index_count bigint
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    t.tablename::text,
    t.rowsecurity as has_rls,
    (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tablename) as policy_count,
    (SELECT count(*) FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = t.tablename) as index_count
  FROM pg_tables t
  WHERE t.schemaname = 'public';
$$;
