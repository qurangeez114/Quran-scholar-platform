-- PROPOSED — NOT APPLIED. Perf item 2: index for scope_options() (2026-10-29).
-- scope_options() runs on every research.html visit; measured 4.4 s and 5.0 s on 2026-10-29.
-- Its tafsir part is: SELECT DISTINCT scholar_name FROM tafsir_entries WHERE language='en' (11 names),
--   which today is a Seq Scan + HashAggregate over tafsir_entries (54,578 rows).
-- Chosen over a precompute table because it needs no refresh logic and no function change.
-- RUN OUTSIDE A TRANSACTION (CREATE INDEX CONCURRENTLY; no write lock on tafsir_entries).
-- Estimated: size ~2-3 MB (language+scholar_name data is 1.1 MB), build < 1 min. Estimates, not measured.

-- ===== PRE-CHECK (read-only) =====
SELECT indexrelid::regclass FROM pg_index WHERE indrelid='public.tafsir_entries'::regclass
  AND pg_get_indexdef(indexrelid) ILIKE '%(language, scholar_name)%';     -- expect 0 rows
EXPLAIN SELECT DISTINCT scholar_name FROM tafsir_entries WHERE language='en' AND scholar_name IS NOT NULL;
-- expect today: HashAggregate -> Seq Scan on tafsir_entries Filter: (language = 'en'::text)

-- ===== CHANGE (outside a transaction) =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tafsir_language_scholar_name
  ON public.tafsir_entries USING btree (language, scholar_name);

-- ===== POST-CHECK (read-only) =====
SELECT indisvalid FROM pg_index WHERE indexrelid='public.idx_tafsir_language_scholar_name'::regclass;  -- expect true
ANALYZE public.tafsir_entries;  -- optional: statistics only, no data change (skip if strictly read-only)
EXPLAIN SELECT DISTINCT scholar_name FROM tafsir_entries WHERE language='en' AND scholar_name IS NOT NULL;
-- expect: Unique -> Index Only Scan using idx_tafsir_language_scholar_name on tafsir_entries
--           Index Cond: (language = 'en'::text)
-- Then time POST /rest/v1/rpc/scope_options {}  (before: 4.4-5.0 s)
