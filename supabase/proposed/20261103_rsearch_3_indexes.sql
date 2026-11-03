-- PROPOSED — NOT APPLIED. Research ranked search, step 3 of 4: indexes (2026-11-03).
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction: run EACH statement ON ITS OWN in the SQL Editor.
-- Reads and writes continue while each index builds. If one fails it leaves an INVALID index: drop it
--   (DROP INDEX CONCURRENTLY <name>;) and re-run that statement.
-- Requires steps 1-2. Additive only.

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) FILTER (WHERE fts_en IS NULL) AS must_be_0 FROM public.hadith_corpus;
SELECT to_regclass('public.idx_hadith_corpus_fts_en'), to_regclass('public.idx_tafsir_entries_fts_en'),
       to_regclass('public.idx_tafsir_entries_ar_norm_trgm'), to_regclass('public.idx_ayas_arabic_norm_trgm'),
       to_regclass('public.idx_ayas_ethiopic_norm_trgm');                             -- expect 5 x NULL

-- 1. English ranked hadith search (index on the new tsvector column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadith_corpus_fts_en ON public.hadith_corpus USING gin (fts_en);

-- 2. English ranked tafsir search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tafsir_entries_fts_en ON public.tafsir_entries USING gin (fts_en)
  WHERE language = 'en';

-- 3. Diacritic-insensitive Arabic and folded Tigrinya tafsir (23,288 ar + 408 ti rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tafsir_entries_ar_norm_trgm ON public.tafsir_entries
  USING gin (content_norm gin_trgm_ops) WHERE language IN ('ar','ti');

-- 4./5. Quran Arabic and Tigrinya/Amharic (6,236 rows; small, builds in seconds)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ayas_arabic_norm_trgm ON public.ayas USING gin (arabic_norm gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ayas_ethiopic_norm_trgm ON public.ayas USING gin (ethiopic_norm gin_trgm_ops);

-- ===== POST-CHECK (read-only) =====
SELECT indexrelid::regclass, indisvalid FROM pg_index
 WHERE indexrelid IN ('public.idx_hadith_corpus_fts_en'::regclass,'public.idx_tafsir_entries_fts_en'::regclass,
                      'public.idx_tafsir_entries_ar_norm_trgm'::regclass,'public.idx_ayas_arabic_norm_trgm'::regclass,
                      'public.idx_ayas_ethiopic_norm_trgm'::regclass);              -- expect 5 rows, all true
