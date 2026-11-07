-- Rollback for 20261030_scripture_alteration_symmetry.sql (only if it was applied)
BEGIN;
DELETE FROM thematic_cross_references_v2 WHERE id IN (SELECT id FROM public._fix_20261030_alteration_sym_inserted);
SELECT count(*) AS rows FROM thematic_cross_references_v2 WHERE theme='Quran Torah Gospel: Scripture Alteration and Concealment';  -- expect 296
DROP TABLE public._fix_20261030_alteration_sym_inserted;
COMMIT;
