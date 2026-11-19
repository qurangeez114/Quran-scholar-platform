-- Publish-readiness must accept answers stored in qh_quiz_keys, because
-- questions are stripped of correct_answer after save. This check runs
-- before the sync trigger and backfill below.

create or replace function qh_lms_private.assert_course_publishable(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l record;
  q record;
  qn record;
  qq jsonb;
  opts jsonb;
  qtext text;
begin
  if not exists (select 1 from public.qh_lessons where course_id = p_course_id) then
    raise exception 'Before publishing: add at least one lesson.' using errcode = 'check_violation';
  end if;

  for l in
    select id, title, content, lesson_type, video_url
    from public.qh_lessons
    where course_id = p_course_id
  loop
    if coalesce(btrim(l.title), '') = '' then
      raise exception 'Before publishing: give every lesson a title.' using errcode = 'check_violation';
    end if;

    if l.lesson_type = 'text' and coalesce(btrim(l.content), '') = '' then
      raise exception 'Before publishing: "%" needs reading content.', l.title using errcode = 'check_violation';
    end if;

    if l.lesson_type = 'video' and not qh_lms_private.is_valid_https_url(l.video_url) then
      raise exception 'Before publishing: "%" needs a valid HTTPS video link.', l.title using errcode = 'check_violation';
    end if;

    if l.lesson_type = 'assignment' and not exists (
      select 1 from public.qh_assignments a where a.lesson_id = l.id
    ) then
      raise exception 'Before publishing: "%" needs assignment instructions.', l.title using errcode = 'check_violation';
    end if;

    if l.lesson_type = 'quiz' then
      select * into q from public.qh_quizzes where lesson_id = l.id limit 1;
      if not found or jsonb_typeof(q.questions) is distinct from 'array' or jsonb_array_length(q.questions) = 0 then
        raise exception 'Before publishing: "%" needs quiz questions.', l.title using errcode = 'check_violation';
      end if;
      if q.passing_score is distinct from 90 then
        raise exception 'Before publishing: "%" must use a 90 percent passing score.', l.title using errcode = 'check_violation';
      end if;

      for qn in select value as qq, (ordinality - 1)::int as idx
                from jsonb_array_elements(q.questions) with ordinality
      loop
        qq := qn.qq;
        if jsonb_typeof(qq) is distinct from 'object' then
          raise exception 'Before publishing: "%" has a malformed question.', l.title using errcode = 'check_violation';
        end if;

        qtext := coalesce(nullif(btrim(qq->>'question'), ''), btrim(qq->>'q'), '');
        if qtext = '' then
          raise exception 'Before publishing: "%" has a question without text.', l.title using errcode = 'check_violation';
        end if;

        opts := qq->'options';
        if jsonb_typeof(opts) is distinct from 'array' or jsonb_array_length(opts) < 2 then
          raise exception 'Before publishing: "%" needs at least two answer choices per question.', l.title using errcode = 'check_violation';
        end if;
        if exists (
          select 1 from jsonb_array_elements(opts) o
          where jsonb_typeof(o) is distinct from 'string' or btrim(o #>> '{}') = ''
        ) then
          raise exception 'Before publishing: "%" has an empty answer choice.', l.title using errcode = 'check_violation';
        end if;

        if not (
          (jsonb_typeof(qq->'correct_answer') = 'string'
           and opts @> jsonb_build_array(qq->>'correct_answer'))
          or exists (
            select 1 from public.qh_quiz_keys k
             where k.quiz_id = q.id
               and k.question_index = qn.idx
               and nullif(btrim(k.correct_answer), '') is not null
               and opts @> jsonb_build_array(k.correct_answer)
          )
        ) then
          raise exception 'Before publishing: "%" needs the correct answer to match one choice.', l.title using errcode = 'check_violation';
        end if;

        if coalesce(btrim(qq->>'explanation'), '') = '' then
          raise exception 'Before publishing: "%" needs an explanation for each question.', l.title using errcode = 'check_violation';
        end if;
      end loop;
    end if;
  end loop;
end;
$function$;

-- When an instructor saves a quiz, copy the answer key into qh_quiz_keys and
-- remove answers from the student-visible questions column. qh_grade_quiz can
-- then score new quizzes. Students can no longer write their own scores.
-- Instructors load keys through qh_instructor_quiz_keys.

create or replace function qh_lms_private.quiz_variant_answer(qq jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when qq->'variant' is null or jsonb_typeof(qq->'variant') is distinct from 'object' then null
    when jsonb_typeof(qq#>'{variant,options}') = 'array'
         and coalesce(qq#>>'{variant,answer}','') ~ '^[0-9]+$'
         and (qq#>>'{variant,answer}')::int >= 0
         and (qq#>>'{variant,answer}')::int < jsonb_array_length(qq#>'{variant,options}')
      then nullif(btrim((qq#>'{variant,options}') ->> (qq#>>'{variant,answer}')::int), '')
    else nullif(btrim(coalesce(qq#>>'{variant,correct_answer}', '')), '')
  end;
$$;

create or replace function qh_lms_private.strip_quiz_questions(qs jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when jsonb_typeof(qs) is distinct from 'array' then qs
    else coalesce((
      select jsonb_agg(
        case
          when jsonb_typeof(q) is distinct from 'object' then q
          else (q - 'correct_answer') ||
            case
              when q ? 'variant' and jsonb_typeof(q->'variant') = 'object'
                then jsonb_build_object('variant', (q->'variant') - 'answer' - 'correct_answer')
              else '{}'::jsonb
            end
        end
        order by ord
      )
      from jsonb_array_elements(qs) with ordinality as t(q, ord)
    ), '[]'::jsonb)
  end;
$$;

create or replace function qh_lms_private.sync_and_strip_quiz_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_keys boolean;
begin
  has_keys := jsonb_typeof(new.questions) = 'array' and exists (
    select 1 from jsonb_array_elements(new.questions) q
    where nullif(btrim(q->>'correct_answer'), '') is not null
  );
  if has_keys then
    delete from public.qh_quiz_keys where quiz_id = new.id;
    insert into public.qh_quiz_keys (quiz_id, question_index, correct_answer, variant_answer)
    select new.id, (ord - 1)::int,
           nullif(btrim(qq->>'correct_answer'), ''),
           qh_lms_private.quiz_variant_answer(qq)
    from jsonb_array_elements(new.questions) with ordinality as t(qq, ord)
    where nullif(btrim(qq->>'correct_answer'), '') is not null;
  end if;
  if jsonb_typeof(new.questions) = 'array' then
    new.questions := qh_lms_private.strip_quiz_questions(new.questions);
  end if;
  return new;
end;
$$;

drop trigger if exists qh_quizzes_sync_keys on public.qh_quizzes;
create trigger qh_quizzes_sync_keys
  before insert or update of questions on public.qh_quizzes
  for each row execute function qh_lms_private.sync_and_strip_quiz_keys();

-- Backfill existing quizzes (including those saved after keys were introduced).
update public.qh_quizzes set questions = questions where questions is not null;

create or replace function public.qh_instructor_quiz_keys(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lesson uuid;
  v_keys jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;
  select lesson_id into v_lesson from public.qh_quizzes where id = p_quiz_id;
  if v_lesson is null then
    raise exception 'Quiz not found.' using errcode = 'P0002';
  end if;
  if not qh_lms_private.can_manage_lesson(v_lesson) then
    raise exception 'Only the course instructor or an owner can read the answer key.' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'question_index', k.question_index,
             'correct_answer', k.correct_answer,
             'variant_answer', k.variant_answer
           ) order by k.question_index
         ), '[]'::jsonb)
    into v_keys
    from public.qh_quiz_keys k
   where k.quiz_id = p_quiz_id;
  return v_keys;
end;
$$;

revoke all on function public.qh_instructor_quiz_keys(uuid) from public, anon;
grant execute on function public.qh_instructor_quiz_keys(uuid) to authenticated;

-- Server grading: default pass mark 90, optional unsaved preview for practice
-- or an instructor preview (no enrollment required when p_save is false and
-- the caller can manage the lesson).
create or replace function public.qh_grade_quiz(
  p_quiz_id uuid,
  p_answers jsonb,
  p_stage text default 'final',
  p_save boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_lesson uuid;
  v_total int; v_correct int := 0; v_pass int; v_pct int; v_passed boolean;
  v_results jsonb := '[]'::jsonb; k record; v_ans text; v_ok boolean; v_key text;
  v_enrolled boolean; v_manage boolean;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select qz.lesson_id into v_lesson from qh_quizzes qz where qz.id = p_quiz_id;
  if v_lesson is null then raise exception 'Quiz not found' using errcode = 'P0002'; end if;
  v_enrolled := exists (
    select 1 from qh_lessons l
    join qh_enrollments en on en.course_id = l.course_id and en.user_id = v_uid
    where l.id = v_lesson
  );
  v_manage := qh_lms_private.can_manage_lesson(v_lesson);
  if coalesce(p_save, true) then
    if not v_enrolled then
      raise exception 'Not enrolled in this course' using errcode = '42501';
    end if;
  elsif not v_enrolled and not v_manage then
    raise exception 'Not enrolled in this course' using errcode = '42501';
  end if;
  select count(*) into v_total from qh_quiz_keys where quiz_id = p_quiz_id;
  if v_total = 0 then raise exception 'No answer key for this quiz' using errcode = 'P0002'; end if;
  for k in select * from qh_quiz_keys where quiz_id = p_quiz_id order by question_index loop
    v_ans := p_answers->>k.question_index;
    v_key := case when p_stage = 'final' and k.variant_answer is not null then k.variant_answer else k.correct_answer end;
    v_ok := v_ans is not null and v_ans = v_key;
    if v_ok then v_correct := v_correct + 1; end if;
    v_results := v_results || jsonb_build_object('index', k.question_index, 'correct', v_ok, 'correct_answer', v_key);
  end loop;
  select coalesce(passing_score, 90) into v_pass from qh_quizzes where id = p_quiz_id;
  v_pct := round(v_correct * 100.0 / v_total);
  v_passed := v_pct >= v_pass;
  if coalesce(p_save, true) then
    insert into qh_quiz_answers (quiz_id, user_id, answers, score, passed)
    values (p_quiz_id, v_uid, p_answers, v_pct, v_passed);
  end if;
  return jsonb_build_object('score', v_pct, 'correct', v_correct, 'total', v_total,
                            'passing_score', v_pass, 'passed', v_passed,
                            'graded_by', 'server', 'saved', coalesce(p_save, true),
                            'results', v_results);
end
$function$;

revoke all on function public.qh_grade_quiz(uuid, jsonb, text) from public, anon;
revoke all on function public.qh_grade_quiz(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.qh_grade_quiz(uuid, jsonb, text, boolean) to authenticated;
-- Older 3-argument calls share the same function (defaults). Re-grant the
-- historical signature if Postgres still exposes it separately.
do $$
begin
  grant execute on function public.qh_grade_quiz(uuid, jsonb, text) to authenticated;
exception when undefined_function then
  null;
end$$;

drop policy if exists lms_attempts_insert on public.qh_quiz_answers;
revoke insert, update, delete on public.qh_quiz_answers from anon, authenticated;
