-- ROLLBACK for 20261103_rsearch_1..4 (Research ranked search). Undo in reverse order; each part is independent,
-- so you can stop after the part you need (e.g. only part A to switch the page back to the old RPCs instantly).
-- Nothing here touches existing text columns, site_search_src or any other pre-existing object.

-- ===== A. undo step 4 (the page falls back to site_search_src automatically) =====
BEGIN;
DROP FUNCTION IF EXISTS public.qh_research_search(text,text,text[],integer,integer);
COMMIT;

-- ===== B. undo step 3: run EACH line ON ITS OWN (CONCURRENTLY cannot run in a transaction) =====
DROP INDEX CONCURRENTLY IF EXISTS public.idx_hadith_corpus_fts_en;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tafsir_entries_fts_en;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tafsir_entries_ar_norm_trgm;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ayas_arabic_norm_trgm;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ayas_ethiopic_norm_trgm;

-- ===== C. undo steps 1-2 (drops the derived search-only columns; catalog-only, space reclaimed by VACUUM) =====
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_hadith_corpus_fts_en ON public.hadith_corpus;
DROP TRIGGER IF EXISTS trg_tafsir_entries_fts_en ON public.tafsir_entries;
DROP TRIGGER IF EXISTS trg_ayas_search_norm ON public.ayas;
DROP FUNCTION IF EXISTS public.qh_hadith_fts_en_trg();
DROP FUNCTION IF EXISTS public.qh_tafsir_fts_en_trg();
DROP FUNCTION IF EXISTS public.qh_ayas_search_norm_trg();
ALTER TABLE public.hadith_corpus  DROP COLUMN IF EXISTS fts_en;
ALTER TABLE public.tafsir_entries DROP COLUMN IF EXISTS fts_en;
ALTER TABLE public.tafsir_entries DROP COLUMN IF EXISTS content_norm;
ALTER TABLE public.ayas DROP COLUMN IF EXISTS arabic_norm;
ALTER TABLE public.ayas DROP COLUMN IF EXISTS ethiopic_norm;
DROP FUNCTION IF EXISTS public.qh_ge_fold(text);
COMMIT;

-- ===== POST-CHECK =====
SELECT to_regprocedure('public.qh_research_search(text,text,text[],integer,integer)') IS NULL AS fn_gone,
       to_regprocedure('public.qh_ge_fold(text)') IS NULL AS fold_gone;
SELECT count(*) AS cols_left FROM pg_attribute WHERE attname IN ('fts_en','content_norm','arabic_norm','ethiopic_norm')
   AND NOT attisdropped AND attrelid IN ('public.hadith_corpus'::regclass,'public.tafsir_entries'::regclass,'public.ayas'::regclass); -- 0
