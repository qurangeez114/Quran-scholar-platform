-- ROLLBACK for the 20261030_arnorm_* proposals (2026-10-30). Run only the parts for steps that were applied, in this order.

-- Undo 4 (view + site_search_src), in a transaction. The view must lose the column BEFORE step 1 can drop it.
--   a) site_search_src: paste 20261029_perf_site_search_src_ORIGINAL.sql (live original, md5 5a80601ce832e42993eb64822662fab0)
--      or 20261029_perf_2_site_search_src.sql (if you want to keep PR #61's version) and run it.
--   b) Then the view. CREATE OR REPLACE cannot remove a column, so drop and re-create it with the dependent views:
--      the views hadith_attestation and hadith_ambiguous_citations depend on it. Easiest safe option: LEAVE the extra
--      column in the view (harmless once site_search_src no longer reads it) and skip step 1's DROP COLUMN.

-- Undo 3 (index) — alone, outside a transaction; also use this if a CONCURRENTLY build failed (INVALID index):
DROP INDEX CONCURRENTLY IF EXISTS public.idx_hadith_corpus_text_arabic_norm_trgm;

-- Undo 1 (trigger + functions; keep the column if the view still has it, see 4b):
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_hadith_corpus_ar_norm ON public.hadith_corpus;
DROP FUNCTION IF EXISTS public.hadith_corpus_ar_norm_trg();
-- Only if site_search_src no longer calls it (step 4 undone):
DROP FUNCTION IF EXISTS public.hadith_ar_norm(text);
COMMIT;

-- Undo 1+2 (the column and its back-filled data). Only after the view no longer exposes it (4b), otherwise it errors:
-- ALTER TABLE public.hadith_corpus DROP COLUMN IF EXISTS text_arabic_norm;   -- catalog-only, instant; space is reclaimed gradually
