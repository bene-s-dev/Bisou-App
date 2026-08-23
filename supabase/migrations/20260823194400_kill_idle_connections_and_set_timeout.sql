-- 1. Set automatic timeout for idle in-transaction sessions to 10s
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '10s';

-- 2. Terminate any hung/idle in transaction backend processes
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE pid <> pg_backend_pid() 
  AND state IN ('idle in transaction', 'idle in transaction (aborted)')
  AND now() - query_start > interval '10 seconds';
