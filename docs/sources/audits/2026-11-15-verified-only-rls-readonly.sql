-- QuranHikma Sources: READ-ONLY security and coverage audit, 2026-11-15.
-- Run as an authorized database administrator; does not change production.
-- The browser's verified-only filter is NOT a security boundary.
-- A SELECT policy USING (true) on ancient_sources can disclose staged rows
-- directly through PostgREST even if the Sources UI hides them.
-- Inspect before any migration: do not drop policies blindly.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('ancient_sources','qh_source_screening_drafts','qh_source_work_queue');
SELECT tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
AND tablename IN ('ancient_sources','qh_source_screening_drafts','qh_source_work_queue')
ORDER BY tablename,policyname;
SELECT table_name,grantee,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
AND table_name IN ('ancient_sources','qh_source_screening_drafts','qh_source_work_queue')
AND grantee IN ('anon','authenticated','PUBLIC')
ORDER BY table_name,grantee,privilege_type;
-- Counts are not equivalent to an editorial or public verification audit.
SELECT verification_status,count(*) AS rows
FROM public.ancient_sources GROUP BY verification_status
ORDER BY verification_status;
SELECT state,count(*) AS rows
FROM public.qh_source_work_queue GROUP BY state ORDER BY state;
SELECT count(*) AS unverified_ai_drafts FROM public.qh_source_screening_drafts;
-- Missing, duplicate, and noncanonical queue keys (canonical verse corpus).
SELECT count(*) AS missing_queue_keys
FROM public.ayas a LEFT JOIN public.qh_source_work_queue q
ON q.sura=a.sura_id AND q.aya=a.aya_number
WHERE a.sura_id BETWEEN 1 AND 114 AND q.sura IS NULL;
SELECT count(*) AS orphan_queue_keys
FROM public.qh_source_work_queue q LEFT JOIN public.ayas a
ON a.sura_id=q.sura AND a.aya_number=q.aya
WHERE a.sura_id IS NULL;
-- Interpret outcomes: if anon/authenticated can SELECT all ancient_sources
-- via USING(true), stop public exposure before publishing more candidates.
-- Fix requires a separately reviewed RLS migration, tested as anon and
-- authenticated, and verifying RPC/view/function paths do not bypass RLS.
-- GitHub draft PR screenings are NOT represented by queue state alone.
