CREATE OR REPLACE FUNCTION public.get_auth_triggers()
RETURNS TABLE(schema_name text, table_name text, trigger_name text, action_statement text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    event_object_schema::text, 
    event_object_table::text, 
    trigger_name::text, 
    action_statement::text
  FROM information_schema.triggers
  WHERE event_object_schema IN ('auth', 'public');
$$;
