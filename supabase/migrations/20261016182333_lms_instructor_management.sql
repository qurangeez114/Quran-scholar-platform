-- Owner permissions remain in qh_staff_members. Instructors are never staff.
create table public.qh_lms_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 display_name text not null,
 role text not null check(role in ('instructor','student')),
 managed_by uuid not null references auth.users(id),
 country text not null default '', city text not null default '',
 active boolean not null default true,
 must_change_password boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.qh_lms_accounts enable row level security;
revoke all on public.qh_lms_accounts from anon, authenticated;
grant select on public.qh_lms_accounts to authenticated;
grant all on public.qh_lms_accounts to service_role;
create policy lms_account_read on public.qh_lms_accounts for select to authenticated
 using(user_id=(select auth.uid()) or public.qh_is_staff());
create index qh_lms_accounts_location on public.qh_lms_accounts(country,city);
create index qh_lms_accounts_manager on public.qh_lms_accounts(managed_by);
create schema if not exists qh_lms_private;
revoke all on schema qh_lms_private from public;
grant usage on schema qh_lms_private to authenticated,service_role;
-- Narrow internal lookups avoid policy recursion; no user-editable JWT metadata.
create function qh_lms_private.is_instructor() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.qh_lms_accounts
 where user_id=auth.uid() and role='instructor' and active and not must_change_password)
$$;
create function qh_lms_private.can_manage_course(course uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.qh_is_staff() or
 (qh_lms_private.is_instructor() and exists(select 1 from public.qh_courses
 where id=course and created_by=auth.uid())))
$$;
create function qh_lms_private.can_manage_lesson(lesson uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.qh_lessons
 where id=lesson and qh_lms_private.can_manage_course(course_id))
$$;
create function qh_lms_private.can_learn(course uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and
 not exists(select 1 from public.qh_lms_accounts where user_id=auth.uid()
 and (not active or must_change_password)) and
 (qh_lms_private.can_manage_course(course) or exists(select 1 from public.qh_enrollments
 where course_id=course and user_id=auth.uid()))
$$;
revoke all on all functions in schema qh_lms_private from public,anon;
grant execute on all functions in schema qh_lms_private to authenticated,service_role;
create policy lms_courses_read on public.qh_courses for select to anon,authenticated using(is_published);
create policy lms_courses_teach on public.qh_courses for all to authenticated
 using(created_by=(select auth.uid()) and qh_lms_private.is_instructor())
 with check(created_by=(select auth.uid()) and qh_lms_private.is_instructor());
create policy lms_lessons_teach on public.qh_lessons for all to authenticated
 using(qh_lms_private.can_manage_course(course_id)) with check(qh_lms_private.can_manage_course(course_id));
create policy lms_lessons_read on public.qh_lessons for select to authenticated using(qh_lms_private.can_learn(course_id));
create policy lms_quizzes_teach on public.qh_quizzes for all to authenticated
 using(qh_lms_private.can_manage_lesson(lesson_id)) with check(qh_lms_private.can_manage_lesson(lesson_id));
create policy lms_quizzes_read on public.qh_quizzes for select to authenticated using(exists(
 select 1 from public.qh_lessons where id=lesson_id and qh_lms_private.can_learn(course_id)));
create policy lms_assignments_teach on public.qh_assignments for all to authenticated
 using(qh_lms_private.can_manage_lesson(lesson_id)) with check(qh_lms_private.can_manage_lesson(lesson_id));
create policy lms_assignments_read on public.qh_assignments for select to authenticated using(exists(
 select 1 from public.qh_lessons where id=lesson_id and qh_lms_private.can_learn(course_id)));
create policy lms_materials_teach on public.qh_course_materials for all to authenticated
 using(qh_lms_private.can_manage_course(course_id)) with check(qh_lms_private.can_manage_course(course_id));
create policy lms_materials_read on public.qh_course_materials for select to authenticated using(qh_lms_private.can_learn(course_id));
create policy lms_enrollments_read on public.qh_enrollments for select to authenticated
 using(user_id=(select auth.uid()) or qh_lms_private.can_manage_course(course_id));
create policy lms_enrollments_update on public.qh_enrollments for update to authenticated
 using(user_id=(select auth.uid()) and qh_lms_private.can_learn(course_id))
 with check(user_id=(select auth.uid()) and qh_lms_private.can_learn(course_id));
create policy lms_attempts_read on public.qh_quiz_answers for select to authenticated using(exists(
 select 1 from public.qh_quizzes where id=quiz_id and qh_lms_private.can_manage_lesson(lesson_id)));
create policy lms_attempts_insert on public.qh_quiz_answers for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.qh_quizzes q
 join public.qh_lessons l on l.id=q.lesson_id where q.id=quiz_id and qh_lms_private.can_learn(l.course_id)));
