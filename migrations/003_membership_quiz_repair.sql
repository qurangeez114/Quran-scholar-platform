-- Apply after the LMS base schema on staging. Does not assign staff privileges.
begin;
create or replace function public.qh_is_staff() returns boolean
language sql stable set search_path = '' as $$
 select coalesce((auth.jwt()->'app_metadata'->>'role') in ('owner','admin'),false)
     or coalesce((auth.jwt()->'app_metadata'->'roles') ?| array['owner','admin'],false);
$$;
revoke all on function public.qh_is_staff() from public;
grant execute on function public.qh_is_staff() to authenticated;

-- Only an owner/admin may create classes; users cannot grant themselves app_metadata.
drop policy if exists qh_courses_insert on public.qh_courses;
create policy qh_courses_insert on public.qh_courses for insert to authenticated
 with check(created_by=auth.uid() and public.qh_is_staff());
drop policy if exists qh_courses_update on public.qh_courses;
create policy qh_courses_update on public.qh_courses for update to authenticated
 using(created_by=auth.uid() and public.qh_is_staff())
 with check(created_by=auth.uid() and public.qh_is_staff());
drop policy if exists qh_courses_delete on public.qh_courses;
create policy qh_courses_delete on public.qh_courses for delete to authenticated
 using(created_by=auth.uid() and public.qh_is_staff());

-- Repair the original policy's out-of-scope reference to qh_courses.
drop policy if exists qh_lessons_select on public.qh_lessons;
create policy qh_lessons_select on public.qh_lessons for select to authenticated using (
 exists(select 1 from public.qh_courses c where c.id=course_id and
 (c.created_by=auth.uid() or (c.is_published and exists(
 select 1 from public.qh_enrollments e where e.course_id=c.id and e.user_id=auth.uid())))));

drop policy if exists qh_lessons_insert on public.qh_lessons;
create policy qh_lessons_insert on public.qh_lessons for insert to authenticated with check (
 public.qh_is_staff() and exists(select 1 from public.qh_courses c where c.id=course_id and c.created_by=auth.uid()));
drop policy if exists qh_lessons_update on public.qh_lessons;
create policy qh_lessons_update on public.qh_lessons for update to authenticated using (
 public.qh_is_staff() and exists(select 1 from public.qh_courses c where c.id=course_id and c.created_by=auth.uid())) with check (
 public.qh_is_staff() and exists(select 1 from public.qh_courses c where c.id=course_id and c.created_by=auth.uid()));
drop policy if exists qh_lessons_delete on public.qh_lessons;
create policy qh_lessons_delete on public.qh_lessons for delete to authenticated using (
 public.qh_is_staff() and exists(select 1 from public.qh_courses c where c.id=course_id and c.created_by=auth.uid()));
drop policy if exists qh_enrollments_insert on public.qh_enrollments;
create policy qh_enrollments_insert on public.qh_enrollments for insert to authenticated with check (
 user_id=auth.uid() and exists(select 1 from public.qh_courses c where c.id=course_id and c.is_published));

-- Quiz answer keys must not be downloadable by students. Access through checked RPCs.
revoke all on public.qh_quizzes from anon, authenticated;
revoke insert,update,delete on public.qh_quiz_answers from anon, authenticated;

