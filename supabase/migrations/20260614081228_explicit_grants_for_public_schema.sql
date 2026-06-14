-- Grant usage on the public schema
grant usage on schema public to postgres, anon, authenticated, service_role;

-- Grant privileges on all current tables in the public schema
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;

-- Grant privileges on all current functions in the public schema
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;

-- Grant privileges on all current sequences in the public schema
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

-- Alter default privileges for future tables, functions, and sequences
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
