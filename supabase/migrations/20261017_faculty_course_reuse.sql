-- Faculty reuse is a separate, owner-controlled choice from student discovery.
-- Existing public/private course visibility is preserved. No course is
-- automatically made shareable with other instructors.
alter table public.qh_courses
  add column if not exists faculty_reuse_enabled boolean not null default false;

create table if not exists public.qh_academic_course_inclusions(
  host_course_id uuid not null references public.qh_courses(id) on delete cascade,
  source_course_id uuid not null references public.qh_courses(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(host_course_id, source_course_id),
  constraint different_source_course check(host_course_id<>source_course_id)
);
create index if not exists qh_academic_course_inclusions_source
  on public.qh_academic_course_inclusions(source_course_id);
alter table public.qh_academic_course_inclusions enable row level security;
revoke all on public.qh_academic_course_inclusions from public,anon,authenticated;
grant all on public.qh_academic_course_inclusions to service_role;

-- Source lessons can be read *only while*: (1) the source creator still
-- permits instructor reuse, (2) source/host are active, (3) the requesting
-- student has an actual enrollment in the hosting instructor's class.
-- This grants no access to another instructor's gradebook, roster, or uploads.
create or replace function qh_lms_private.can_learn(course uuid)
returns boolean language sql stable security definer set search_path to '' as $func$
select auth.uid() is not null
 and not exists(
   select 1 from public.qh_lms_accounts a
   where a.user_id=auth.uid() and (not a.active or a.must_change_password)
 )
 and exists(
   select 1 from public.qh_courses c
   where c.id=course and (c.access_closes_at is null or c.access_closes_at>now())
 )
 and (
   qh_lms_private.can_manage_course(course)
   or exists(
     select 1 from public.qh_enrollments e
     where e.course_id=course and e.user_id=auth.uid()
   )
   or exists(
     select 1 from public.qh_academic_course_inclusions inc
     join public.qh_courses source on source.id=inc.source_course_id
     join public.qh_courses host on host.id=inc.host_course_id
     join public.qh_enrollments e on e.course_id=host.id
     where inc.source_course_id=course
       and e.user_id=auth.uid()
       and source.faculty_reuse_enabled=true
       and source.is_published=true
       and (source.access_closes_at is null or source.access_closes_at>now())
       and (host.access_closes_at is null or host.access_closes_at>now())
   )
 )
$func$;

-- Preserve the private course RLS rules. Add a narrow student SELECT rule
-- only for source courses shared into a class the student is enrolled in.
drop policy if exists lms_courses_included_by_faculty on public.qh_courses;
create policy lms_courses_included_by_faculty on public.qh_courses
  for select to authenticated
  using (
    is_published=true and faculty_reuse_enabled=true
    and (access_closes_at is null or access_closes_at>now())
    and qh_lms_private.can_learn(id)
  );

comment on column public.qh_courses.faculty_reuse_enabled is
  'Explicit creator-controlled permission for instructors to include linked course lessons in their own classes; independent of public/private student visibility.';
comment on table public.qh_academic_course_inclusions is
  'Source authorship remains unchanged. Students use the original linked lessons through active host-course enrollment; no automatic source enrollment or grade transfer.';
