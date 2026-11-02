-- Applied in Supabase as migration 20261102090351.
-- Source associations start unverified; only references with exact locators and URLs may be published.
ALTER TABLE public.ancient_sources
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_locator text,
  ADD COLUMN IF NOT EXISTS relationship_kind text,
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS source_edition text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.ancient_sources DROP CONSTRAINT IF EXISTS ancient_sources_verification_status_check;
ALTER TABLE public.ancient_sources ADD CONSTRAINT ancient_sources_verification_status_check
  CHECK (verification_status IN ('unverified','verified','disputed','rejected'));
ALTER TABLE public.ancient_sources DROP CONSTRAINT IF EXISTS ancient_sources_verified_requires_citation;
ALTER TABLE public.ancient_sources ADD CONSTRAINT ancient_sources_verified_requires_citation CHECK (
  verification_status <> 'verified' OR (
    nullif(btrim(coalesce(source_title,'')),'') IS NOT NULL AND
    nullif(btrim(coalesce(source_locator,'')),'') IS NOT NULL AND
    nullif(btrim(coalesce(reference_link,'')),'') IS NOT NULL AND
    nullif(btrim(coalesce(verification_note,'')),'') IS NOT NULL AND
    relationship_kind IN ('parallel','contrast','context','interpretation')
  )
);
CREATE INDEX IF NOT EXISTS ancient_sources_verified_verse_idx
  ON public.ancient_sources (sura,aya) WHERE verification_status='verified';
