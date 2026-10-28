-- Rollback for 20261028_confirmation_crossrefs.sql (only if it was applied)
BEGIN;
DELETE FROM thematic_cross_references_v2 WHERE id IN (SELECT id FROM public._fix_20261028_xref_v2_inserted);
DELETE FROM thematic_cross_references    WHERE id IN (SELECT id FROM public._fix_20261028_xref_old_inserted);
INSERT INTO cross_references SELECT * FROM public._fix_20261028_xref_deleted ON CONFLICT (id) DO NOTHING;
SELECT count(*) AS restored FROM cross_references WHERE id IN (2774,3638,8849);  -- expect 3
DROP TABLE public._fix_20261028_xref_v2_inserted, public._fix_20261028_xref_old_inserted, public._fix_20261028_xref_deleted;
COMMIT;
