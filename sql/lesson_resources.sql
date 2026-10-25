-- Research resources attached to lessons by their instructor.
-- Applied to project ylosytbxpzxzwfzjpaej on 2026-10-25 (recorded here so the schema lives in the repo).

create table if not exists public.qh_lesson_resources (
  id bigserial primary key,
  lesson_id uuid not null references public.qh_lessons(id) on delete cascade,
  course_id uuid not null references public.qh_courses(id) on delete cascade,
  resource_kind text not null check (resource_kind in ('verse','hadith','source','tafsir','fatwa')),
  resource_ref text not null,
  resource_title text,
  instructor_note text,
  position integer not null default 0,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lesson_id, resource_kind, resource_ref)
);

create index if not exists qh_lesson_resources_lesson_idx on public.qh_lesson_resources(lesson_id, position);
create index if not exists qh_lesson_resources_course_idx on public.qh_lesson_resources(course_id);

alter table public.qh_lesson_resources enable row level security;

-- Anyone who can see the course can read its resources.
create policy qh_lesson_resources_read on public.qh_lesson_resources
  for select to anon, authenticated
  using (exists (select 1 from public.qh_courses c where c.id = qh_lesson_resources.course_id));

-- Only the course's instructor can write, and only for a lesson in the same course.
create policy qh_lesson_resources_instructor_write on public.qh_lesson_resources
  for all to authenticated
  using (
    exists (select 1 from public.qh_courses c
            where c.id = qh_lesson_resources.course_id and c.created_by = (select auth.uid()))
    and qh_lms_private.is_instructor()
  )
  with check (
    exists (select 1 from public.qh_courses c
            where c.id = qh_lesson_resources.course_id and c.created_by = (select auth.uid()))
    and qh_lms_private.is_instructor()
    and exists (select 1 from public.qh_lessons l
                where l.id = qh_lesson_resources.lesson_id and l.course_id = qh_lesson_resources.course_id)
  );

grant select on public.qh_lesson_resources to anon, authenticated;
grant insert, update, delete on public.qh_lesson_resources to authenticated;
grant usage, select on sequence public.qh_lesson_resources_id_seq to authenticated;
