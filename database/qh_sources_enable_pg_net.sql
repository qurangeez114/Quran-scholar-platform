-- Applied to QuranHikma Supabase as migration qh_sources_enable_pg_net_20261104
-- Required for secure pg_cron -> Edge Function invocation; no job scheduled by this statement.
create extension if not exists pg_net with schema extensions;