create policy lms_progress_teach_read on public.qh_student_progress for select to authenticated
 using(qh_lms_private.can_manage_course(course_id));
create policy lms_submissions_read on public.qh_assignment_submissions for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.qh_assignments a
 where a.id=assignment_id and qh_lms_private.can_manage_lesson(a.lesson_id)));
create policy lms_submissions_insert on public.qh_assignment_submissions for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.qh_assignments a join public.qh_lessons l on l.id=a.lesson_id
 where a.id=assignment_id and qh_lms_private.can_learn(l.course_id)));
create policy lms_submissions_grade on public.qh_assignment_submissions for update to authenticated
 using(exists(select 1 from public.qh_assignments a where a.id=assignment_id and qh_lms_private.can_manage_lesson(a.lesson_id)))
 with check(exists(select 1 from public.qh_assignments a where a.id=assignment_id and qh_lms_private.can_manage_lesson(a.lesson_id)));
grant select,insert,update,delete on public.qh_courses,public.qh_lessons,public.qh_quizzes,public.qh_assignments,public.qh_course_materials to authenticated;
grant select,update on public.qh_enrollments to authenticated;
grant select,insert on public.qh_quiz_answers to authenticated;
grant select,insert,update on public.qh_student_progress,public.qh_assignment_submissions to authenticated;
grant select on public.qh_courses to anon;
create policy lms_courses_enrolled on public.qh_courses for select to authenticated
 using(exists(select 1 from public.qh_enrollments e where e.course_id=qh_courses.id and e.user_id=(select auth.uid())));
-- A later practice attempt must not erase a completed quiz lesson.
create function qh_lms_private.keep_quiz_completion() returns trigger
language plpgsql security invoker set search_path='' as $$
declare lesson_course uuid; kind text; best integer; has_pass boolean;
begin
 select l.course_id,l.lesson_type into lesson_course,kind from public.qh_lessons l where l.id=new.lesson_id;
 if lesson_course is distinct from new.course_id then raise exception 'Lesson does not belong to this course'; end if;
 if kind='quiz' then
  select max(a.score),coalesce(bool_or(a.passed and a.score>=greatest(90,coalesce(q.passing_score,90))),false)
   into best,has_pass from public.qh_quiz_answers a join public.qh_quizzes q on q.id=a.quiz_id
   where q.lesson_id=new.lesson_id and a.user_id=new.user_id;
  new.quiz_score:=best;
  new.completed:=has_pass or (tg_op='UPDATE' and old.completed);
  if new.completed then new.completed_at:=coalesce(case when tg_op='UPDATE' and old.completed then old.completed_at end,new.completed_at,now());
  else new.completed_at:=null; end if;
 end if;
 return new;
end $$;
revoke all on function qh_lms_private.keep_quiz_completion() from public,anon;
create trigger lms_preserve_quiz_completion before insert or update on public.qh_student_progress
 for each row execute function qh_lms_private.keep_quiz_completion();
-- Recover completion from already-saved passing attempts, preserving attempt history.
insert into public.qh_student_progress(user_id,course_id,lesson_id,quiz_score,completed,completed_at)
 select a.user_id,l.course_id,l.id,max(a.score),true,min(a.submitted_at)
 from public.qh_quiz_answers a join public.qh_quizzes q on q.id=a.quiz_id join public.qh_lessons l on l.id=q.lesson_id
 where a.passed and a.score>=greatest(90,coalesce(q.passing_score,90))
 group by a.user_id,l.course_id,l.id
 on conflict(user_id,lesson_id) do update set quiz_score=excluded.quiz_score,completed=true,completed_at=coalesce(qh_student_progress.completed_at,excluded.completed_at),updated_at=now();
update public.qh_enrollments e set completed_lessons=s.done,progress_pct=case when s.total>0 then round(100.0*s.done/s.total)::integer else 0 end
 from (select e0.id,count(l.id) total,count(l.id) filter(where p.completed) done
 from public.qh_enrollments e0 left join public.qh_lessons l on l.course_id=e0.course_id
 left join public.qh_student_progress p on p.lesson_id=l.id and p.user_id=e0.user_id group by e0.id) s where s.id=e.id;
