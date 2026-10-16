-- Narrow owner staff access (migration 004).
-- Creates only: qh_staff_members, qh_is_staff(), a recovery-disabled qh_account_status()
-- stub, and qh_can_manage_account_archive() returning false.
-- Adds staff-only policies to course admin tables. Does NOT change policies on the other
-- public tables, and does NOT install account recovery or deletion (see 002/003 for that).
-- Migration 002 replaces the qh_account_status and qh_can_manage_account_archive stubs
-- when recovery is enabled.
begin;

create table if not exists public.qh_staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.qh_staff_members enable row level security;
revoke all on public.qh_staff_members from public, anon, authenticated;

create or replace function public.qh_is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
  and exists(select 1 from public.qh_staff_members where user_id = auth.uid())
$$;
revoke all on function public.qh_is_staff() from public, anon;
grant execute on function public.qh_is_staff() to authenticated;

-- Stub: recovery is not enabled, so every signed-in account is active.
create or replace function public.qh_account_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  return jsonb_build_object('state', 'active');
end $$;
revoke all on function public.qh_account_status() from public, anon;
grant execute on function public.qh_account_status() to authenticated;

-- Stub: no recovery administrators until account recovery is enabled.
create or replace function public.qh_can_manage_account_archive()
returns boolean language sql stable security definer set search_path = '' as $$
  select false
$$;
revoke all on function public.qh_can_manage_account_archive() from public, anon;
grant execute on function public.qh_can_manage_account_archive() to authenticated;

-- Owner staff access only.
insert into public.qh_staff_members(user_id)
select id from auth.users where lower(email) = 'magicallife19@gmail.com'
on conflict do nothing;

-- Staff-only permissive policies on course admin tables. Other users keep their current access.
do $$
declare t text;
begin
  foreach t in array array[
    'qh_courses','qh_lessons','qh_course_materials','qh_quizzes','qh_assignments',
    'qh_enrollments','qh_quiz_answers','qh_assignment_submissions'
  ] loop
    execute format('drop policy if exists qh_staff_manage on public.%I', t);
    execute format('create policy qh_staff_manage on public.%I for all to authenticated using (public.qh_is_staff()) with check (public.qh_is_staff())', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
