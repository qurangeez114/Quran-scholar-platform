-- Issue course certificates on the server. Apply after 20261117090000_owner_manage_all_courses.sql.
--
-- Problem: the lesson page inserted into public.qh_certificates directly from the
-- browser. There is (correctly) no INSERT policy for students, so completing a
-- course failed with "new row violates row-level security policy for table
-- qh_certificates" and no certificate was created. None of the earlier unapplied
-- migrations (20261104_academic_standards, 20261104b_quiz_integrity_public_reads,
-- 20261116*) issues certificates; 20261104b only adds read-only verification.
--
-- Fix: public.qh_issue_certificate(course) checks everything itself and only then
-- inserts, with a server-generated code. Students still cannot insert, edit or
-- delete certificate rows directly. Safe to run more than once.
--
-- A certificate is issued only when the caller:
--   * is signed in, active, and has replaced any temporary password;
--   * is enrolled in the course, and the course has at least one lesson;
--   * has a completed progress row for EVERY lesson in the course;
--   * has a passing attempt (score >= max(90, quiz pass mark)) for every quiz lesson;
--   * has submitted work for every assignment lesson.
-- If the caller already has a certificate for the course, that one is returned.

create or replace function public.qh_issue_certificate(p_course_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cert public.qh_certificates;
  v_total int;
  v_missing int;
  v_score int;
begin
  if v_uid is null then
    raise exception 'Sign in to receive a certificate.' using errcode = '28000';
  end if;
  if exists (select 1 from public.qh_lms_accounts a
             where a.user_id = v_uid and (not a.active or a.must_change_password)) then
    raise exception 'Account access is restricted.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.qh_enrollments e
                 where e.course_id = p_course_id and e.user_id = v_uid) then
    raise exception 'You are not enrolled in this course.' using errcode = '42501';
  end if;

  select * into v_cert from public.qh_certificates
   where user_id = v_uid and course_id = p_course_id;
  if found then return to_jsonb(v_cert); end if;

  select count(*) into v_total from public.qh_lessons where course_id = p_course_id;
  if v_total = 0 then
    raise exception 'This course has no lessons yet.' using errcode = 'check_violation';
  end if;

  -- Every lesson completed.
  select count(*) into v_missing from public.qh_lessons l
   where l.course_id = p_course_id and not exists (
     select 1 from public.qh_student_progress p
      where p.lesson_id = l.id and p.user_id = v_uid and p.completed);
  if v_missing > 0 then
    raise exception 'Complete every lesson first (% remaining).', v_missing using errcode = 'check_violation';
  end if;

  -- Every quiz lesson passed with a recorded attempt.
  select count(*) into v_missing from public.qh_lessons l
   where l.course_id = p_course_id and l.lesson_type = 'quiz' and not exists (
     select 1 from public.qh_quizzes q join public.qh_quiz_answers a on a.quiz_id = q.id
      where q.lesson_id = l.id and a.user_id = v_uid and a.passed
        and a.score >= greatest(90, coalesce(q.passing_score, 90)));
  if v_missing > 0 then
    raise exception 'Pass every quiz first (% remaining).', v_missing using errcode = 'check_violation';
  end if;

  -- Every assignment lesson has submitted work.
  select count(*) into v_missing from public.qh_lessons l
   where l.course_id = p_course_id and l.lesson_type = 'assignment' and not exists (
     select 1 from public.qh_assignments s join public.qh_assignment_submissions w on w.assignment_id = s.id
      where s.lesson_id = l.id and w.user_id = v_uid);
  if v_missing > 0 then
    raise exception 'Submit every assignment first (% remaining).', v_missing using errcode = 'check_violation';
  end if;

  -- Final score: average of best quiz scores, if the course has quizzes.
  select round(avg(best))::int into v_score from (
    select max(a.score) best from public.qh_lessons l
      join public.qh_quizzes q on q.lesson_id = l.id
      join public.qh_quiz_answers a on a.quiz_id = q.id and a.user_id = v_uid
     where l.course_id = p_course_id group by l.id) s;

  insert into public.qh_certificates (user_id, course_id, certificate_code, completion_date, score)
  values (v_uid, p_course_id,
          'QH-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 16)),
          current_date, v_score)
  on conflict (user_id, course_id) do nothing
  returning * into v_cert;
  if not found then
    select * into v_cert from public.qh_certificates where user_id = v_uid and course_id = p_course_id;
  end if;
  return to_jsonb(v_cert);
end;
$$;

revoke all on function public.qh_issue_certificate(uuid) from public, anon;
grant execute on function public.qh_issue_certificate(uuid) to authenticated;

-- Students keep read access to their own certificates; only the function writes.
revoke insert, update, delete on public.qh_certificates from anon, authenticated;
