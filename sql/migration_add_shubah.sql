-- ============================================================
-- MIGRATION: Add Shu'bah 'an 'Asim as the 5th equally-supported riwayah
-- Run this in Supabase SQL editor (same place you ran prior migrations).
-- Safe to re-run: every statement uses IF NOT EXISTS.
-- ============================================================

-- 1) ayas — verse text column for Shu'bah, parallel to arabic_warsh/arabic_qalun/arabic_duri
ALTER TABLE ayas
  ADD COLUMN IF NOT EXISTS arabic_shubah TEXT;

-- 2) riwayat_variants — mechanical word-diff index (powers "Verses with Variants")
ALTER TABLE riwayat_variants
  ADD COLUMN IF NOT EXISTS shubah_word    TEXT,
  ADD COLUMN IF NOT EXISTS shubah_differs BOOLEAN DEFAULT FALSE;

-- Helpful index so filtering "Shu'bah differs" stays fast at scale,
-- matching whatever indexing you already have on warsh_differs/qalun_differs/duri_differs.
CREATE INDEX IF NOT EXISTS idx_riwayat_variants_shubah_differs
  ON riwayat_variants (shubah_differs)
  WHERE shubah_differs = TRUE;

-- 3) variant_significance — curated meaning-changing entries
ALTER TABLE variant_significance
  ADD COLUMN IF NOT EXISTS shubah_word        TEXT,
  ADD COLUMN IF NOT EXISTS shubah_meaning_en  TEXT;

-- ============================================================
-- Sanity checks — run these after the ALTERs to confirm the columns exist
-- ============================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'ayas' AND column_name LIKE 'arabic_%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'riwayat_variants' AND column_name LIKE '%shubah%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'variant_significance' AND column_name LIKE '%shubah%';

-- ============================================================
-- Quick row-count check once data is loaded (run later, not now):
-- ============================================================
-- SELECT
--   COUNT(*) FILTER (WHERE arabic_warsh  IS NOT NULL) AS warsh_rows,
--   COUNT(*) FILTER (WHERE arabic_qalun  IS NOT NULL) AS qalun_rows,
--   COUNT(*) FILTER (WHERE arabic_duri   IS NOT NULL) AS duri_rows,
--   COUNT(*) FILTER (WHERE arabic_shubah IS NOT NULL) AS shubah_rows,
--   COUNT(*) AS total_ayas
-- FROM ayas;
