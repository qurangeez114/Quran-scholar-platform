-- Rollback for 20261029_jesus_theme_missing_isa.sql (deletes only rows logged by that migration)
BEGIN;
DELETE FROM theme_verses WHERE id IN (SELECT id FROM public._fix_20261029_jesus_isa_inserted);
REFRESH MATERIALIZED VIEW theme_summary;
SELECT count(*) AS theme_rows FROM theme_verses WHERE theme='Jesus in the Quran';  -- expect 59
DROP TABLE public._fix_20261029_jesus_isa_inserted;
COMMIT;
