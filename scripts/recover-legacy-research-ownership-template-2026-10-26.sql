-- Admin-assisted LEGACY Research Workspace ownership recovery — template only.
-- DO NOT execute before verifying the rightful owner of each collection.
-- Historical records have NULL user_id because the original interface did not
-- authenticate researchers. Screenshots/titles alone do not prove ownership.
-- This script deliberately fails until both the destination account UUID and
-- explicit approved collection IDs are substituted by a privileged operator.
-- Run using Supabase SQL Editor with elevated database privileges, never with
-- browser keys. Preserve backups and audit the affected records.

BEGIN;

DO $migration$
DECLARE
  verified_account uuid := NULL;  -- replace after checking auth.users
  approved_collection_ids uuid[] := ARRAY[]::uuid[];  -- explicit reviewed IDs
  matched_collections integer;
  changed_collections integer;
  changed_items integer;
  changed_notes integer;
BEGIN
  IF verified_account IS NULL OR coalesce(array_length(approved_collection_ids,1),0)=0 THEN
    RAISE EXCEPTION 'Owner recovery requires an individually verified auth account and collection IDs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=verified_account AND coalesce(is_anonymous,false)=false) THEN
    RAISE EXCEPTION 'Target is not a registered verified account';
  END IF;
  SELECT count(*) INTO matched_collections
  FROM public.research_collections
  WHERE id=ANY(approved_collection_ids) AND user_id IS NULL;
  IF matched_collections <> array_length(approved_collection_ids,1) THEN
    RAISE EXCEPTION 'Collection missing, already claimed, or approval list contains duplicates';
  END IF;
  UPDATE public.research_collections SET user_id=verified_account
  WHERE id=ANY(approved_collection_ids) AND user_id IS NULL;
  GET DIAGNOSTICS changed_collections=ROW_COUNT;

  UPDATE public.research_items SET user_id=verified_account
  WHERE collection_id=ANY(approved_collection_ids) AND user_id IS NULL;
  GET DIAGNOSTICS changed_items=ROW_COUNT;

  UPDATE public.research_notes SET user_id=verified_account
  WHERE collection_id=ANY(approved_collection_ids) AND user_id IS NULL;
  GET DIAGNOSTICS changed_notes=ROW_COUNT;

  RAISE NOTICE 'Recovered % collections, % items, % notes; originals preserved.',
    changed_collections,changed_items,changed_notes;
END $migration$;

COMMIT;

-- Ownership review (privileged session; avoid sharing other users' records):
-- SELECT id, title, created_at, user_id FROM public.research_collections WHERE user_id IS NULL ORDER BY created_at;
-- SELECT collection_id, count(*) FROM public.research_items WHERE user_id IS NULL GROUP BY 1;
-- SELECT collection_id, count(*) FROM public.research_notes WHERE user_id IS NULL GROUP BY 1;
