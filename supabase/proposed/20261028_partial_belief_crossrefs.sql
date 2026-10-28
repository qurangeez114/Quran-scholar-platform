-- PROPOSED — NOT APPLIED. New theme 'Believe in Part of the Scripture and Disbelieve in Part' as a full symmetric clique of 4:150, 2:85, 3:7, 2:91, 4:136 (20 rows).
-- Idempotent. Rollback: 20261028_partial_belief_crossrefs_ROLLBACK.sql. Report: 20261028_partial_belief_crossrefs_REPORT.md

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) AS theme_rows FROM thematic_cross_references_v2 WHERE theme='Believe in Part of the Scripture and Disbelieve in Part';  -- expect 0
SELECT count(*) AS missing_pairs FROM (VALUES (4,150),(2,85),(3,7),(2,91),(4,136)) a(s,a) CROSS JOIN (VALUES (4,150),(2,85),(3,7),(2,91),(4,136)) b(s,a)
WHERE (a.s,a.a)<>(b.s,b.a) AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 x
  WHERE x.theme='Believe in Part of the Scripture and Disbelieve in Part' AND x.sura=a.s AND x.aya=a.a AND x.related_sura=b.s AND x.related_aya=b.a);  -- expect 20

BEGIN;

CREATE TABLE IF NOT EXISTS public._fix_20261028_partial_belief_inserted (id uuid PRIMARY KEY);
REVOKE ALL ON public._fix_20261028_partial_belief_inserted FROM anon, authenticated;

WITH m(s,a) AS (VALUES (4,150),(2,85),(3,7),(2,91),(4,136)),
ins AS (
  INSERT INTO thematic_cross_references_v2 (theme, sura, aya, related_sura, related_aya, reason, category)
  SELECT 'Believe in Part of the Scripture and Disbelieve in Part', x.s, x.a, y.s, y.a, 'Thematic cross-reference', 'Believe in Part of the Scripture and Disbelieve in Part'
  FROM m x JOIN m y ON (x.s,x.a)<>(y.s,y.a)
  WHERE NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 t WHERE t.theme='Believe in Part of the Scripture and Disbelieve in Part'
    AND t.sura=x.s AND t.aya=x.a AND t.related_sura=y.s AND t.related_aya=y.a)
  RETURNING id)
INSERT INTO public._fix_20261028_partial_belief_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- ===== POST-CHECK (scoped to this theme only; ROLLBACK instead of COMMIT if off) =====
SELECT count(*) AS theme_rows FROM thematic_cross_references_v2 WHERE theme='Believe in Part of the Scripture and Disbelieve in Part';  -- expect 20
SELECT count(*) AS asymmetric_pairs FROM thematic_cross_references_v2 x WHERE x.theme='Believe in Part of the Scripture and Disbelieve in Part'
  AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 y WHERE y.theme=x.theme AND y.sura=x.related_sura
    AND y.aya=x.related_aya AND y.related_sura=x.sura AND y.related_aya=x.aya);  -- expect 0
SELECT count(*) AS logged FROM public._fix_20261028_partial_belief_inserted;  -- expect 20

COMMIT;
