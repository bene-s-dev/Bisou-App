-- Clean up stale/revoked auth tokens and analyze auth tables

DELETE FROM auth.refresh_tokens 
WHERE revoked = true 
   OR created_at < now() - interval '30 days';

DELETE FROM auth.sessions 
WHERE (updated_at < now() - interval '30 days' OR not_after < now())
  AND created_at < now() - interval '30 days';

ANALYZE auth.users;
ANALYZE auth.sessions;
ANALYZE auth.refresh_tokens;
