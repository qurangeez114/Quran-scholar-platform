-- OPTIONAL — PROPOSED, NOT APPLIED. Run AFTER 20261028_add_missing_themes.sql (reuses its log table).
-- Adds to theme_verses the 6 verses that are in the v2 cross-ref theme
-- 'Quran Torah Gospel: Confirmation of Previous Scripture' but missing from its theme page:
-- 3:19, 5:32, 6:146, 16:118, 16:124, 57:27. Expected: theme_verses +6 (56 -> 62 for this theme).
SELECT count(*) FROM theme_verses WHERE theme='Quran Torah Gospel: Confirmation of Previous Scripture';  -- expect 56
BEGIN;
LOCK TABLE theme_verses IN SHARE ROW EXCLUSIVE MODE;
WITH t AS (SELECT 'Quran Torah Gospel: Confirmation of Previous Scripture'::text AS theme),
v AS (SELECT x.sura, x.aya FROM thematic_cross_references_v2 x, t WHERE x.theme=t.theme
      UNION SELECT x.related_sura, x.related_aya FROM thematic_cross_references_v2 x, t WHERE x.theme=t.theme),
todo AS (SELECT v.* FROM v, t WHERE NOT EXISTS (SELECT 1 FROM theme_verses tv WHERE tv.theme=t.theme AND tv.sura=v.sura AND tv.aya=v.aya)),
ins AS (
  INSERT INTO theme_verses (theme, sura, aya, arabic, arabic_transliteration, english, tigrinya, amharic)
  SELECT (SELECT theme FROM t), d.sura, d.aya, a.arabic, a.arabic, a.english, a.tigrinya, a.amharic
  FROM todo d LEFT JOIN ayas a ON a.sura_id=d.sura AND a.aya_number=d.aya
  ON CONFLICT (theme, sura, aya) DO NOTHING
  RETURNING id)
INSERT INTO public._fix_20261028_theme_verses_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;
REFRESH MATERIALIZED VIEW theme_summary;
SELECT verse_count FROM theme_summary WHERE theme='Quran Torah Gospel: Confirmation of Previous Scripture';  -- expect 62
COMMIT;
