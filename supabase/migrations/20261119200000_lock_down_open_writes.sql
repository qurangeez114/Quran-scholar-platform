-- Lock down database writes and functions that anyone could use without signing in.
-- Site reads are unchanged; every table below keeps its public SELECT policy.

-- 1) Background functions callable by anyone through /rest/v1/rpc ------------------
-- Rebuilds a concept page's sources from theme_analysis. Not called by the site.
revoke execute on function public.populate_concept_sections(text, integer) from public, anon, authenticated;
-- Bulk-rewrites story_comparison translations. Only the import-translations Netlify
-- function calls it, and that function now uses the service role key.
revoke execute on function public.propagate_translations_to_story_comparison() from public, anon, authenticated;
-- Event-trigger helper; must never be an API endpoint.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
-- Read-only theme counts over a publicly readable table: no need for definer rights.
alter function public.get_all_themes() security invoker;
alter function public.get_all_themes() set search_path = public, pg_temp;
-- public.qh_behavior_ingest stays callable on purpose: it is the visitor-analytics
-- endpoint, validates every input, takes identity only from the JWT and has an
-- empty search_path.

-- 2) Quran translations: anyone could insert or overwrite any verse translation ------
drop policy if exists vt_insert on public.verse_translations;
drop policy if exists vt_update on public.verse_translations;

-- 3) Book annotations: anyone could edit or delete everyone's notes and highlights.
-- The site only adds and reads them.
drop policy if exists "Public update own book_annotations" on public.book_annotations;
drop policy if exists "Public delete own book_annotations" on public.book_annotations;

-- 4) Theme analysis: anyone could overwrite the analysis every visitor sees.
-- Visitors may still save an analysis section that is empty (the page caches its
-- first AI result), but a section that already has content can only be changed
-- through the service role or the SQL editor.
create or replace function public.theme_analysis_keep_existing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  k text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  for k in select jsonb_object_keys(o) loop
    if k in ('updated_at') then continue; end if;
    if k in ('id', 'theme', 'created_at')
       or (o->k is not null and o->k <> 'null'::jsonb and (n->k) is distinct from (o->k)) then
      n := jsonb_set(n, array[k], o->k);
    end if;
  end loop;
  return jsonb_populate_record(new, n);
end;
$$;

drop trigger if exists theme_analysis_keep_existing on public.theme_analysis;
create trigger theme_analysis_keep_existing
  before update on public.theme_analysis
  for each row execute function public.theme_analysis_keep_existing();
