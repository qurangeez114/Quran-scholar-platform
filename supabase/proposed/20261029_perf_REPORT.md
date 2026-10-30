# 2026-10-29 database performance proposals — NOT APPLIED

> **Read first**
> - **File 2 (`site_search_src`) has only been parsed, never executed.** The read-only role cannot run `words_match`, so the function has not run on any database. Test it on a staging copy or a Supabase branch before the live database.
> - **The candidate caps limit which results appear, not just how they rank.** Rows beyond a cap are never scored or returned, however relevant they are. See "Result caps" below.
> - **All speedups, index sizes and build times below are estimates** from EXPLAIN plans and catalog sizes. Re-measure after applying.

All measurements below were taken read-only on 2026-10-29 (PT): public REST timings with the anon key, `EXPLAIN` (no `ANALYZE`) and catalog reads via the Management API.

## Problem measurements

| Call | Measured | Cause (from EXPLAIN / function source) |
|---|---|---|
| `site_search_src` hadith, q=`الصلاة` (Arabic) | **HTTP 500 after 15.3 s** (statement timeout; anon = 15 s) | `text_arabic ILIKE ANY` → **Seq Scan** on `hadith_corpus` (559 MB); no index on `text_arabic` |
| `site_search_src` hadith, q=`zzqx nonexistent words here` | **HTTP 500 after 15.5–15.6 s** | no exact match → relaxed fallback regex-scores every row containing *any* word, up to twice |
| `site_search_src` hadith, q=`prayer` | 11.6 s, 9.3 s, 5.8 s (3 runs) | index finds ~16–19k rows; second pass regex-checks and sorts all of them |
| `site_search_src` hadith, q=`women inheritance share` | 9.2 s, 8.5 s | same as above |
| `scope_options()` (every research.html load) | 4.4 s, 5.0 s | `DISTINCT scholar_name … WHERE language='en'` = Seq Scan + HashAggregate on `tafsir_entries` |

Correction to the earlier audit: the English hadith path **does** use `idx_hadith_corpus_text_english_trgm` (Bitmap Index Scan). The Seq Scan only happens for Arabic queries; the function already restricts Arabic queries to Arabic columns, so no column-selection change was needed.

## Files (apply in this order; none applied)

| File | What | Transaction? | Est. size / time |
|---|---|---|---|
| `20261029_perf_1_hadith_arabic_trgm_index.sql` | `CREATE INDEX CONCURRENTLY idx_hadith_corpus_text_arabic_trgm` (gin_trgm_ops) | **No** — CONCURRENTLY cannot run in a transaction | 130–250 MB, ~3–15 min (estimate) |
| `20261029_perf_2_site_search_src.sql` | `CREATE OR REPLACE FUNCTION site_search_src` with a one-pass main path and a relaxed fallback capped at 20,000 candidates | Yes (BEGIN/COMMIT) | instant |
| `20261029_perf_3_tafsir_scope_index.sql` | `CREATE INDEX CONCURRENTLY idx_tafsir_language_scholar_name (language, scholar_name)` | **No** | ~2–3 MB, < 1 min (estimate) |
| `20261029_perf_4_drop_duplicate_hadith_fts.sql` | `DROP INDEX CONCURRENTLY idx_hadith_corpus_text_en` (0 scans; identical to `idx_hadith_text_fts`) | **No** | frees ~37 MB |
| `20261029_perf_ROLLBACK.sql` | Undo for each file | — | — |
| `20261029_perf_site_search_src_ORIGINAL.sql` | Live function definition, verbatim (md5 `5a80601c…`) | — | — |
| `20261029_perf_site_search_src.diff` | Unified diff original → proposed | — | — |

### Why CONCURRENTLY / outside a transaction
`CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` build or drop the index without the write-blocking lock a plain `CREATE INDEX` takes, so the site and any background jobs keep writing to `hadith_corpus` / `tafsir_entries`. PostgreSQL refuses to run them inside `BEGIN … COMMIT`. In the Supabase SQL editor, run each CONCURRENTLY statement on its own. If a build is interrupted it leaves an INVALID index: drop it with the ROLLBACK statement and retry.

## Expected plans (validated with EXPLAIN on the live DB where possible)

- **Arabic search, after file 1** (expected, cannot EXPLAIN an index that does not exist): `Bitmap Heap Scan on hadith_corpus → Bitmap Index Scan on idx_hadith_corpus_text_arabic_trgm, Index Cond: (text_arabic ~~* ANY (...))` — the same shape the English column already gets.
- **New main path, file 2** (EXPLAINed live with the regex inlined, since the read-only role cannot execute `words_match`): `CTE cand → Limit → Bitmap Heap Scan via idx_hadith_corpus_text_english_trgm`; the sort runs over the CTE only (≤ 1000 rows).
- **New relaxed fallback, file 2** (EXPLAINed live): `Limit → Bitmap Index Scan idx_hadith_corpus_text_english_trgm`, then the score SubPlan and a Sort/WindowAgg over at most 20,000 rows. Re-checked with EXPLAIN on 2026-10-29: for `prayer`/`women` the planner estimates 18,435 candidate rows, so with the 20,000 cap the whole candidate set is scored (cost 15,852 vs 2,704 at the old 3,000 cap, about 6×).
- **scope_options, after file 3** (expected): `Unique → Index Only Scan using idx_tafsir_language_scholar_name, Index Cond: (language = 'en')`.
- The proposed function body was parsed with the PostgreSQL parser (`pglast.parse_plpgsql`) — OK. It has not been executed anywhere.

## Expected impact (estimates — re-measure after applying)
- Arabic hadith search: from timeout (500) to an index lookup; should be well under the 15 s limit.
- No-match / multi-word hadith search: bounded work (≤ 20,000 rows) instead of an unbounded double pass. **Not guaranteed to stay under the 15 s anon timeout**: the old code took 5.8–11.6 s to regex-sort ~16k rows, and the fallback now scores up to 20,000 rows once. Test the worst case (common words plus a nonsense word) on staging.
- "prayer"-type searches: one bounded pass instead of regex-sorting all ~16k matches.
- research.html: `scope_options` should drop from ~4.5 s to a fast index-only scan.

## Risks
- Index build adds load and 130–250 MB of disk (DB is 2,821 MB). Run off-peak.
- **Result caps in file 2 (these change which results appear, not just their order):**
  - *Relaxed fallback:* only the first **20,000** index-matched candidates (in physical table order, not relevance order) are scored. A relevant row outside them never appears. The earlier draft used 3,000, which would have silently dropped most results for common words. 20,000 is above the ~16–19k matches measured for `prayer`, so in practice little or nothing is excluded today. When the cap is hit, the response includes `"relaxed_capped": true`, a new additive JSON key, so the UI can warn that results may be incomplete. The UI does not read this key yet.
  - *Main path:* rows are sorted only within the first 1,000 exact matches. That is unchanged from before, where the count was already capped at 1,000 and the UI shows "capped". For words with more than 1,000 matches, a better-ranked row beyond the first 1,000 can be missing from the top results.
  - Trade-off: a higher cap means more complete results but more work per no-exact-match query. If staging shows timeouts, lower `relax_cap` (one constant in the function), accepting more hidden results.
- Trigram index only accelerates literal substring matches. Arabic text with diacritics still needs the query to match the stored spelling (unchanged behaviour).
- `site_search_src` serves all research sources (quran, tafsir, books, …); file 2 changes the same two code paths for each of them. Spot-check a few sources after applying.
