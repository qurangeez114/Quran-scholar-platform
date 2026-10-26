-- Provision one private starter collection for every registered QuranHikma account.
-- Production applied 2026-10-26 via Supabase migration
-- private_starter_collection_per_registered_account_20261026
-- Auth trigger function is located in a NON-EXPOSED schema with locked-down EXECUTE.
-- Existing user-created collections are preserved. Anonymous visitors get none.
BEGIN;

ALTER TABLE public.research_collections
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS research_collections_one_starter_per_user
  ON public.research_collections (user_id)
  WHERE is_default;

CREATE SCHEMA IF NOT EXISTS qh_research_private;
REVOKE ALL ON SCHEMA qh_research_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION qh_research_private.create_private_starter_collection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $body$
BEGIN
  IF NEW.is_anonymous IS TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.research_collections
    (user_id, title, description, visibility, is_default)
  VALUES
    (NEW.id, 'My Collection',
     'Your private starter collection for saved verses, notes and sources.',
     'private', true)
  ON CONFLICT (user_id) WHERE is_default DO NOTHING;

  RETURN NEW;
END;
$body$;

REVOKE ALL ON FUNCTION qh_research_private.create_private_starter_collection()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS qh_research_create_starter_on_signup ON auth.users;
CREATE TRIGGER qh_research_create_starter_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION qh_research_private.create_private_starter_collection();

DROP TRIGGER IF EXISTS qh_research_create_starter_on_upgrade ON auth.users;
CREATE TRIGGER qh_research_create_starter_on_upgrade
AFTER UPDATE OF is_anonymous ON auth.users
FOR EACH ROW
WHEN (OLD.is_anonymous IS DISTINCT FROM NEW.is_anonymous)
EXECUTE FUNCTION qh_research_private.create_private_starter_collection();

INSERT INTO public.research_collections
    (user_id,title,description,visibility,is_default)
SELECT id, 'My Collection',
       'Your private starter collection for saved verses, notes and sources.',
       'private', true
FROM auth.users
WHERE COALESCE(is_anonymous,false)=false
ON CONFLICT (user_id) WHERE is_default DO NOTHING;

COMMIT;

-- Regression (read-only):
-- SELECT count(*) FROM auth.users WHERE COALESCE(is_anonymous,false)=false;
-- SELECT count(distinct user_id) FROM public.research_collections WHERE is_default;
-- SELECT count(*) FROM (SELECT user_id FROM public.research_collections
--     WHERE is_default GROUP BY user_id HAVING count(*)>1) duplicates;
-- Confirm authenticated user A sees only their own collections; user B cannot
-- read or edit A's. Existing RLS policies enforce account ownership.
