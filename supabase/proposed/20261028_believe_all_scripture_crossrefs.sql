-- PROPOSED — NOT APPLIED. New theme 'Believe in All Scripture': full symmetric clique of 17 verses (17 x 16 = 272 rows).
-- Idempotent: NOT EXISTS guard + ON CONFLICT on existing UNIQUE constraint tcr_v2_unique_key (theme, sura, aya, related_sura, related_aya).
-- Rollback: 20261028_believe_all_scripture_crossrefs_ROLLBACK.sql. Report: 20261028_believe_all_scripture_crossrefs_REPORT.md

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) AS theme_rows FROM thematic_cross_references_v2 WHERE theme='Believe in All Scripture';  -- expect 0
SELECT count(*) AS missing_pairs FROM (VALUES (2,136),(2,285),(3,84),(4,136),(4,150),(2,91),(3,7),(2,85),(4,47),(29,46),(2,4),(2,177),(3,119),(4,152),(5,44),(5,47),(5,68)) a(s,a) CROSS JOIN (VALUES (2,136),(2,285),(3,84),(4,136),(4,150),(2,91),(3,7),(2,85),(4,47),(29,46),(2,4),(2,177),(3,119),(4,152),(5,44),(5,47),(5,68)) b(s,a)
WHERE (a.s,a.a)<>(b.s,b.a) AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 x
  WHERE x.theme='Believe in All Scripture' AND x.sura=a.s AND x.aya=a.a AND x.related_sura=b.s AND x.related_aya=b.a);  -- expect 272

BEGIN;

CREATE TABLE IF NOT EXISTS public._fix_20261028_believe_all_inserted (id uuid PRIMARY KEY);
REVOKE ALL ON public._fix_20261028_believe_all_inserted FROM anon, authenticated;

WITH m(s,a) AS (VALUES (2,136),(2,285),(3,84),(4,136),(4,150),(2,91),(3,7),(2,85),(4,47),(29,46),(2,4),(2,177),(3,119),(4,152),(5,44),(5,47),(5,68)),
ins AS (
  INSERT INTO thematic_cross_references_v2 (theme, sura, aya, related_sura, related_aya, reason, category)
  SELECT 'Believe in All Scripture', x.s, x.a, y.s, y.a, 'Thematic cross-reference', 'Believe in All Scripture'
  FROM m x JOIN m y ON (x.s,x.a)<>(y.s,y.a)
  WHERE NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 t WHERE t.theme='Believe in All Scripture'
    AND t.sura=x.s AND t.aya=x.a AND t.related_sura=y.s AND t.related_aya=y.a)
  ON CONFLICT ON CONSTRAINT tcr_v2_unique_key DO NOTHING
  RETURNING id)
INSERT INTO public._fix_20261028_believe_all_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- ===== POST-CHECK (this theme only; ROLLBACK instead of COMMIT if off) =====
SELECT count(*) AS theme_rows FROM thematic_cross_references_v2 WHERE theme='Believe in All Scripture';  -- expect 272
SELECT count(*) AS asymmetric_pairs FROM thematic_cross_references_v2 x WHERE x.theme='Believe in All Scripture'
  AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 y WHERE y.theme=x.theme AND y.sura=x.related_sura
    AND y.aya=x.related_aya AND y.related_sura=x.sura AND y.related_aya=x.aya);  -- expect 0
SELECT count(*) AS logged FROM public._fix_20261028_believe_all_inserted;  -- expect 272

COMMIT;
