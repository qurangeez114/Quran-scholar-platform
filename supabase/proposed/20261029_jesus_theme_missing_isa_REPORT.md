# Proposed: add 11 missing Isa verses to "Jesus in the Quran" (NOT APPLIED)

**Change:** `theme_verses` +11 rows for theme `Jesus in the Quran` (59 → 70). No other theme or table is changed, apart from refreshing `theme_summary`.

**Why:** each of these verses names Isa (عيسى) in the Arabic text, found by searching `ayas.arabic` with diacritics stripped. None is in either Jesus theme today.

| Verse | Note |
|---|---|
| 2:87 | Isa son of Maryam given clear proofs, supported with the Holy Spirit |
| 2:136 | belief in what was given to Musa and Isa |
| 2:253 | messengers ranked; Isa given clear proofs |
| 3:84 | parallel of 2:136 |
| 4:163 | revelation to Isa among the prophets |
| 5:46 | Isa sent following earlier prophets; the Injil given |
| 5:78 | curse by the tongue of Dawud and Isa |
| 33:7 | covenant taken from the prophets, including Isa |
| 42:13 | religion enjoined on Nuh, Ibrahim, Musa and Isa |
| 43:63 | Isa came with clear proofs and wisdom |
| 57:27 | Isa son of Maryam followed; the Injil given |

Notes are descriptive summaries, not tafsir.

**Schema (read live, read-only, 2026-10-29):** `theme_verses(id bigint identity, theme, sura, aya, arabic, arabic_transliteration, english, tigrinya, amharic)`; unique index `uq_theme_verses (theme, sura, aya)`; `theme_summary` is a **materialized view** (`relkind = m`) over `themes LEFT JOIN theme_verses`, so it is refreshed in the same transaction. No triggers on `theme_verses`. All 11 `ayas` rows have Arabic, English, Tigrinya and Amharic text. All 59 existing rows store `arabic_transliteration = arabic`, and this migration does the same.

**Safety:** pre-checks are read-only (expect 59 rows, 0 already present, 11 source ayas). Inserts skip duplicates (NOT EXISTS + ON CONFLICT DO NOTHING), and inserted ids are logged in `public._fix_20261029_jesus_isa_inserted`. Post-checks expect 70 / 70 / 11 logged / 0 missing text. Run ROLLBACK instead of COMMIT if any post-check is off.

**Rollback:** `20261029_jesus_theme_missing_isa_ROLLBACK.sql` deletes only the logged ids, refreshes the view and drops the log table.

**Not included:** 8 verses where the English says "Jesus" but the Arabic has no Isa (3:53, 4:159, 5:111, 19:30, 19:36, 19:37, 43:59, 43:61). They need an editorial decision.