create or replace function public.qh_get_quiz(p_lesson_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q public.qh_quizzes; c public.qh_courses; questions jsonb;
begin
 if auth.uid() is null then raise exception 'Please log in to take quizzes.' using errcode='42501'; end if;
 select c1.* into c from public.qh_courses c1 join public.qh_lessons l on l.course_id=c1.id where l.id=p_lesson_id;
 if c.id is null or not (c.created_by=auth.uid() or (c.is_published and exists(select 1 from public.qh_enrollments e where e.course_id=c.id and e.user_id=auth.uid()))) then
 raise exception 'Enroll in this class to access the quiz.' using errcode='42501'; end if;
 select * into q from public.qh_quizzes where lesson_id=p_lesson_id order by created_at desc limit 1;
 if q.id is null then raise exception 'This quiz has not been created yet.'; end if;
 if c.created_by=auth.uid() and public.qh_is_staff() then questions=q.questions;
 else select jsonb_agg(jsonb_build_object('question',item->'question','options',item->'options') order by n)
 into questions from jsonb_array_elements(q.questions) with ordinality as t(item,n); end if;
 return jsonb_build_object('id',q.id,'questions',questions,'passing_score',q.passing_score);
end $$;

create or replace function public.qh_save_quiz(p_lesson_id uuid,p_questions jsonb,p_passing_score integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare quiz_id uuid; question jsonb;
begin
 if auth.uid() is null or not public.qh_is_staff() or not exists(select 1 from public.qh_lessons l join public.qh_courses c on c.id=l.course_id where l.id=p_lesson_id and c.created_by=auth.uid() and l.lesson_type='quiz') then
 raise exception 'Only the class owner/admin may edit this quiz.' using errcode='42501'; end if;
 if p_passing_score not between 1 and 100 or p_passing_score is null or jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'Invalid quiz settings.'; end if;
 if jsonb_array_length(p_questions) not between 1 and 100 then raise exception 'Add 1 to 100 questions.'; end if;
 for question in select * from jsonb_array_elements(p_questions) loop
 if coalesce(length(trim(question->>'question')),0)=0 or jsonb_typeof(question->'options') is distinct from 'array' then raise exception 'Each question needs text and options.'; end if;
 if jsonb_array_length(question->'options')<2 or question->>'correct_answer' is null or not ((question->'options') ? (question->>'correct_answer')) then raise exception 'Choose a correct answer from the options.'; end if;
 end loop;
 select id into quiz_id from public.qh_quizzes where lesson_id=p_lesson_id order by created_at desc limit 1;
 if quiz_id is null then
 insert into public.qh_quizzes(lesson_id,questions,passing_score) values(p_lesson_id,p_questions,p_passing_score) returning id into quiz_id;
 else update public.qh_quizzes set questions=p_questions,passing_score=p_passing_score,updated_at=now() where id=quiz_id; end if;
 return quiz_id;
end $$;

create or replace function public.qh_submit_quiz(p_quiz_id uuid,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q public.qh_quizzes; c public.qh_courses; correct_count integer; total integer; percentage integer; result_id uuid;
begin
 if auth.uid() is null then raise exception 'Please log in.' using errcode='42501'; end if;
 select * into q from public.qh_quizzes where id=p_quiz_id;
 if q.id is null then raise exception 'Quiz not found.'; end if;
 select c1.* into c from public.qh_courses c1 join public.qh_lessons l on l.course_id=c1.id where l.id=q.lesson_id;
 if not c.is_published or not exists(select 1 from public.qh_enrollments e where e.course_id=c.id and e.user_id=auth.uid()) then raise exception 'Enroll before submitting a quiz.' using errcode='42501'; end if;
 if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Invalid answers.'; end if;
 total=jsonb_array_length(q.questions);
 if total=0 or jsonb_array_length(p_answers)<>total then raise exception 'Answer every question.'; end if;
 select count(*) into correct_count from jsonb_array_elements(q.questions) with ordinality as t(item,n)
 where item->>'correct_answer'=p_answers->>(n::integer-1);
 percentage=round(100.0*correct_count/total);
 insert into public.qh_quiz_answers(quiz_id,user_id,answers,score,passed)
 values(q.id,auth.uid(),p_answers,percentage,percentage>=q.passing_score) returning id into result_id;
 return jsonb_build_object('id',result_id,'correct_count',correct_count,'score',percentage,'passed',percentage>=q.passing_score);
end $$;
revoke all on function public.qh_get_quiz(uuid),public.qh_save_quiz(uuid,jsonb,integer),public.qh_submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.qh_get_quiz(uuid),public.qh_save_quiz(uuid,jsonb,integer),public.qh_submit_quiz(uuid,jsonb) to authenticated;
-- Avoid querying the restricted answer-key table from a student RLS policy.
create or replace function public.qh_owns_quiz(p_quiz_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.qh_quizzes q join public.qh_lessons l on l.id=q.lesson_id
 join public.qh_courses c on c.id=l.course_id where q.id=p_quiz_id and c.created_by=auth.uid() and public.qh_is_staff());
$$;
revoke all on function public.qh_owns_quiz(uuid) from public,anon;
grant execute on function public.qh_owns_quiz(uuid) to authenticated;
drop policy if exists qh_quiz_answers_select on public.qh_quiz_answers;
create policy qh_quiz_answers_select on public.qh_quiz_answers for select to authenticated
 using(user_id=auth.uid() or public.qh_owns_quiz(quiz_id));

create or replace function public.qh_instructor_quiz_results() returns jsonb
language plpgsql security definer set search_path='' as $$
declare results jsonb;
begin
 if auth.uid() is null or not public.qh_is_staff() then raise exception 'Owner/admin access required.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.user_id,'answers',a.answers,'score',a.score,'passed',a.passed,'submitted_at',a.submitted_at,
 'qh_profiles',jsonb_build_object('display_name',coalesce(p.display_name,'Student')),
 'qh_quizzes',jsonb_build_object('title',l.title,'questions',q.questions,'passing_score',q.passing_score)) order by a.submitted_at desc),'[]'::jsonb)
 into results from public.qh_quiz_answers a join public.qh_quizzes q on q.id=a.quiz_id
 join public.qh_lessons l on l.id=q.lesson_id join public.qh_courses c on c.id=l.course_id
 left join public.qh_profiles p on p.user_id=a.user_id where c.created_by=auth.uid();
 return results;
end $$;
revoke all on function public.qh_instructor_quiz_results() from public,anon;
grant execute on function public.qh_instructor_quiz_results() to authenticated;
commit;
