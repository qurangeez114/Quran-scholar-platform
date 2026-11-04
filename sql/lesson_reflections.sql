-- Lesson reflections: an optional written prompt per lesson, and each student's answer.
-- Additive only (new tables + policies). Idempotent: safe to re-run.

-- 1) Prompt set by the course's instructor or staff (one per lesson).
create table if not exists public.qh_lesson_reflection_prompts (
  lesson_id uuid primary key references public.qh_lessons(id) on delete cascade,
  course_id uuid not null references public.qh_courses(id) on delete cascade,
  prompt text not null check (length(btrim(prompt)) between 1 and 2000),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists qh_lesson_reflection_prompts_course_idx on public.qh_lesson_reflection_prompts(course_id);
alter table public.qh_lesson_reflection_prompts enable row level security;

drop policy if exists qh_lesson_reflection_prompts_read on public.qh_lesson_reflection_prompts;
create policy qh_lesson_reflection_prompts_read on public.qh_lesson_reflection_prompts
  for select to authenticated using (qh_lms_private.can_learn(course_id));
drop policy if exists qh_lesson_reflection_prompts_write on public.qh_lesson_reflection_prompts;
create policy qh_lesson_reflection_prompts_write on public.qh_lesson_reflection_prompts
  for all to authenticated
  using (qh_lms_private.can_manage_course(course_id))
  with check (qh_lms_private.can_manage_course(course_id)
    and exists (select 1 from public.qh_lessons l where l.id = lesson_id and l.course_id = qh_lesson_reflection_prompts.course_id));
revoke all on public.qh_lesson_reflection_prompts from anon;
grant select, insert, update, delete on public.qh_lesson_reflection_prompts to authenticated;

-- 2) Student answers. Student writes/reads own; course owner (creator) + qh_is_staff() read all.
create table if not exists public.qh_lesson_reflections (
  id bigint generated always as identity primary key,
  lesson_id uuid not null references public.qh_lessons(id) on delete cascade,
  course_id uuid not null references public.qh_courses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  answer text not null check (length(btrim(answer)) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, user_id)
);
create index if not exists qh_lesson_reflections_course_idx on public.qh_lesson_reflections(course_id, lesson_id);
alter table public.qh_lesson_reflections enable row level security;

drop policy if exists qh_lesson_reflections_read on public.qh_lesson_reflections;
create policy qh_lesson_reflections_read on public.qh_lesson_reflections
  for select to authenticated
  using (user_id = (select auth.uid())
         or public.qh_is_staff()
         or exists (select 1 from public.qh_courses c where c.id = course_id and c.created_by = (select auth.uid())));
drop policy if exists qh_lesson_reflections_insert_own on public.qh_lesson_reflections;
create policy qh_lesson_reflections_insert_own on public.qh_lesson_reflections
  for insert to authenticated
  with check (user_id = (select auth.uid()) and qh_lms_private.can_learn(course_id)
    and exists (select 1 from public.qh_lessons l where l.id = lesson_id and l.course_id = qh_lesson_reflections.course_id));
drop policy if exists qh_lesson_reflections_update_own on public.qh_lesson_reflections;
create policy qh_lesson_reflections_update_own on public.qh_lesson_reflections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and qh_lms_private.can_learn(course_id)
    and exists (select 1 from public.qh_lessons l where l.id = lesson_id and l.course_id = qh_lesson_reflections.course_id));
drop policy if exists qh_lesson_reflections_delete_own on public.qh_lesson_reflections;
create policy qh_lesson_reflections_delete_own on public.qh_lesson_reflections
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.qh_lesson_reflections from anon;
grant select, insert, update, delete on public.qh_lesson_reflections to authenticated;

-- Readable names for instructors viewing answers (course owner or staff only).
create or replace function public.qh_lesson_reflection_answers(p_lesson uuid)
returns table(id bigint, user_id uuid, student_name text, answer text, updated_at timestamptz)
language sql stable security definer set search_path to ''
as $$
  select r.id, r.user_id,
         coalesce(nullif(a.display_name,''), nullif(u.raw_user_meta_data->>'full_name',''), u.email, 'Student'),
         r.answer, r.updated_at
    from public.qh_lesson_reflections r
    join public.qh_courses c on c.id = r.course_id
    left join public.qh_lms_accounts a on a.user_id = r.user_id
    left join auth.users u on u.id = r.user_id
   where r.lesson_id = p_lesson
     and (public.qh_is_staff() or c.created_by = auth.uid())
   order by r.updated_at desc
$$;
revoke all on function public.qh_lesson_reflection_answers(uuid) from public, anon;
grant execute on function public.qh_lesson_reflection_answers(uuid) to authenticated;
