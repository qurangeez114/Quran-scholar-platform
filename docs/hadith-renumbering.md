# Coordinated renumbering to sunnah.com numbering (NOT APPLIED)

`supabase/migrations/20261103140000_hadith_renumber_sunnah_com.sql` changes `hadith_corpus.hadith_number` to the sunnah.com number. In the same transaction it updates every dependent base table that refers to a hadith by `(collection, hadith_number)`. Views, including `hadith_corpus_canonical`, pick up the change automatically, and tables that aren't base tables are skipped.

Dependent tables checked: verified_hadith_verse_links, hadith_verse_links_combined, theme_hadith_links, campaign_hadith, muhammad_hadith_links, hadiths, hadith_attestation, external_narration_link, hadith_ambiguous_citations, hadith_truncated_records, hadith_verse_links_csv_import, theme_ai_synthesis.

**Safety rules.** These are evaluated against live data at run time and repeated until nothing more is excluded:
1. The old key must identify exactly one `hadith_corpus` row.
2. The new key must be unique in `hadith_corpus` after the change.
3. No dependent row that is staying put may already use the new key. Otherwise orphan links would silently attach to a different hadith.

Rows that fail any rule keep their current number.

**Backups.** Every touched row is copied in full to `hadith_renumber_bk_20261103_<table>`. The applied mapping is stored in `hadith_renumber_map_20261103`.

**Rollback.** `scripts/numbering/ROLLBACK_hadith_renumber_sunnah_com.sql` re-applies the stored mapping in reverse using the same rules.

**Scratch test (2026-11-03)** on copies of production data. It used all 84,074 rows of the `hadith_corpus_canonical` view plus the full theme_hadith_links (22,763), campaign_hadith (319), muhammad_hadith_links (19), external_narration_link (194), hadith_verse_links_csv_import (40) and theme_ai_synthesis (15,377) tables. Only 67,000 of the ~201,000 verified_hadith_verse_links rows came through, because production returned HTTP 500 on later pages.
- 7,825 of the 26,899 candidate rows passed the safety rules and were renumbered. In the dependent tables: verified_hadith_verse_links 17,143, theme_hadith_links 131, campaign_hadith 38, external_narration_link 28, hadith_verse_links_csv_import 11, muhammad_hadith_links 4.
- Every dependent row still resolves to the **same hadith id** as before in every table, and the resolved counts are unchanged.
- After rollback, every table is byte-identical to its original copy (md5).
- The remaining ~19k rows are blocked by rules 2 and 3. Numbering shifts form chains that run into rows that aren't moving (unaudited or low-confidence rows, and existing duplicate keys). Moving them needs the 6,444 rows the crawl didn't cover, plus the 1,067 candidates, resolved first.
