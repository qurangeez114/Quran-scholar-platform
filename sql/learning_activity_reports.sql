-- Owner-only, server-side aggregates for admin/learning-activity.html (no row cap in the browser).
-- Additive only (new functions). "Owner" = qh_is_staff(), matching the lms-admin edge function.

create or replace function public.qh_learning_activity_summary(p_days int default 30)
returns table(user_id uuid, person_name text, email text, person_group text,
              course_id uuid, course_title text, page_path text, intervals bigint, active_seconds bigint)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if not public.qh_is_staff() then raise exception 'owner access required' using errcode = '42501'; end if;
  return query
  select a.user_id,
         coalesce(nullif(la.display_name,''), nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1), 'Unknown'),
         u.email::text,
         case when exists (select 1 from public.qh_staff_members s where s.user_id = a.user_id) then 'staff'
              when la.role = 'instructor' then 'instructor' else 'student' end,
         a.course_id, c.title, a.page_path, count(*), coalesce(sum(a.active_seconds),0)::bigint
    from public.qh_learning_activity a
    left join public.qh_lms_accounts la on la.user_id = a.user_id
    left join auth.users u on u.id = a.user_id
    left join public.qh_courses c on c.id = a.course_id
   where a.visited_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days,30), 3650)))
   group by 1,2,3,4,5,6,7
   order by 9 desc;
end $$;
revoke all on function public.qh_learning_activity_summary(int) from public, anon;
grant execute on function public.qh_learning_activity_summary(int) to authenticated;

-- Per-lesson funnel for enrolled students: who opened, who completed, and where each student stopped
-- (their furthest lesson reached, by lesson_order, counting completion or any lesson activity ever).
create or replace function public.qh_learning_lesson_funnel(p_course uuid default null)
returns table(course_id uuid, course_title text, lesson_id uuid, lesson_order int, lesson_title text,
              enrolled bigint, opened bigint, completed bigint, stopped_here bigint, active_seconds bigint)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if not public.qh_is_staff() then raise exception 'owner access required' using errcode = '42501'; end if;
  return query
  with students as (
    select e.course_id, e.user_id from public.qh_enrollments e
     where (p_course is null or e.course_id = p_course)
       and not exists (select 1 from public.qh_staff_members s where s.user_id = e.user_id)
       and not exists (select 1 from public.qh_lms_accounts la where la.user_id = e.user_id and la.role = 'instructor')
  ), touched as (
    select l.course_id, l.id lesson_id, l.lesson_order, s.user_id,
           bool_or(p.completed) is true as done,
           (count(a.id) > 0 or bool_or(p.completed) is true) as opened,
           coalesce(sum(a.active_seconds),0) secs
      from public.qh_lessons l
      join students s on s.course_id = l.course_id
      left join public.qh_learning_activity a on a.lesson_id = l.id and a.user_id = s.user_id
      left join public.qh_student_progress p on p.lesson_id = l.id and p.user_id = s.user_id
     group by 1,2,3,4
  ), furthest as (
    select t.course_id, t.user_id, max(t.lesson_order) fo from touched t where t.opened group by 1,2
  )
  select l.course_id, c.title, l.id, l.lesson_order, l.title,
         (select count(*) from students s where s.course_id = l.course_id),
         count(t.user_id) filter (where t.opened),
         count(t.user_id) filter (where t.done),
         (select count(*) from furthest f where f.course_id = l.course_id and f.fo = l.lesson_order),
         coalesce(sum(t.secs),0)::bigint
    from public.qh_lessons l
    join public.qh_courses c on c.id = l.course_id
    left join touched t on t.lesson_id = l.id
   where (p_course is null or l.course_id = p_course)
   group by l.course_id, c.title, l.id, l.lesson_order, l.title
   order by c.title, l.lesson_order;
end $$;
revoke all on function public.qh_learning_lesson_funnel(uuid) from public, anon;
grant execute on function public.qh_learning_lesson_funnel(uuid) to authenticated;
