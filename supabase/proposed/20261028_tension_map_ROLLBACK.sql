-- ROLLBACK for 20261028_tension_map_crossrefs.sql (PROPOSED — not applied)
BEGIN;
DELETE FROM thematic_cross_references_v2 WHERE id IN (SELECT id FROM public._fix_20261028_tension_inserted);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM thematic_cross_references_v2 WHERE theme='Tension: Confirmation vs Alteration Claim') THEN
  RAISE EXCEPTION 'rollback check: theme rows remain'; END IF; END $$;
DROP TABLE public._fix_20261028_tension_inserted;
COMMIT;
