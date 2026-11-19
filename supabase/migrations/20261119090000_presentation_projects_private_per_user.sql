-- Presentation projects become private to each signed-in member.
--
-- Before: anyone, signed in or not, could list, open, change or delete every
-- cloud presentation (four "true" policies for anon and authenticated), and
-- projects were only grouped by a free-text owner_label such as "default".
--
-- After:
--   * Visitors (anon) have no access at all.
--   * A signed-in member can list, open, change and delete only their own
--     projects. The owner is set by the database from the signed-in account
--     (owner_id defaults to auth.uid()) and cannot be set to someone else.
--   * Site staff (public.qh_is_staff(), i.e. a row in public.qh_staff_members)
--     can view every member's projects, read-only. Staff cannot change or
--     delete another member's project.
--
-- Existing rows: when this was written (2026-11-19) the table had no rows.
-- Any row that exists without an owner when this runs cannot be assigned to a
-- member, so it is removed rather than left readable by no one.

alter table public.presentation_projects
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.presentation_projects
  alter column owner_id set default auth.uid();

delete from public.presentation_projects where owner_id is null;

alter table public.presentation_projects
  alter column owner_id set not null;

create index if not exists presentation_projects_owner_updated_idx
  on public.presentation_projects (owner_id, updated_at desc);

alter table public.presentation_projects enable row level security;

drop policy if exists presentation_projects_select_anon on public.presentation_projects;
drop policy if exists presentation_projects_insert_anon on public.presentation_projects;
drop policy if exists presentation_projects_update_anon on public.presentation_projects;
drop policy if exists presentation_projects_delete_anon on public.presentation_projects;

revoke all on public.presentation_projects from anon;
revoke all on public.presentation_projects from authenticated;
grant select, insert, update, delete on public.presentation_projects to authenticated;

create policy presentation_projects_owner_or_staff_select
  on public.presentation_projects for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.qh_is_staff()));

create policy presentation_projects_owner_insert
  on public.presentation_projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy presentation_projects_owner_update
  on public.presentation_projects for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy presentation_projects_owner_delete
  on public.presentation_projects for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Staff overview: every member's presentations with the owner's email, for the
-- "All members' presentations" list on presentation.html. Staff only.
create or replace function public.qh_presentation_projects_admin_list(p_limit integer default 200)
returns table (
  id text,
  name text,
  title text,
  slide_count integer,
  owner_email text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.qh_is_staff() then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.title,
           coalesce(jsonb_array_length(case when jsonb_typeof(p.slides) = 'array' then p.slides end), 0)::integer,
           u.email::text,
           p.updated_at
    from public.presentation_projects p
    left join auth.users u on u.id = p.owner_id
    order by p.updated_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

revoke all on function public.qh_presentation_projects_admin_list(integer) from public, anon;
grant execute on function public.qh_presentation_projects_admin_list(integer) to authenticated;
