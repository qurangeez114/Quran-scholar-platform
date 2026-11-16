-- Follow-up to 20261116090000_enforce_course_publish_readiness.sql.
-- Closes three gaps found in review. Existing rows are not changed.
--   1. Assignment lessons must have non-blank instructions (the column is NOT NULL but accepts '').
--   2. Moving a quiz or assignment to another lesson re-checks the course it left as well as the one it joined.
--   3. Re-states the publish-readiness rules so the browser check can mirror them exactly (see accounts/course-readiness.js).
-- Only function bodies are replaced. Existing triggers keep pointing at the same functions.

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
      select 1 from public.qh_assignments a
      where a.lesson_id = l.id and coalesce(btrim(a.instructions), '') <> ''
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

create or replace function qh_lms_private.guard_published_lesson_children()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  -- The course the row used to belong to (UPDATE/DELETE). Skipped when the lesson_id did not change on UPDATE.
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.lesson_id is distinct from new.lesson_id) then
    select l.course_id into cid from public.qh_lessons l where l.id = old.lesson_id;
    if cid is not null and exists (select 1 from public.qh_courses c where c.id = cid and c.is_published) then
      perform qh_lms_private.assert_course_publishable(cid);
    end if;
  end if;

  -- The course the row belongs to now (INSERT/UPDATE).
  if tg_op in ('INSERT', 'UPDATE') then
    select l.course_id into cid from public.qh_lessons l where l.id = new.lesson_id;
    if cid is not null and exists (select 1 from public.qh_courses c where c.id = cid and c.is_published) then
      perform qh_lms_private.assert_course_publishable(cid);
    end if;
  end if;
  return null;
end;
$$;

-- Hardening: these helpers only raise errors or return booleans. They run inside trigger functions
-- (owned by the migration role), so they do not need to be callable by API roles.
revoke all on function qh_lms_private.assert_course_publishable(uuid) from public, anon, authenticated;
revoke all on function qh_lms_private.is_valid_https_url(text) from public, anon, authenticated;
