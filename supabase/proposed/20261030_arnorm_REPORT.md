# Diacritic-insensitive Arabic hadith search (proposed, NOT applied) — 2026-10-30

Stacked on PR #61 (`perf/db-indexes`). Nothing here has been executed on any database: the SQL was **parsed only**
(pglast, PostgreSQL 17 grammar, including the PL/pgSQL bodies). All sizes and times are **estimates** from
read-only queries.

## Problem
About 93% of `hadith_corpus.text_arabic` carries tashkeel. Site search does a literal `ILIKE`, so a reader typing
`الصلاة` misses most rows. Read-only sample (ids 20001–40000, 20,000 rows):

| word | rows matching raw text | rows matching normalised text |
|---|---|---|
| الصلاة | 95 | 1,120 |
| رسول | 704 | 12,341 |
| الله | 17,733 | 18,793 |

## Design
- **Normaliser: reuse `public.normalize_arabic` (already in the schema, IMMUTABLE, unused).** It strips tashkeel incl.
  dagger alef, tatweel and Quranic marks (U+06D6–06ED), folds `أ إ آ ٱ` → `ا`, `ى` → `ي`, `ة` → `ه`.
  A thin wrapper `public.hadith_ar_norm(text)` (IMMUTABLE, SQL) also removes what `normalize_arabic` keeps:
  honorific marks U+0610–061A and zero-width / bidi controls. These matter: 16,572 of the 20,000 sampled rows contain
  U+200C/200D/200F/202B/202C, 44 of them inside a word. The quran/library search paths in `site_search_src` use an
  inline `regexp_replace(col,'[ً-ْٰـ]','')` (no folding) and the other helpers (`strip_diac`, `strip_arabic_diacritics`,
  `norm_word`) differ again; they are left untouched.
- **All three folds chosen** (alef, ya, ta marbuta), as `normalize_arabic` already does. Reason: readers type bare alef
  and ه/ة/ى inconsistently. Cost: a few distinct words merge (e.g. `على` "on" and `علي` "Ali"; `رحمة` and `رحمه`).
- **Column, not STORED generated:** a generated STORED column would rewrite the 559 MB table under an ACCESS EXCLUSIVE
  lock. Instead: plain nullable `text_arabic_norm` (catalog-only), a `BEFORE INSERT OR UPDATE OF text_arabic` trigger,
  a batched back-fill, then `CREATE INDEX CONCURRENTLY` (GIN `gin_trgm_ops`).
- **View:** `site_search_src` reads `select * from hadith_corpus_canonical`; the column is appended as the view's last
  column (`CREATE OR REPLACE VIEW`, definition otherwise identical to live). Other views on `hadith_corpus`
  (`hadith_truncated_records`, `hadith_verse_links_combined`, `narrative_version_reader`,
  `verified_hadith_verse_links`) list columns explicitly and are unaffected; the canonical view's dependents
  (`hadith_attestation`, `hadith_ambiguous_citations`) are unaffected by an appended column.
- **Search:** step 4 is PR #61 file 2's function verbatim plus 6 `ARNORM` lines: for `src='hadith'` with an Arabic query,
  the query and each search variant are passed through `hadith_ar_norm`, and the match column `text_arabic` is swapped
  for `text_arabic_norm` (prefilter, `words_match`, relaxed scoring). Latin queries and other sources are unchanged.
  Snippets still come from the original `text_arabic`.

## Files and owner run order
1. `20261030_arnorm_1_column_trigger.sql` — whole file, one transaction (lock_timeout 5 s; re-run if it times out).
2. `20261030_arnorm_2_backfill.sql` — group A, then `VACUUM (ANALYZE) public.hadith_corpus;` alone; same for B, C, D.
   Post-check: `missing = 0`, `stale = 0`.
3. `20261030_arnorm_3_index.sql` — the `CREATE INDEX CONCURRENTLY` statement alone. Post-check `indisvalid = true`.
4. `20261030_arnorm_TEST_ROLLBACK.sql` — whole file; self-rolling-back. Must pass (see its header).
5. `20261030_arnorm_4_view_and_search.sql` — whole file, one transaction. **Apply this instead of #61 file 2.**
6. #61 file 3 (tafsir index) at a quiet time, as before.

Steps 1–3 are additive: until step 5 nothing reads the new column, so the site behaves exactly as today.

## Estimates (read-only measurements, not writes)
- **Back-fill:** normalising costs ~0.8 ms/row (3,000 rows in 2.4 s) → ~100 s CPU for 119,748 rows. With row writes
  and maintenance of the 11 existing indexes (incl. the 136 MB English trigram GIN, as updates are not HOT on full
  pages) expect **~10–40 s per 5,000-id batch, ~5–15 min total**.
- **Storage:** normalised text ≈ 61% of the raw Arabic bytes → **~70 MB** more table data. Temporary dead row versions
  and index entries until each VACUUM (the 4 groups bound this to about a quarter of the table, ~100–150 MB peak).
- **Index:** **~120–220 MB**, build ~3–15 min at `maintenance_work_mem = 32MB`.
- **Locks:** ADD COLUMN — ACCESS EXCLUSIVE, milliseconds. CREATE TRIGGER — SHARE ROW EXCLUSIVE, milliseconds (blocks
  writes only). Back-fill — row locks on 5,000 rows per batch for seconds; reads never blocked. Index —
  SHARE UPDATE EXCLUSIVE (reads and writes continue). View/function — milliseconds, on the view only.

## PR #61 file 1 (`idx_hadith_corpus_text_arabic_trgm`) becomes redundant for site search
Once step 5 is in, `site_search_src` no longer filters on raw `text_arabic`, so file 1's index would cost 130–250 MB and
write overhead for nothing in this path. The only other `text_arabic ILIKE` users found (`search_global_ai`,
`search_unified_intelligent`) wrap it in `lower(coalesce(...))`, which that index cannot serve. It is **not** removed
from #61, because #61 is mid-test and file 1 is still what makes #61 file 2 fast on its own. Recommendation: if this
stack is approved, **skip file 1** (or drop it with #61's rollback line if already built).

## Caveats
- Never executed; parsed only. The test script is the first real run.
- Estimates above are not measured writes.
- `same_as_pair` in the test compares the count and the top 6 row ids. For capped queries (≥1000 matches) the
  1,000-row candidate set is taken without ORDER BY, as in #61 file 2.
- Highlighting: the response `variants` keep the reader's spelling, and snippets come from the diacritised text, so
  `qh_research_context` may not centre the snippet on the match for undiacritised queries.
- Other search paths (`qh_research_focus_search`, `qh_research_meaning_search`, quran/library) remain as they are.
- Rollback cannot drop a column from a view with `CREATE OR REPLACE`; the rollback leaves the (harmless) column in place
  unless the view and its two dependents are re-created.
