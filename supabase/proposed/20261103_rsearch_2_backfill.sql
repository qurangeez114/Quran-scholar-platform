-- PROPOSED — NOT APPLIED. Research ranked search, step 2 of 4: batched back-fill of the search-only fts_en columns (2026-11-03).
-- Fills hadith_corpus.fts_en (119,748 rows, ids 1-119754), tafsir_entries.fts_en / content_norm (31,296 en + 23,288 ar
--   + 408 ti rows, ids 1-56204) and ayas.arabic_norm / ethiopic_norm (6,236 rows, one statement)
--   in batches of 5,000 ids. Each batch is its own short transaction; safe to re-run (only rows still NULL are touched).
-- No text column is modified: only the new derived tsvector column is written. Same pattern as #66 file 2.
-- HOW TO RUN: run GROUP A, then the VACUUM line ON ITS OWN, then GROUP B + VACUUM, etc.
-- Estimated (NOT measured as a write): to_tsvector costs well under 1 ms/row; with index maintenance expect
--   ~10-40 s per hadith batch, ~10-20 min in total. Each batch sets statement_timeout = 120s. Run at a quiet time.
-- Locks: ROW EXCLUSIVE + row locks on the batch. Reads are never blocked.
-- Expected growth: roughly 60-120 MB of tsvector data (estimate) plus temporary dead tuples until VACUUM.

-- ===== PRE-CHECK (read-only) =====
SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_hadith_corpus_fts_en','trg_tafsir_entries_fts_en','trg_ayas_search_norm'); -- expect 3 rows (step 1)
SELECT count(*) FILTER (WHERE fts_en IS NULL) AS hadith_todo FROM public.hadith_corpus;                 -- ~119,748
SELECT count(*) FILTER (WHERE fts_en IS NULL AND language='en') AS tafsir_todo FROM public.tafsir_entries; -- ~31,296

-- ===== GROUP A (hadith_corpus) =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 1 AND 5000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 5001 AND 10000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 10001 AND 15000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 15001 AND 20000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 20001 AND 25000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 25001 AND 30000 AND fts_en IS NULL;
COMMIT;
-- ===== END GROUP A =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP B (hadith_corpus) =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 30001 AND 35000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 35001 AND 40000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 40001 AND 45000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 45001 AND 50000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 50001 AND 55000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 55001 AND 60000 AND fts_en IS NULL;
COMMIT;
-- ===== END GROUP B =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP C (hadith_corpus) =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 60001 AND 65000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 65001 AND 70000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 70001 AND 75000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 75001 AND 80000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 80001 AND 85000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 85001 AND 90000 AND fts_en IS NULL;
COMMIT;
-- ===== END GROUP C =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP D (hadith_corpus) =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 90001 AND 95000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 95001 AND 100000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 100001 AND 105000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 105001 AND 110000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 110001 AND 115000 AND fts_en IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.hadith_corpus SET fts_en = to_tsvector('english', coalesce(text_english, ''))
 WHERE id BETWEEN 115001 AND 120000 AND fts_en IS NULL;
COMMIT;
-- ===== END GROUP D =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.hadith_corpus;

-- ===== GROUP E (ayas: 6,236 short rows, one statement) =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.ayas SET arabic_norm = public.hadith_ar_norm(arabic),
       ethiopic_norm = public.qh_ge_fold(concat_ws(' ', tigrinya, aya_text, tigrinya2, amharic))
 WHERE arabic_norm IS NULL AND ethiopic_norm IS NULL;
COMMIT;
-- VACUUM (ANALYZE) public.ayas;   (on its own)

-- ===== GROUP F (tafsir_entries) =====
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 1 AND 5000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 5001 AND 10000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 10001 AND 15000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 15001 AND 20000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 20001 AND 25000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 25001 AND 30000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 30001 AND 35000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 35001 AND 40000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 40001 AND 45000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 45001 AND 50000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 50001 AND 55000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
BEGIN; SET LOCAL statement_timeout = '120s';
UPDATE public.tafsir_entries SET
   fts_en = case when language = 'en' then to_tsvector('english', coalesce(content, '')) end,
   content_norm = case when language = 'ar' then public.hadith_ar_norm(content)
                       when language = 'ti' then public.qh_ge_fold(content) end
 WHERE id BETWEEN 55001 AND 60000 AND language IN ('en','ar','ti') AND fts_en IS NULL AND content_norm IS NULL;
COMMIT;
-- ===== END GROUP F =====
-- then, ON ITS OWN:
-- VACUUM (ANALYZE) public.tafsir_entries;

-- ===== POST-CHECK (read-only) =====
SELECT count(*) FILTER (WHERE fts_en IS NULL) AS hadith_missing FROM public.hadith_corpus;                   -- expect 0
SELECT count(*) FILTER (WHERE (language='en' AND fts_en IS NULL) OR (language IN ('ar','ti') AND content_norm IS NULL)) AS tafsir_missing
  FROM public.tafsir_entries;                                                                           -- expect 0
SELECT count(*) FILTER (WHERE arabic IS NOT NULL AND arabic_norm IS NULL) AS ayas_missing FROM public.ayas;  -- expect 0
