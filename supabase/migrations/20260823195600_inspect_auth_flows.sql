CREATE OR REPLACE FUNCTION public.get_auth_flow_stats()
RETURNS TABLE(tbl text, row_count bigint)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'auth.identities'::text, count(*) FROM auth.identities
  UNION ALL
  SELECT 'auth.flow_state'::text, count(*) FROM auth.flow_state
  UNION ALL
  SELECT 'auth.mfa_factors'::text, count(*) FROM auth.mfa_factors;
END;
$$;
