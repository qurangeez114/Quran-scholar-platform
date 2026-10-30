# "$NN" placeholder cleanup — PROPOSED, NOT APPLIED

## Where the placeholders come from (read-only scan, 2026-10-30)
Scanned every text/varchar column in `public` for a `$` followed by 1–3 digits.
- **Real placeholders (whole value is just `$NN`):** 4 rows, all Tigrinya tafsir (ti2):
  - `ayas.tigrinya2` 2:196 = `$25`, 2:282 = `$28`
  - `verse_translations` lang `ti2`, 2:196 = `$25`, 2:282 = `$28`
  These are the two verses whose Tigrinya tafsir text is still waiting on source text.
- **Not placeholders:** dollar amounts in prose (`madhhab_rulings` 20 rows, `madhhab_topics` 1, `hadith_comparative` 2, e.g. "$500 USD", "$3 trillion"). Left alone.
- **Not fully scanned:** one batch of ~40 columns (proposition_relationships, authenticity_dimensions, project_methodological_findings, occasions, etc.) timed out; `hadith_corpus` text columns were rechecked individually and have 0.

## Fix
1. **Code (this PR):** `placeholder-guard.js` blanks any Supabase REST string value that is exactly `$NN`, so pages show the verse as missing that language instead of "$25". Loaded on the pages that render ti2 text.
2. **Data (this file, optional):** sets the 4 values to NULL with a backup table and rollback. Better still: replace them with the real Tigrinya tafsir when supplied.
