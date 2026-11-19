-- Publishing also requires a syllabus, once the academic-standards columns exist.
-- NOT APPLIED. Apply after 20261116090000_enforce_course_publish_readiness.sql
-- (and after migrations/20261104_academic_standards.sql if you want the syllabus rule active).
--
-- Rule (same as accounts/course-readiness.js syllabusIssues):
--   * learning_outcomes has at least one non-empty entry, and
--   * syllabus.weekly_schedule has at least one entry.
-- The rule runs only when a course changes from draft to published (or is inserted
-- as published). Courses that are already published are not affected, and lesson
-- edits on published courses keep using the existing checks.
-- If qh_courses has no syllabus column (academic-standards migration not applied),
-- the rule is skipped, so this migration is safe to apply in either order.

create or replace function qh_lms_private.assert_course_syllabus(p_course jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  outcomes jsonb := p_course->'learning_outcomes';
  sched jsonb := p_course->'syllabus'->'weekly_schedule';
begin
  if not (p_course ? 'syllabus') then
    return;  -- academic-standards columns not installed yet
  end if;
  if jsonb_typeof(outcomes) is distinct from 'array' or not exists (
    select 1 from jsonb_array_elements(outcomes) o
    where (jsonb_typeof(o) = 'string' and btrim(o #>> '{}') <> '')
       or (jsonb_typeof(o) = 'object' and btrim(coalesce(o->>'text', '')) <> '')
  ) then
    raise exception 'Before publishing: the syllabus needs at least one learning outcome.' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(sched) is distinct from 'array' or jsonb_array_length(sched) = 0 then
    raise exception 'Before publishing: the syllabus needs a weekly schedule.' using errcode = 'check_violation';
  end if;
end;
$$;

-- Same trigger function as 20261116090000, plus the syllabus rule (checked on the
-- new row, so a single update that fills the syllabus and publishes is accepted).
create or replace function qh_lms_private.guard_course_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or old.is_published is distinct from true) then
    perform qh_lms_private.assert_course_publishable(new.id);
    perform qh_lms_private.assert_course_syllabus(to_jsonb(new));
  end if;
  return new;
end;
$$;
