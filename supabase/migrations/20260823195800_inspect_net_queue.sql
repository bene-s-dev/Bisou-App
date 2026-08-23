CREATE OR REPLACE FUNCTION public.get_net_queue_stats()
RETURNS TABLE(tbl text, row_count bigint)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'net.http_request_queue'::text, count(*) FROM net.http_request_queue
  UNION ALL
  SELECT 'net._http_response'::text, count(*) FROM net._http_response;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;
