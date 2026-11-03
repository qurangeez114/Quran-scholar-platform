-- PROPOSED — NOT APPLIED. Adds the 11 verses whose Arabic names Isa (عيسى) but which are missing from the
-- theme 'Jesus in the Quran': 2:87, 2:136, 2:253, 3:84, 4:163, 5:46, 5:78, 33:7, 42:13, 43:63, 57:27.
-- Expected: theme_verses 'Jesus in the Quran' 59 -> 70; theme_summary verse_count 59 -> 70; no other theme touched.
-- theme_verses.id is an identity column (GENERATED ALWAYS), left to the database. Duplicates skipped via
-- NOT EXISTS + ON CONFLICT on unique index uq_theme_verses (theme, sura, aya). Idempotent.
-- theme_summary is a MATERIALIZED VIEW (themes LEFT JOIN theme_verses) with no trigger/cron, so it is refreshed below.
-- Rollback: 20261029_jesus_theme_missing_isa_ROLLBACK.sql. Report: 20261029_jesus_theme_missing_isa_REPORT.md

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) AS theme_exists FROM themes WHERE name='Jesus in the Quran';                       -- expect 1
SELECT count(*) AS theme_rows FROM theme_verses WHERE theme='Jesus in the Quran';                  -- expect 59
SELECT count(*) AS already_present FROM theme_verses
 WHERE theme='Jesus in the Quran' AND (sura,aya) IN ((2,87),(2,136),(2,253),(3,84),(4,163),(5,46),(5,78),(33,7),(42,13),(43,63),(57,27));                                          -- expect 0
SELECT count(*) AS ayas_with_text FROM ayas
 WHERE (sura_id,aya_number) IN ((2,87),(2,136),(2,253),(3,84),(4,163),(5,46),(5,78),(33,7),(42,13),(43,63),(57,27)) AND arabic IS NOT NULL AND english IS NOT NULL;                -- expect 11
SELECT verse_count FROM theme_summary WHERE theme='Jesus in the Quran';                            -- expect 59

BEGIN;

CREATE TABLE IF NOT EXISTS public._fix_20261029_jesus_isa_inserted (id bigint PRIMARY KEY);
REVOKE ALL ON public._fix_20261029_jesus_isa_inserted FROM anon, authenticated;

LOCK TABLE theme_verses IN SHARE ROW EXCLUSIVE MODE;
WITH v(sura, aya) AS (VALUES (2,87),(2,136),(2,253),(3,84),(4,163),(5,46),(5,78),(33,7),(42,13),(43,63),(57,27)),
ins AS (
  INSERT INTO theme_verses (theme, sura, aya, arabic, arabic_transliteration, english, tigrinya, amharic)
  -- arabic_transliteration = arabic, matching all 59 existing rows of this theme
  SELECT 'Jesus in the Quran', v.sura, v.aya, a.arabic, a.arabic, a.english, a.tigrinya, a.amharic
  FROM v JOIN ayas a ON a.sura_id = v.sura AND a.aya_number = v.aya
  WHERE NOT EXISTS (SELECT 1 FROM theme_verses t WHERE t.theme='Jesus in the Quran' AND t.sura=v.sura AND t.aya=v.aya)
  ON CONFLICT (theme, sura, aya) DO NOTHING
  RETURNING id)
INSERT INTO public._fix_20261029_jesus_isa_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

REFRESH MATERIALIZED VIEW theme_summary;

-- ===== POST-CHECK (ROLLBACK instead of COMMIT if off) =====
SELECT count(*) AS theme_rows FROM theme_verses WHERE theme='Jesus in the Quran';                  -- expect 70
SELECT verse_count FROM theme_summary WHERE theme='Jesus in the Quran';                            -- expect 70
SELECT count(*) AS logged FROM public._fix_20261029_jesus_isa_inserted;                                                           -- expect 11
SELECT count(*) AS missing_text FROM theme_verses WHERE id IN (SELECT id FROM public._fix_20261029_jesus_isa_inserted)
  AND (arabic IS NULL OR english IS NULL);                                                         -- expect 0
SELECT count(*) AS summary_rows FROM theme_summary;                                                -- expect unchanged (88 at time of writing)

COMMIT;
