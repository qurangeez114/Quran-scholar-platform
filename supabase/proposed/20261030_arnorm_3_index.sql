-- PROPOSED — NOT APPLIED. Arabic-normalised hadith search, step 3 of 4: trigram index (2026-10-30).
-- RUN THE CREATE STATEMENT ON ITS OWN, OUTSIDE A TRANSACTION (CONCURRENTLY cannot run inside BEGIN/COMMIT,
--   nor together with other statements in one SQL Editor run).
-- Locks: SHARE UPDATE EXCLUSIVE only: reads and writes continue during the build. If it fails it leaves an
--   INVALID index: DROP INDEX CONCURRENTLY IF EXISTS public.idx_hadith_corpus_text_arabic_norm_trgm; and retry.
-- Estimated (not measured): 120-220 MB (the English trigram index is 136 MB for 47 MB of text; normalised
--   Arabic is ~70 MB with a smaller alphabet), build ~3-15 min at maintenance_work_mem = 32MB.
--   Optionally run  SET maintenance_work_mem = '256MB';  in the same editor tab first to speed it up.
-- Run only after step 2's post-check shows missing = 0.

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) FILTER (WHERE text_arabic IS NOT NULL AND text_arabic_norm IS NULL) AS missing
FROM public.hadith_corpus;                                                    -- expect 0
SELECT to_regclass('public.idx_hadith_corpus_text_arabic_norm_trgm') AS idx;  -- expect NULL

-- ===== CHANGE (alone, outside a transaction) =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadith_corpus_text_arabic_norm_trgm
  ON public.hadith_corpus USING gin (text_arabic_norm gin_trgm_ops);

-- ===== POST-CHECK (read-only) =====
SELECT indexrelid::regclass, indisvalid, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_index WHERE indexrelid = 'public.idx_hadith_corpus_text_arabic_norm_trgm'::regclass;  -- expect indisvalid = true
EXPLAIN SELECT 1 FROM public.hadith_corpus WHERE text_arabic_norm ILIKE ANY (ARRAY['%الصلاه%']) LIMIT 1000;
-- expect: Bitmap Index Scan on idx_hadith_corpus_text_arabic_norm_trgm
