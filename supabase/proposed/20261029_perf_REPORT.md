# 2026-10-29 database performance proposals — NOT APPLIED (revised 2026-10-30)

> **Read first**
> - **Order: file 1 → re-run the test → file 2.** Apply file 1 (CONCURRENTLY, on its own, outside a transaction), confirm `indisvalid = true`, then run `20261029_perf_2_site_search_src_TEST_ROLLBACK.sql`, and apply file 2 only if every row passes. Without file 1 the Arabic test row is skipped (it cannot pass: a sequential scan of `hadith_corpus` took 22 s).
> - **File 2 rev 2026-10-30 has been parsed but not executed.** The first revision was tested by the owner on 2026-10-30 inside a rolled-back transaction: 6/8 passed, `الصلاة` and `zzqx nonexistent words here` hit the 15 s timeout (see "2026-10-30 test failure" below). The new revision's generated queries were timed read-only (EXPLAIN ANALYZE of plain SELECTs), not the function itself.
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

## 2026-10-30 test failure: root causes and fixes

**1. `الصلاة` (Arabic) timed out — cause: file 1 not applied yet.** For `src='hadith'` the function's predicate is the plain column `text_arabic ILIKE ANY($1)` (diacritic stripping is only used for `quran`/`library`), which is exactly what `gin (text_arabic gin_trgm_ops)` supports — the English column already gets this plan from its identical index. Measured read-only: `SELECT count(*) … WHERE text_arabic ILIKE '%الصلاة%'` = **Seq Scan, 22.3 s**, 401 matching rows. No code change was needed for index use; the new per-word clauses keep the same column expression. *Not verifiable before file 1 exists*: the post-check EXPLAIN in file 1 must show `Bitmap Index Scan on idx_hadith_corpus_text_arabic_trgm`.

**2. `zzqx nonexistent words here` timed out — cause: an "any word" prefilter.** The index prefilter was `text_english ILIKE ANY('{%zzqx%,%nonexistent%,%words%,%here%}')`, which matches ~29k rows because of "here" and "words". The main path then ran `words_match` (4 regexes) on all of them looking for 1,000 that contain every word — there are none, so it never stopped early (EXPLAIN ANALYZE of the prefilter alone: 21.5 s cold). Then the relaxed fallback scored up to 20,000 more rows; fetching + rechecking costs ~2 ms per hadith row, so 20,000 rows ≈ 40 s by itself.

**Fixes in file 2 (rev 2026-10-30):**
- *Main path:* one trigram-indexable clause per query word, ANDed (`text_english ILIKE ANY('{%zzqx%}') AND … ILIKE ANY('{%word%}') AND …`). Each clause uses the same stem `books_wregs` uses for its regex, so it is a necessary condition of `words_match`: **no result is lost**. The index intersects the words, and a word that occurs nowhere ends the scan immediately. Measured: 3.7 ms for the 4-word no-match query (was 15 s+).
- *Relaxed fallback:* (a) an index-only `EXISTS` probe per word (3–6 ms each); (b) if fewer than `greatest(1,(n+1)/2)` words occur anywhere, return empty at once — no row could reach the minimum score; (c) otherwise candidates must contain at least that many of the occurring words (OR of AND-combinations, BitmapOr/BitmapAnd on the index) instead of any word; (d) `relax_cap` lowered **20,000 → 1,000** because of the ~2 ms/row cost. Measured for `zzqx nonexistent words here`: probes ~15 ms + candidate scoring 0.39 s (warm). It now **returns relaxed results** (≈320 hadith contain 2+ of the words, e.g. "words" and "here"); before, it would have done the same if it had not timed out. `prayer zzqx` (2 words, any-one-word threshold): 1.3 s.

**Cap trade-off now:** relaxed results come only from the first 1,000 candidates that already contain enough of the words. That is a smaller pool than the previous 20,000, but a far more relevant one, since candidates are pre-filtered; `relaxed_capped: true` flags when it is reached.

## Files (apply in this order; none applied)

