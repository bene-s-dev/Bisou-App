CREATE OR REPLACE FUNCTION public.get_auth_stats()
RETURNS TABLE(tbl text, row_count bigint)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'auth.users'::text, count(*) FROM auth.users
  UNION ALL
  SELECT 'auth.sessions'::text, count(*) FROM auth.sessions
  UNION ALL
  SELECT 'auth.refresh_tokens'::text, count(*) FROM auth.refresh_tokens
  UNION ALL
  SELECT 'auth.audit_log_entries'::text, count(*) FROM auth.audit_log_entries;
END;
$$;
