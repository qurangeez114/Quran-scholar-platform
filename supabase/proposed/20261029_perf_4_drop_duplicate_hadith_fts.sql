-- PROPOSED — NOT APPLIED. Perf item 9: drop a duplicate full-text index on hadith_corpus (2026-10-29).
-- Two indexes have the identical definition gin (to_tsvector('english', text_english)):
--   idx_hadith_corpus_text_en  37 MB, idx_scan = 0   <- dropped here
--   idx_hadith_text_fts        39 MB, idx_scan = 76  <- kept (the planner already uses this one)
-- Effect: ~37 MB less storage and less write work on every hadith_corpus insert/update. No read speed change.
-- RUN OUTSIDE A TRANSACTION (DROP INDEX CONCURRENTLY; no lock that blocks reads or writes).

-- ===== PRE-CHECK (read-only) =====
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes WHERE indexrelname IN ('idx_hadith_corpus_text_en','idx_hadith_text_fts');
-- expect both rows; idx_hadith_corpus_text_en idx_scan = 0
SELECT pg_get_indexdef('public.idx_hadith_corpus_text_en'::regclass) = replace(pg_get_indexdef('public.idx_hadith_text_fts'::regclass),'idx_hadith_text_fts','idx_hadith_corpus_text_en') AS identical;  -- expect true
SELECT conname FROM pg_constraint WHERE conindid = 'public.idx_hadith_corpus_text_en'::regclass;  -- expect 0 rows

-- ===== CHANGE (outside a transaction) =====
DROP INDEX CONCURRENTLY IF EXISTS public.idx_hadith_corpus_text_en;

-- ===== POST-CHECK (read-only) =====
SELECT count(*) FROM pg_class WHERE relname = 'idx_hadith_corpus_text_en';   -- expect 0
EXPLAIN SELECT id FROM hadith_corpus WHERE to_tsvector('english', text_english) @@ to_tsquery('english','jizya');
-- expect: Bitmap Heap Scan on hadith_corpus -> Bitmap Index Scan on idx_hadith_text_fts