| File | What | Transaction? | Est. size / time |
|---|---|---|---|
| `20261029_perf_1_hadith_arabic_trgm_index.sql` | `CREATE INDEX CONCURRENTLY idx_hadith_corpus_text_arabic_trgm` (gin_trgm_ops) | **No** — CONCURRENTLY cannot run in a transaction | 130–250 MB, ~3–15 min (estimate) |
| `20261029_perf_2_site_search_src.sql` | `CREATE OR REPLACE FUNCTION site_search_src`: one-pass main path, per-word ANDed index prefilter, relaxed fallback gated by per-word index probes and capped at 1,000 candidates | Yes (BEGIN/COMMIT) | instant |
| `20261029_perf_3_tafsir_scope_index.sql` | `CREATE INDEX CONCURRENTLY idx_tafsir_language_scholar_name (language, scholar_name)` | **No** | ~2–3 MB, < 1 min (estimate) |
| `20261029_perf_4_drop_duplicate_hadith_fts.sql` | `DROP INDEX CONCURRENTLY idx_hadith_corpus_text_en` (0 scans; identical to `idx_hadith_text_fts`) | **No** | frees ~37 MB |
| `20261029_perf_2_site_search_src_TEST_ROLLBACK.sql` | Self-rolling-back production test of file 2 (run after file 1) | Yes, ends in ROLLBACK | seconds |
| `20261029_perf_ROLLBACK.sql` | Undo for each file | — | — |
| `20261029_perf_site_search_src_ORIGINAL.sql` | Live function definition, verbatim (md5 `5a80601c…`) | — | — |
| `20261029_perf_site_search_src.diff` | Unified diff original → proposed | — | — |

### Why CONCURRENTLY / outside a transaction
`CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` build or drop the index without the write-blocking lock a plain `CREATE INDEX` takes, so the site and any background jobs keep writing to `hadith_corpus` / `tafsir_entries`. PostgreSQL refuses to run them inside `BEGIN … COMMIT`. In the Supabase SQL editor, run each CONCURRENTLY statement on its own. If a build is interrupted it leaves an INVALID index: drop it with the ROLLBACK statement and retry.

## Expected plans (validated with EXPLAIN on the live DB where possible)

- **Arabic search, after file 1** (expected, cannot EXPLAIN an index that does not exist): `Bitmap Heap Scan on hadith_corpus → Bitmap Index Scan on idx_hadith_corpus_text_arabic_trgm, Index Cond: (text_arabic ~~* ANY (...))` — the same shape the English column already gets.
- **New main path, file 2** (EXPLAINed live with the regex inlined, since the read-only role cannot execute `words_match`): `CTE cand → Limit → Bitmap Heap Scan via idx_hadith_corpus_text_english_trgm`; the sort runs over the CTE only (≤ 1000 rows).
- **New relaxed fallback, file 2 rev 2026-10-30** (EXPLAIN ANALYZE of the generated SELECT): `Limit 1000 → Bitmap Heap Scan ← BitmapOr of BitmapAnd on idx_hadith_corpus_text_english_trgm`, then the score SubPlan over ≤ 1,000 rows.
- **scope_options, after file 3** (expected): `Unique → Index Only Scan using idx_tafsir_language_scholar_name, Index Cond: (language = 'en')`.
- The proposed function body (and the TEST script) were parsed with the PostgreSQL parser (`pglast` `parse_sql` + `parse_plpgsql_json`) — OK. Rev 2026-10-30 has not been executed as a function; its generated queries were timed as plain SELECTs.

## Expected impact (estimates — re-measure after applying)
- Arabic hadith search: from timeout (500) to an index lookup; should be well under the 15 s limit.
- No-match / multi-word hadith search: milliseconds when a word occurs nowhere at all; otherwise ≤ 1,000 pre-narrowed candidates (~0.4–1.3 s measured warm; cold cache can be a few times slower). Confirm with the TEST script.
- "prayer"-type searches: one bounded pass instead of regex-sorting all ~16k matches.
- research.html: `scope_options` should drop from ~4.5 s to a fast index-only scan.

## Risks
- Index build adds load and 130–250 MB of disk (DB is 2,821 MB). Run off-peak.
- **Result caps in file 2 (these change which results appear, not just their order):**
  - *Relaxed fallback:* only the first **1,000** candidates (physical table order, not relevance) that contain at least half of the query words are scored. A relevant row outside them never appears. (Draft history: 3,000 → 20,000 → 1,000; 20,000 would cost ~40 s, extrapolated from ~2 ms per row measured on 2026-10-30.) When the cap is hit, the response includes `"relaxed_capped": true` (new additive key; the UI in PR #62 shows a notice).
  - *Main path:* rows are sorted only within the first 1,000 exact matches. That is unchanged from before, where the count was already capped at 1,000 and the UI shows "capped". For words with more than 1,000 matches, a better-ranked row beyond the first 1,000 can be missing from the top results.
  - Trade-off: `relax_cap` is one constant; each extra 1,000 candidates costs roughly 1–2 s on a cold cache.
- Short words (1–2 letters) have no trigrams, so their clause cannot use the index (same as before the change).
- Trigram index only accelerates literal substring matches. Arabic text with diacritics still needs the query to match the stored spelling (unchanged behaviour).
- `site_search_src` serves all research sources (quran, tafsir, books, …); file 2 changes the same two code paths for each of them. Spot-check a few sources after applying.
