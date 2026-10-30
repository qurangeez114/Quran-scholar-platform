-- ROLLBACK for the 20261029_perf_* proposals. Run only the sections for files that were applied.
-- Index statements must run OUTSIDE a transaction, one at a time.

-- Undo 1 (Arabic trigram index) — also use this if a CONCURRENTLY build failed and left an INVALID index:
DROP INDEX CONCURRENTLY IF EXISTS public.idx_hadith_corpus_text_arabic_trgm;

-- Undo 3 (tafsir scope index):
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tafsir_language_scholar_name;

-- Undo 4 (re-create the dropped duplicate FTS index, identical definition):
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadith_corpus_text_en
  ON public.hadith_corpus USING gin (to_tsvector('english'::regconfig, text_english));

-- Undo 2 (site_search_src): run the original definition, captured verbatim on 2026-10-29, in a transaction:
--   BEGIN;  \i 20261029_perf_site_search_src_ORIGINAL.sql  COMMIT;
-- (In the Supabase SQL editor: paste the contents of 20261029_perf_site_search_src_ORIGINAL.sql and run.)
-- Check afterwards: SELECT md5(pg_get_functiondef('public.site_search_src'::regproc));  -- 5a80601ce832e42993eb64822662fab0
