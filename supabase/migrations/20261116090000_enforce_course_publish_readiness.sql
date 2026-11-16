-- Enforce course publish readiness on the server.
-- The browser check in admin/courses.html and accounts/course-readiness.js is
-- advisory only; a direct API update could previously publish an empty course.
-- This trigger rejects publishing unless the course meets the same core rules.
-- Existing rows are not changed; the trigger runs only when is_published becomes true.

create or replace function qh_lms_private.enforce_publish_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lesson record;
begin
  if not new.is_published then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_published is true then
    return new;
  end if;

  if not exists (select 1 from public.qh_lessons where course_id = new.id) then
    raise exception 'Before publishing: add at least one lesson.' using errcode = 'check_violation';
  end if;

  for lesson in
    select id, title, content, lesson_type, video_url
    from public.qh_lessons
    where course_id = new.id
  loop
    if coalesce(btrim(lesson.title), '') = '' then
      raise exception 'Before publishing: give every lesson a title.' using errcode = 'check_violation';
    end if;

    if lesson.lesson_type = 'text' and coalesce(btrim(lesson.content), '') = '' then
      raise exception 'Before publishing: "%" needs reading content.', lesson.title using errcode = 'check_violation';
    end if;

    if lesson.lesson_type = 'video' and (lesson.video_url is null or lesson.video_url !~* '^https://') then
      raise exception 'Before publishing: "%" needs a valid HTTPS video link.', lesson.title using errcode = 'check_violation';
    end if;

    if lesson.lesson_type = 'assignment' and not exists (
      select 1 from public.qh_assignments a where a.lesson_id = lesson.id
    ) then
      raise exception 'Before publishing: "%" needs assignment instructions.', lesson.title using errcode = 'check_violation';
    end if;

    if lesson.lesson_type = 'quiz' then
      if not exists (
        select 1 from public.qh_quizzes q
        where q.lesson_id = lesson.id
          and jsonb_typeof(q.questions) = 'array'
          and jsonb_array_length(q.questions) > 0
      ) then
        raise exception 'Before publishing: "%" needs quiz questions.', lesson.title using errcode = 'check_violation';
      end if;
      if exists (
        select 1 from public.qh_quizzes q
        where q.lesson_id = lesson.id and q.passing_score is distinct from 90
      ) then
        raise exception 'Before publishing: "%" must use a 90%% passing score.', lesson.title using errcode = 'check_violation';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists qh_courses_publish_readiness on public.qh_courses;
create trigger qh_courses_publish_readiness
  before insert or update of is_published on public.qh_courses
  for each row execute function qh_lms_private.enforce_publish_readiness();

-- Not applied to production. Apply only after review.
