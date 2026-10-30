-- PROPOSED — NOT APPLIED. Arabic-normalised hadith search, step 2 of 4: batched back-fill (2026-10-30).
-- Fills text_arabic_norm for the existing 119,748 rows (ids 1-119754) in 24 batches of 5,000 ids.
-- Each batch is its own short transaction (BEGIN ... COMMIT), so a failure only loses that batch and
--   row locks are held for seconds, not minutes. Safe to re-run: every batch only touches rows still NULL.
-- HOW TO RUN: run GROUP A (paste from "GROUP A" to "END GROUP A"), then run the VACUUM line ON ITS OWN,
--   then GROUP B + VACUUM, C + VACUUM, D + VACUUM. VACUUM cannot run inside a transaction or together with
--   other statements. Vacuuming between groups lets later batches reuse the space freed by earlier ones
--   (every UPDATE writes a new row version and new entries in all 11 existing indexes).
-- Estimated (NOT measured as a write): normalising costs ~0.8 ms/row (read-only timing, 3,000 rows in 2.4 s),
--   i.e. ~4 s CPU per batch; with index maintenance (incl. the 136 MB English trigram GIN) expect ~10-40 s per
--   batch, ~5-15 min in total. Each batch sets statement_timeout = 120s.
-- Locks: ROW EXCLUSIVE on the table + row locks on the 5,000 rows being updated. Reads are never blocked;
--   an edit to one of those rows waits a few seconds. Run at a quiet time.
-- Expected growth: ~70 MB of normalised text (61% of 119 MB raw Arabic bytes, before compression), plus
--   temporary dead row versions/index entries until VACUUM (bounded to ~1/4 of the table by the groups).

-- ===== PRE-CHECK (read-only) =====
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_hadith_corpus_ar_norm';   -- expect 1 row (step 1 applied)
SELECT count(*) FILTER (WHERE text_arabic_norm IS NULL AND text_arabic IS NOT NULL) AS todo,
       min(id), max(id) FROM public.hadith_corpus;                           -- was todo ~119,339, ids 1-119754


-- ===== GROUP A =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 1 AND 5000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 5001 AND 10000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 10001 AND 15000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 15001 AND 20000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 20001 AND 25000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 25001 AND 30000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
-- ===== END GROUP A =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP B =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 30001 AND 35000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 35001 AND 40000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 40001 AND 45000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 45001 AND 50000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 50001 AND 55000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 55001 AND 60000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
-- ===== END GROUP B =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP C =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 60001 AND 65000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 65001 AND 70000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 70001 AND 75000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 75001 AND 80000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 80001 AND 85000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 85001 AND 90000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
-- ===== END GROUP C =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP D =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 90001 AND 95000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 95001 AND 100000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 100001 AND 105000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 105001 AND 110000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 110001 AND 115000 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET text_arabic_norm = public.hadith_ar_norm(text_arabic)
 WHERE id BETWEEN 115001 AND 999999999 AND text_arabic IS NOT NULL AND text_arabic_norm IS NULL;
COMMIT;
-- ===== END GROUP D =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== POST-CHECK (read-only) =====
SELECT count(*) FILTER (WHERE text_arabic IS NOT NULL AND text_arabic_norm IS NULL) AS missing,       -- expect 0
       count(*) FILTER (WHERE text_arabic_norm IS DISTINCT FROM public.hadith_ar_norm(text_arabic)) AS stale  -- expect 0
FROM public.hadith_corpus;
SELECT pg_size_pretty(pg_table_size('public.hadith_corpus')) AS table_size,   -- was 318 MB on 2026-10-30
       n_dead_tup FROM pg_stat_user_tables WHERE relid = 'public.hadith_corpus'::regclass;
