-- PROPOSED — NOT APPLIED. Perf item 1a: trigram index on hadith_corpus.text_arabic (2026-10-29).
-- Why: Arabic hadith searches (site_search_src src='hadith' with an Arabic query) run
--   text_arabic ILIKE ANY(...) with no usable index -> Seq Scan on hadith_corpus (559 MB).
--   Measured 2026-10-29: q='الصلاة' -> HTTP 500 after 15.3 s ("canceling statement due to statement timeout").
-- RUN THIS FILE OUTSIDE A TRANSACTION (Supabase SQL editor: run the CREATE statement on its own).
--   CREATE INDEX CONCURRENTLY cannot run inside BEGIN/COMMIT. It builds without taking a write lock,
--   so inserts/updates to hadith_corpus keep working during the build; it takes ~2-3x longer than a
--   plain CREATE INDEX. If it fails part-way it leaves an INVALID index: drop it (see ROLLBACK) and retry.
-- Estimated: size 130-250 MB (text_english trgm index is 136 MB for 47 MB of text; text_arabic is 82 MB),
--   build roughly 3-15 min with maintenance_work_mem=32MB. Both are estimates, not measured.
-- APPLY THIS BEFORE FILE 2, then re-run 20261029_perf_2_site_search_src_TEST_ROLLBACK.sql (its Arabic row is skipped until
--   this index exists). File 2 searches hadith Arabic with the plain column "text_arabic ILIKE ANY(...)", which this
--   gin_trgm_ops index supports directly (checked 2026-10-30; no expression or normalisation in the way).
-- Rollback: 20261029_perf_ROLLBACK.sql  Report: 20261029_perf_REPORT.md

-- ===== PRE-CHECK (read-only) =====
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';             -- expect 1 row (1.6)
SELECT indexrelid::regclass FROM pg_index WHERE indrelid = 'public.hadith_corpus'::regclass
  AND pg_get_indexdef(indexrelid) ILIKE '%text_arabic%';                               -- expect 0 rows
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;               -- was 2821 MB on 2026-10-29
EXPLAIN SELECT 1 FROM hadith_corpus_canonical WHERE text_arabic ILIKE ANY (ARRAY['%الصلاة%']) LIMIT 1000;
-- expect today: Seq Scan on hadith_corpus hc  Filter: (text_arabic ~~* ANY ('{%الصلاة%}'::text[]))

-- ===== CHANGE (outside a transaction) =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadith_corpus_text_arabic_trgm
  ON public.hadith_corpus USING gin (text_arabic gin_trgm_ops);

-- ===== POST-CHECK (read-only) =====
SELECT indexrelid::regclass, indisvalid, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_index WHERE indexrelid = 'public.idx_hadith_corpus_text_arabic_trgm'::regclass;  -- expect indisvalid = true
EXPLAIN SELECT 1 FROM hadith_corpus_canonical WHERE text_arabic ILIKE ANY (ARRAY['%الصلاة%']) LIMIT 1000;
-- expect: Bitmap Heap Scan on hadith_corpus hc
--           -> Bitmap Index Scan on idx_hadith_corpus_text_arabic_trgm
--                Index Cond: (text_arabic ~~* ANY ('{%الصلاة%}'::text[]))
-- (same shape the English path already gets from idx_hadith_corpus_text_english_trgm)
