# Add missing themes + QTG confirmation reconciliation — proposed (snapshot 2026-10-28 ~3:30 AM PT, NOT applied)

## Schema findings (read-only)
- `themes` (table, 85 rows): id bigint serial PK, name text UNIQUE NOT NULL, category, subcategory, description, icon, color, confidence_level default 'high', created_at/updated_at default now(). No triggers. RLS on, policy "public read themes". Existing 'Quran Torah Gospel: …' rows: category 'theology', description NULL (only 3 of 85 rows have descriptions).
- `theme_verses` (table, 10,076 rows, 446 distinct themes): id bigint PK **without default**, theme, sura, aya, arabic, arabic_transliteration, english, tigrinya, amharic. Unique index uq_theme_verses (theme, sura, aya). No triggers. RLS on, public read. Text matches `ayas` (arabic, english, amharic exact; tigrinya 10,043/10,076; arabic_transliteration holds the same text as arabic).
- `theme_summary`: **materialized view** = themes LEFT JOIN theme_verses grouped by theme (verse_count, sura_count); 85 rows. No cron job, trigger or function refreshes it, so it must be refreshed manually (script does `REFRESH MATERIALIZED VIEW theme_summary`). themes.html reads it, so only themes in `themes` appear.

## Missing themes
Of the 11 scripture-related cross-ref themes, 8 already exist in `themes`. Missing: Confirmation of Previous Scripture (33 verses), Believe in All Scripture (17), Believe in Part of the Scripture and Disbelieve in Part (5).

## Expected counts (main file)
themes +3 (85→88) · theme_verses +55 · theme_summary 85→88 · deletes 0.

## Reconciliation: 'Quran Torah Gospel: Confirmation of Previous Scripture'
theme_verses: 56 verses; v2 cross-ref theme: 36; shared 30.
- Only in theme_verses (26): 2:4, 2:87, 2:137, 3:4, 3:199, 4:47, 5:43, 5:44, 5:46, 5:47, 5:66, 5:68, 7:157, 9:111, 10:94, 13:36, 17:2, 26:196, 27:76, 28:52, 41:45, 42:13, 45:16, 48:29, 53:36, 98:3 (most are members of the v2 'Confirmation of Previous Scripture' theme instead).
- Only in v2 (6): 3:19, 5:32, 6:146, 16:118, 16:124, 57:27.

Recommendation: optional file `20261028_qtg_confirmation_reconcile_OPTIONAL.sql` adds the 6 to theme_verses (+6 rows → 62), so the theme page is a superset of the Cross-Refs tab. Adding the 26 to the v2 clique instead would grow it from 36 to 62 members (1,260 → 3,782 rows, +2,522) and duplicate the separate 'Confirmation of Previous Scripture' theme; not recommended without review.
