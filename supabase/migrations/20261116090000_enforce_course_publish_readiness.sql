-- Enforce course readiness on the server for published courses.
-- The browser check (admin/courses.html, accounts/course-readiness.js) is advisory.
-- These triggers apply the same core rules whenever a course is published, and
-- re-check the course whenever its lessons, quizzes or assignments change while
-- it is published. Existing rows are not changed by this migration.

create or replace function qh_lms_private.is_valid_https_url(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select u is not null
    and length(u) <= 2048
    and u ~ '^https://[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
$$;

create or replace function qh_lms_private.assert_course_publishable(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
  q record;
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

      for qq in select value from jsonb_array_elements(q.questions) loop
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

        if jsonb_typeof(qq->'correct_answer') is distinct from 'string'
           or not (opts @> jsonb_build_array(qq->>'correct_answer')) then
          raise exception 'Before publishing: "%" needs the correct answer to match one choice.', l.title using errcode = 'check_violation';
        end if;

        if coalesce(btrim(qq->>'explanation'), '') = '' then
          raise exception 'Before publishing: "%" needs an explanation for each question.', l.title using errcode = 'check_violation';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- Course row: publishing (or inserting as published) must pass the checks.
create or replace function qh_lms_private.guard_course_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or old.is_published is distinct from true) then
    perform qh_lms_private.assert_course_publishable(new.id);
  end if;
  return new;
end;
$$;

-- Lessons: while the course is published, lesson changes must keep it publishable.
create or replace function qh_lms_private.guard_published_lessons()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    cid := new.course_id;
    if exists (select 1 from public.qh_courses c where c.id = cid and c.is_published) then
      perform qh_lms_private.assert_course_publishable(cid);
    end if;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.course_id is distinct from new.course_id) then
    cid := old.course_id;
    if exists (select 1 from public.qh_courses c where c.id = cid and c.is_published) then
      perform qh_lms_private.assert_course_publishable(cid);
    end if;
  end if;
  return null;
end;
$$;

-- Quizzes and assignments: re-check the lesson's course while it is published.
create or replace function qh_lms_private.guard_published_lesson_children()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lid uuid;
  cid uuid;
begin
  lid := case when tg_op = 'DELETE' then old.lesson_id else new.lesson_id end;
  select l.course_id into cid from public.qh_lessons l where l.id = lid;
  if cid is not null and exists (select 1 from public.qh_courses c where c.id = cid and c.is_published) then
    perform qh_lms_private.assert_course_publishable(cid);
  end if;
  return null;
end;
$$;

drop trigger if exists qh_courses_publish_readiness on public.qh_courses;
create trigger qh_courses_publish_readiness
  before insert or update of is_published on public.qh_courses
  for each row execute function qh_lms_private.guard_course_publish();

drop trigger if exists qh_lessons_published_guard on public.qh_lessons;
create trigger qh_lessons_published_guard
  after insert or update or delete on public.qh_lessons
  for each row execute function qh_lms_private.guard_published_lessons();

drop trigger if exists qh_quizzes_published_guard on public.qh_quizzes;
create trigger qh_quizzes_published_guard
  after insert or update or delete on public.qh_quizzes
  for each row execute function qh_lms_private.guard_published_lesson_children();

drop trigger if exists qh_assignments_published_guard on public.qh_assignments;
create trigger qh_assignments_published_guard
  after insert or update or delete on public.qh_assignments
  for each row execute function qh_lms_private.guard_published_lesson_children();
