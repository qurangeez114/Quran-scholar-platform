-- PROPOSED — NOT APPLIED. Make 'Quran Torah Gospel: Scripture Alteration and Concealment' cross-references bidirectional (2026-10-30).
-- Adds only the missing reverse link B->A for each existing A->B. Idempotent; skips duplicates (unique key tcr_v2_unique_key).
-- Rollback: 20261030_scripture_alteration_symmetry_ROLLBACK.sql  Report: 20261030_scripture_alteration_symmetry_REPORT.md

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) AS rows FROM thematic_cross_references_v2 WHERE theme='Quran Torah Gospel: Scripture Alteration and Concealment';  -- expect 296
SELECT count(*) AS missing_reverse FROM thematic_cross_references_v2 a WHERE a.theme='Quran Torah Gospel: Scripture Alteration and Concealment'
  AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 b WHERE b.theme=a.theme AND b.sura=a.related_sura AND b.aya=a.related_aya
                  AND b.related_sura=a.sura AND b.related_aya=a.aya);  -- expect 142

BEGIN;

CREATE TABLE IF NOT EXISTS public._fix_20261030_alteration_sym_inserted (id uuid PRIMARY KEY);
REVOKE ALL ON public._fix_20261030_alteration_sym_inserted FROM anon, authenticated;

WITH ins AS (
  INSERT INTO thematic_cross_references_v2 (theme, sura, aya, related_sura, related_aya, reason, category)
  SELECT DISTINCT a.theme, a.related_sura, a.related_aya, a.sura, a.aya, a.reason, a.category
  FROM thematic_cross_references_v2 a
  WHERE a.theme='Quran Torah Gospel: Scripture Alteration and Concealment'
    AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 b WHERE b.theme=a.theme AND b.sura=a.related_sura AND b.aya=a.related_aya
                    AND b.related_sura=a.sura AND b.related_aya=a.aya)
  ON CONFLICT (theme, sura, aya, related_sura, related_aya) DO NOTHING
  RETURNING id)
INSERT INTO public._fix_20261030_alteration_sym_inserted SELECT id FROM ins ON CONFLICT DO NOTHING;

-- ===== POST-CHECK (inside txn; ROLLBACK instead of COMMIT if anything is off) =====
SELECT count(*) AS rows FROM thematic_cross_references_v2 WHERE theme='Quran Torah Gospel: Scripture Alteration and Concealment';  -- expect 438
SELECT count(*) AS asymmetric FROM thematic_cross_references_v2 a WHERE a.theme='Quran Torah Gospel: Scripture Alteration and Concealment'
  AND NOT EXISTS (SELECT 1 FROM thematic_cross_references_v2 b WHERE b.theme=a.theme AND b.sura=a.related_sura AND b.aya=a.related_aya
                  AND b.related_sura=a.sura AND b.related_aya=a.aya);  -- expect 0
SELECT count(*) AS inserted FROM public._fix_20261030_alteration_sym_inserted;  -- expect 142

COMMIT;
