CREATE OR REPLACE FUNCTION public.get_webhooks()
RETURNS TABLE(id bigint, hook_table text, hook_event text, hook_type text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.table_name::text, h.event::text, h.hook_type::text
  FROM supabase_functions.hooks h;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;
