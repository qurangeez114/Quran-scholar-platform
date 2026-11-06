# Research search: ranked search + hadith permalinks (proposed, NOT applied)

All changes are additive: new nullable columns, triggers, indexes and a new RPC. No existing text is changed,
and no existing RPC (`site_search_src`, `qh_sira_search`, …) is modified. The front end detects a missing
`qh_research_search` (HTTP 404) and keeps the current per-source search, so the PR is safe to deploy before any SQL is applied.

## Apply order (each step needs explicit approval)
1. `20261103_rsearch_1_columns_functions.sql`: `qh_ge_fold()`, nullable `fts_en` / `content_norm` / `arabic_norm` / `ethiopic_norm` columns and the triggers that keep them filled. Fast (metadata only).
2. `20261103_rsearch_2_backfill.sql`: batched UPDATEs (hadith in 5k id batches, ayas in one statement, tafsir in 12 batches) with VACUUM lines between groups. Run it off-peak. It rewrites about 175k rows, so expect temporary table bloat.
3. `20261103_rsearch_3_indexes.sql`: `CREATE INDEX CONCURRENTLY` (GIN tsvector + pg_trgm). Run it outside a transaction.
4. `20261103_rsearch_TEST_ROLLBACK.sql`: creates the RPC inside a transaction, runs 12 queries plus paging and collection checks, then rolls back. Review the timings before step 5.
5. `20261103_rsearch_4_research_search.sql`: `qh_research_search(q, p_source, p_collections, p_page, p_per_page)`, granted to anon.

Rollback: `20261103_rsearch_ROLLBACK.sql` (A = function, B = indexes concurrently, C = triggers/functions/columns).

## What the RPC does
- English: `websearch_to_tsquery` + `ts_rank_cd` + phrase bonus over quran / hadith / tafsir(en).
- Arabic: the query and columns go through `normalize_arabic` / `hadith_ar_norm` (#66), so matching ignores diacritics. Uses AND of words over trigram indexes, with whole-word and phrase scoring.
- Tigrinya and Amharic: `qh_ge_fold` maps each syllable to its 6th order and merges ሥ/ስ, ፅ/ጽ, ኅ/ህ. Searches `ayas.tigrinya, aya_text, tigrinya2, amharic` and tafsir `ti`.
- Returns true totals (capped at 5,000, with `capped:true`), 6 rows for the preview and 50 per page, plus an optional collection / commentator filter.

## Measurements
Legacy (live production, 2026-11-03, 2 rounds, `tests/research-search-benchmark.mjs --legacy`): overall p95 29.1 s.
The Quran source timed out for every Arabic query, and tafsir/library timed out on "intention actions". Ethiopic queries found 0.
Ranked (embedded Postgres 17 mock built from anon samples): 6–200 ms per query. Mercy ranks 7:151 first, "inheritance of daughters" ranks 4:11 first,
الرحمن and الرَّحْمَٰنُ give identical counts, ምሕረት/ጸሎት now find verses, and xqzvbnm returns 0.
**Production latency is unmeasured.** Hadith is about 15× larger than the mock. Run step 4 and then `node tests/research-search-benchmark.mjs --ranked` (target p95 1.5 s, hard limit 3 s).

## Risks
- Backfill bloat and WAL volume in step 2. It is batched; VACUUM afterwards.
- Triggers add a small cost to future inserts and updates on hadith_corpus, tafsir_entries and ayas.
- The mock's `normalize_arabic` is an approximation of the production one.
- English search uses AND logic ("intention actions" gives 0 ranked Quran hits). For any source with 0 ranked results, the page falls back to the legacy relaxed search.
- The Supabase Management token in the box returned 401, so the live schema was inferred from anon REST and the #66/#61 branches. Re-run the pre-checks in each file.

## Applied 2026-11-03/04 (approved)
- Step 1: applied 23:5x PST. Step 2: backfill complete, 00:00–00:53 PST. Step 3: 5 valid indexes, 01:10–01:11 PST.
- TEST v1 (one call covering all sources, 5,000 cap): p95 16.9 s, so we stopped. v2 (per-source calls, 1,000 cap, top-300 scoring) TEST_ROLLBACK: slowest source per query, in-database p50 0.17 s, p95 1.0 s, max 1.03 s; result quality unchanged.
- Step 4 (v2): applied 01:36 PST. Row counts unchanged.
- Production benchmark (--ranked, 2 rounds): ranked requests, slowest source wall p95 5.4 s, highly variable (the same call took 0.2–4.8 s). The legacy path was 29.1 s.
- Page wait is still bounded by the legacy non-core sources (library, propositions, …): about 11 s on the deploy preview.
