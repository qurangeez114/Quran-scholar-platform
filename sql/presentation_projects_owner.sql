-- Run once. Presentations belong to the account that saved them.
-- Table was empty when this was written (0 rows), so no data is changed.

ALTER TABLE public.presentation_projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.presentation_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presentation_projects_delete_anon ON public.presentation_projects;
DROP POLICY IF EXISTS presentation_projects_insert_anon ON public.presentation_projects;
DROP POLICY IF EXISTS presentation_projects_select_anon ON public.presentation_projects;
DROP POLICY IF EXISTS presentation_projects_update_anon ON public.presentation_projects;

DROP POLICY IF EXISTS presentation_projects_owner_select ON public.presentation_projects;
CREATE POLICY presentation_projects_owner_select ON public.presentation_projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS presentation_projects_owner_insert ON public.presentation_projects;
CREATE POLICY presentation_projects_owner_insert ON public.presentation_projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS presentation_projects_owner_update ON public.presentation_projects;
CREATE POLICY presentation_projects_owner_update ON public.presentation_projects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS presentation_projects_owner_delete ON public.presentation_projects;
CREATE POLICY presentation_projects_owner_delete ON public.presentation_projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
