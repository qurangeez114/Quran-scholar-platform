# Scripture Alteration cross-reference symmetry — PROPOSED, NOT APPLIED

**Theme:** `Quran Torah Gospel: Scripture Alteration and Concealment` in `thematic_cross_references_v2`.

## Findings (read-only, 2026-10-30)
- 296 rows; 19 distinct source verses, 26 distinct target verses.
- **142 rows (A→B) have no reverse B→A.** Mostly the source verses 2:145, 2:146, 2:160, 15:91, 41:45, 62:5, 98:4 link to the core alteration verses (2:42, 2:75, 2:77–79, 2:90, 2:159, 2:174–175, 3:71, 3:78, 4:44, 4:46, 5:13, 5:15, 5:41, 11:110) with no link back.
- The other related theme, `Corruption and Concealment of Scripture`, is already symmetric (0 missing).

## Change
Insert the 142 reverse rows, copying `reason`/`category` from the forward row. `ON CONFLICT DO NOTHING` on the unique key skips duplicates; re-running inserts nothing. Inserted ids are logged in `_fix_20261030_alteration_sym_inserted` for the rollback.

Expected: 296 → 438 rows, 0 asymmetric pairs.

## Not done
It does not make the theme a full clique (every member linked to every other) as the 2026-10-28 confirmation fix did; it only adds missing reverses. Run the pre-checks first; if counts differ from 296/142, stop and re-check.
