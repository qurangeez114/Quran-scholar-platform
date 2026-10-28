-- PROPOSED — NOT APPLIED. Confirmation-of-previous-scripture cross-references fix (2026-10-28).
-- Idempotent: re-running inserts/deletes nothing new. Rollback: 20261028_confirmation_crossrefs_ROLLBACK.sql
-- Report: 20261028_confirmation_crossrefs_REPORT.md (expected: +1441 v2 rows, +2 old-table rows, -3 cross_references rows)

-- ===== PRE-CHECK (read-only) =====
SELECT theme, count(*) AS rows FROM thematic_cross_references_v2
WHERE theme IN ('Confirmation of Previous Scripture','Quran Torah Gospel: Confirmation of Previous Scripture',
  'Quran Torah Gospel: Covenant with Israel and Believe the Revelation',
  'Quran Torah Gospel: People of the Book Should Follow Their Scripture','Quran Torah Gospel: Ask the People of the Book')
GROUP BY theme ORDER BY theme;   -- expect 318 / 557 / 20 / 90 / 12
SELECT * FROM cross_references WHERE (source_surah,source_ayah,ref_surah,ref_ayah_start) IN ((6,92,2,238),(10,37,2,2),(46,30,2,108));

BEGIN;

-- Rollback logs (kept after commit so the rollback script can undo exactly this change)
CREATE TABLE IF NOT EXISTS public._fix_20261028_xref_v2_inserted  (id uuid PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public._fix_20261028_xref_old_inserted (id bigint PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public._fix_20261028_xref_deleted (LIKE public.cross_references INCLUDING ALL);
REVOKE ALL ON public._fix_20261028_xref_v2_inserted, public._fix_20261028_xref_old_inserted,
              public._fix_20261028_xref_deleted FROM anon, authenticated;

-- 1+3) Theme membership = current v2 members (source or target) + requested additions; make each theme a full symmetric clique.
WITH themes(theme) AS (VALUES ('Confirmation of Previous Scripture'),('Quran Torah Gospel: Confirmation of Previous Scripture'),
  ('Quran Torah Gospel: Covenant with Israel and Believe the Revelation'),
  ('Quran Torah Gospel: People of the Book Should Follow Their Scripture'),('Quran Torah Gospel: Ask the People of the Book')),
members AS (
  SELECT theme, sura, aya FROM thematic_cross_references_v2 WHERE theme IN (SELECT theme FROM themes)
  UNION SELECT theme, related_sura, related_aya FROM thematic_cross_references_v2 WHERE theme IN (SELECT theme FROM themes)
  UNION VALUES ('Confirmation of Previous Scripture',2,136),('Confirmation of Previous Scripture',3,84),('Confirmation of Previous Scripture',4,47)
),
ins AS (
  INSERT INTO thematic_cross_references_v2 (theme, sura, aya, related_sura, related_aya, reason, category)
  SELECT a.theme, a.sura, a.aya, b.sura, b.aya, 'Thematic cross-reference', a.theme
  FROM members a JOIN members b ON a.theme=b.theme AND (a.sura,a.aya)<>(b.sura,b.aya)
  WHERE NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 x WHERE x.theme=a.theme AND x.sura=a.sura AND x.aya=a.aya
                    AND x.related_sura=b.sura AND x.related_aya=b.aya)
  RETURNING id)
INSERT INTO public._fix_20261028_xref_v2_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- Keep the legacy membership table consistent (fallback path): 2:136, 3:84 (4:47 already present)
WITH ins AS (
  INSERT INTO thematic_cross_references (theme, sura, aya)
  SELECT 'Confirmation of Previous Scripture', s, a FROM (VALUES (2,136),(3,84),(4,47)) v(s,a)
  WHERE NOT EXISTS (SELECT 1 FROM thematic_cross_references x WHERE x.theme='Confirmation of Previous Scripture' AND x.sura=v.s AND x.aya=v.a)
  RETURNING id)
INSERT INTO public._fix_20261028_xref_old_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- 2) Remove bad direct links (backed up first)
INSERT INTO public._fix_20261028_xref_deleted
SELECT * FROM cross_references WHERE (source_surah,source_ayah,ref_surah,ref_ayah_start) IN ((6,92,2,238),(10,37,2,2),(46,30,2,108))
ON CONFLICT DO NOTHING;
DELETE FROM cross_references WHERE (source_surah,source_ayah,ref_surah,ref_ayah_start) IN ((6,92,2,238),(10,37,2,2),(46,30,2,108));

-- ===== POST-CHECK (inside txn; ROLLBACK instead of COMMIT if anything is off) =====
SELECT theme, count(*) AS rows FROM thematic_cross_references_v2
WHERE theme IN ('Confirmation of Previous Scripture','Quran Torah Gospel: Confirmation of Previous Scripture') GROUP BY theme;  -- expect 1056 / 1260
SELECT count(*) AS asymmetric_pairs FROM thematic_cross_references_v2 x
WHERE (x.theme LIKE '%Confirmation of Previous Scripture' OR x.theme LIKE 'Quran Torah Gospel: %')
  AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 y WHERE y.theme=x.theme AND y.sura=x.related_sura AND y.aya=x.related_aya AND y.related_sura=x.sura AND y.related_aya=x.aya); -- expect 0
SELECT (SELECT count(*) FROM public._fix_20261028_xref_v2_inserted) v2_ins,   -- expect 1441
       (SELECT count(*) FROM public._fix_20261028_xref_old_inserted) old_ins, -- expect 2
       (SELECT count(*) FROM public._fix_20261028_xref_deleted) cr_del;       -- expect 3

COMMIT;
