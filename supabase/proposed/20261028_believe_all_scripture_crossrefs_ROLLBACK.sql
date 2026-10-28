-- Rollback for 20261028_believe_all_scripture_crossrefs.sql
BEGIN;
DELETE FROM thematic_cross_references_v2 WHERE id IN (SELECT id FROM public._fix_20261028_believe_all_inserted);
SELECT count(*) AS remaining FROM thematic_cross_references_v2 WHERE theme='Believe in All Scripture';  -- expect 0
DROP TABLE public._fix_20261028_believe_all_inserted;
COMMIT;
