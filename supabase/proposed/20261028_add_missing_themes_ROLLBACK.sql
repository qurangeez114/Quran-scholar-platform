-- Rollback for 20261028_add_missing_themes.sql (and the optional reconciliation file, if applied)
BEGIN;
DELETE FROM theme_verses WHERE id IN (SELECT id FROM public._fix_20261028_theme_verses_inserted);
DELETE FROM themes       WHERE id IN (SELECT id FROM public._fix_20261028_themes_inserted);
REFRESH MATERIALIZED VIEW theme_summary;
SELECT count(*) AS summary_rows FROM theme_summary;  -- expect 85
DROP TABLE public._fix_20261028_theme_verses_inserted, public._fix_20261028_themes_inserted;
COMMIT;
