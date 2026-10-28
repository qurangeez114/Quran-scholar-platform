-- PROPOSED — NOT APPLIED. Adds 3 cross-reference themes to themes + theme_verses so they appear on themes.html
-- and theme-reader.html, then refreshes the theme_summary materialized view.
-- Expected: themes +3 (85 -> 88), theme_verses +55 (33 + 17 + 5), theme_summary 85 -> 88 rows.
-- Fix: theme_verses.id is an identity column (GENERATED ALWAYS); it is no longer set explicitly.
-- Idempotent (NOT EXISTS + existing unique keys themes_name_key / uq_theme_verses). Rollback: 20261028_add_missing_themes_ROLLBACK.sql

-- ===== PRE-CHECK (read-only) =====
SELECT name FROM themes WHERE name IN ('Confirmation of Previous Scripture','Believe in All Scripture',
  'Believe in Part of the Scripture and Disbelieve in Part');                     -- expect 0 rows
SELECT theme, count(*) FROM theme_verses WHERE theme IN ('Confirmation of Previous Scripture','Believe in All Scripture',
  'Believe in Part of the Scripture and Disbelieve in Part') GROUP BY theme;     -- expect 0 rows
SELECT count(*) AS themes_rows FROM themes;                                      -- expect 85
SELECT count(*) AS summary_rows FROM theme_summary;                              -- expect 85

BEGIN;

CREATE TABLE IF NOT EXISTS public._fix_20261028_themes_inserted       (id bigint PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public._fix_20261028_theme_verses_inserted (id bigint PRIMARY KEY);
REVOKE ALL ON public._fix_20261028_themes_inserted, public._fix_20261028_theme_verses_inserted FROM anon, authenticated;

-- 1) themes (same conventions as existing 'Quran Torah Gospel: …' rows: category 'theology', confidence 'high')
WITH new_t(name, description) AS (VALUES
  ('Confirmation of Previous Scripture',
   'Verses stating that the Quran confirms (musaddiq) the scriptures revealed before it, such as the Torah and the Gospel, and verses referring to those earlier revelations.'),
  ('Believe in All Scripture',
   'Verses calling for belief in all revealed books and all messengers without distinction, and related verses contrasting this with partial or selective belief.'),
  ('Believe in Part of the Scripture and Disbelieve in Part',
   'Verses describing accepting some revealed scripture or messengers while rejecting others (e.g. 2:85, 2:91, 4:150).')),
ins AS (
  INSERT INTO themes (name, category, description, confidence_level)
  SELECT n.name, 'theology', n.description, 'high' FROM new_t n
  WHERE NOT EXISTS (SELECT 1 FROM themes t WHERE t.name = n.name)
  ON CONFLICT (name) DO NOTHING
  RETURNING id)
INSERT INTO public._fix_20261028_themes_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- 2) theme_verses: distinct verses of each theme in thematic_cross_references_v2 (source or related),
--    text copied from ayas like existing rows (arabic_transliteration = arabic, as in existing data).
--    theme_verses.id is an identity column (GENERATED ALWAYS), so it is left to the database.
LOCK TABLE theme_verses IN SHARE ROW EXCLUSIVE MODE;
WITH th(theme) AS (VALUES ('Confirmation of Previous Scripture'),('Believe in All Scripture'),
       ('Believe in Part of the Scripture and Disbelieve in Part')),
v AS (
  SELECT x.theme, x.sura, x.aya FROM thematic_cross_references_v2 x JOIN th USING (theme)
  UNION SELECT x.theme, x.related_sura, x.related_aya FROM thematic_cross_references_v2 x JOIN th USING (theme)),
todo AS (
  SELECT v.* FROM v WHERE NOT EXISTS (SELECT 1 FROM theme_verses t WHERE t.theme=v.theme AND t.sura=v.sura AND t.aya=v.aya)),
ins AS (
  INSERT INTO theme_verses (theme, sura, aya, arabic, arabic_transliteration, english, tigrinya, amharic)
  SELECT d.theme, d.sura, d.aya, a.arabic, a.arabic, a.english, a.tigrinya, a.amharic
  FROM todo d LEFT JOIN ayas a ON a.sura_id = d.sura AND a.aya_number = d.aya
  ON CONFLICT (theme, sura, aya) DO NOTHING
  RETURNING id)
INSERT INTO public._fix_20261028_theme_verses_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- 3) theme_summary is a MATERIALIZED VIEW (themes LEFT JOIN theme_verses); no trigger/cron refreshes it.
REFRESH MATERIALIZED VIEW theme_summary;

-- ===== POST-CHECK (ROLLBACK instead of COMMIT if off) =====
SELECT theme, verse_count, sura_count FROM theme_summary WHERE theme IN ('Confirmation of Previous Scripture',
  'Believe in All Scripture','Believe in Part of the Scripture and Disbelieve in Part') ORDER BY theme;
  -- expect Believe in All Scripture 17 / Believe in Part… 5 / Confirmation of Previous Scripture 33
SELECT count(*) AS summary_rows FROM theme_summary;                                      -- expect 88
SELECT (SELECT count(*) FROM public._fix_20261028_themes_inserted) AS themes_logged,     -- expect 3
       (SELECT count(*) FROM public._fix_20261028_theme_verses_inserted) AS tv_logged;   -- expect 55
SELECT count(*) AS missing_text FROM theme_verses WHERE id IN (SELECT id FROM public._fix_20261028_theme_verses_inserted)
  AND (arabic IS NULL OR english IS NULL);                                               -- expect 0

COMMIT;
