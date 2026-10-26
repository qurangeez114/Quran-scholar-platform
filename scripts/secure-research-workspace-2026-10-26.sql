-- Production snapshot: security-only owner-based Research Workspace migration

-- Applied in Supabase on October 26, 2026 as migration secure_research_workspace_account_ownership_20261026.

-- Existing 7 ownerless collections, 5 items and 1 note are preserved, inaccessible, NOT reassigned.

-- Do not re-open anonymous reads or grant access based only on a collection title.

BEGIN;

ALTER TABLE public.research_collections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.research_collections ALTER COLUMN user_id SET DEFAULT auth.uid();

REVOKE ALL ON TABLE public.research_collections FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_collections TO authenticated;

DROP POLICY IF EXISTS "allow all research collections" ON public.research_collections;

ALTER TABLE public.research_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.research_items ALTER COLUMN user_id SET DEFAULT auth.uid();

REVOKE ALL ON TABLE public.research_items FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_items TO authenticated;

DROP POLICY IF EXISTS "allow all research items" ON public.research_items;

ALTER TABLE public.research_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.research_notes ALTER COLUMN user_id SET DEFAULT auth.uid();

REVOKE ALL ON TABLE public.research_notes FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_notes TO authenticated;

DROP POLICY IF EXISTS "allow all research notes" ON public.research_notes;

DROP POLICY IF EXISTS "research_collections_delete_own" ON public.research_collections;

CREATE POLICY "research_collections_delete_own" ON public.research_collections FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false)));

DROP POLICY IF EXISTS "research_collections_insert_own" ON public.research_collections;

CREATE POLICY "research_collections_insert_own" ON public.research_collections FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false)));

DROP POLICY IF EXISTS "research_collections_select_own" ON public.research_collections;

CREATE POLICY "research_collections_select_own" ON public.research_collections FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false)));

DROP POLICY IF EXISTS "research_collections_update_own" ON public.research_collections;

CREATE POLICY "research_collections_update_own" ON public.research_collections FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false)));

DROP POLICY IF EXISTS "research_items_delete_own" ON public.research_items;

CREATE POLICY "research_items_delete_own" ON public.research_items FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_items.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_items_insert_own" ON public.research_items;

CREATE POLICY "research_items_insert_own" ON public.research_items FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_items.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_items_select_own" ON public.research_items;

CREATE POLICY "research_items_select_own" ON public.research_items FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_items.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_items_update_own" ON public.research_items;

CREATE POLICY "research_items_update_own" ON public.research_items FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_items.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_items.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_notes_delete_own" ON public.research_notes;

CREATE POLICY "research_notes_delete_own" ON public.research_notes FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_notes.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_notes_insert_own" ON public.research_notes;

CREATE POLICY "research_notes_insert_own" ON public.research_notes FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_notes.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_notes_select_own" ON public.research_notes;

CREATE POLICY "research_notes_select_own" ON public.research_notes FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_notes.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "research_notes_update_own" ON public.research_notes;

CREATE POLICY "research_notes_update_own" ON public.research_notes FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_notes.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false) AND (EXISTS ( SELECT 1
   FROM research_collections c
  WHERE ((c.id = research_notes.collection_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

COMMIT;