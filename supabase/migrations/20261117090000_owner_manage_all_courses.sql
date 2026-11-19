-- Site owners (rows in public.qh_staff_members, checked by public.qh_is_staff())
-- can read, edit, publish, unpublish and delete ANY course, including courses
-- created by instructors. Apply after 20261116130000_publish_requires_syllabus.sql.
--
-- Before this, the only write policy on qh_courses was lms_courses_teach
-- (created_by = auth.uid() and is_instructor()), so an owner could not manage
-- an instructor's course. Lessons, quizzes, assignments, materials, enrollments,
-- quiz results, progress and submissions already allow owners through
-- qh_lms_private.can_manage_course(), which this migration restates unchanged.
--
-- Not changed: instructors still manage only their own courses; students and
-- anonymous visitors gain nothing. Owners do not get a new INSERT rule here.
-- Publish readiness and syllabus rules are triggers, so they apply to owners too.
-- Safe to run more than once.

-- Restated so the owner rule is explicit (same body as 20261016182333).
create or replace function qh_lms_private.can_manage_course(course uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
    public.qh_is_staff()
    or (qh_lms_private.is_instructor() and exists (
      select 1 from public.qh_courses where id = course and created_by = auth.uid()))
  )
$$;
revoke all on function qh_lms_private.can_manage_course(uuid) from public, anon;
grant execute on function qh_lms_private.can_manage_course(uuid) to authenticated, service_role;

drop policy if exists lms_courses_owner_read on public.qh_courses;
create policy lms_courses_owner_read on public.qh_courses
  for select to authenticated
  using ((select public.qh_is_staff()));

drop policy if exists lms_courses_owner_update on public.qh_courses;
create policy lms_courses_owner_update on public.qh_courses
  for update to authenticated
  using ((select public.qh_is_staff()))
  with check ((select public.qh_is_staff()));

drop policy if exists lms_courses_owner_delete on public.qh_courses;
create policy lms_courses_owner_delete on public.qh_courses
  for delete to authenticated
  using ((select public.qh_is_staff()));
