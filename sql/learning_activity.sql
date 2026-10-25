-- Learning activity (engaged-time) tracking.
-- Matches the live schema in project ylosytbxpzxzwfzjpaej, plus the anti-fake and lesson_id changes.
-- Idempotent: safe to re-run.

create schema if not exists qh_private;

create table if not exists public.qh_learning_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.qh_courses(id) on delete set null,
  page_path text not null check (length(page_path) between 1 and 180 and page_path like '/%'),
  page_title text not null default '' check (length(page_title) <= 180),
  active_seconds smallint not null check (active_seconds >= 0 and active_seconds <= 60),
  visited_at timestamptz not null default now()
);

-- New: lesson link
alter table public.qh_learning_activity
  add column if not exists lesson_id uuid references public.qh_lessons(id) on delete set null;

create index if not exists qh_learning_activity_user_time_idx on public.qh_learning_activity (user_id, visited_at desc);
create index if not exists qh_learning_activity_course_time_idx on public.qh_learning_activity (course_id, visited_at desc);
create index if not exists qh_learning_activity_lesson_time_idx on public.qh_learning_activity (lesson_id, visited_at desc);

-- New: only known class pages, strict path shape, at least 1 second.
alter table public.qh_learning_activity drop constraint if exists qh_learning_activity_known_page_check;
alter table public.qh_learning_activity add constraint qh_learning_activity_known_page_check check (
  page_path ~ '^/[a-z0-9_./-]{1,120}$'
  and page_path in ('/course.html','/lesson.html','/courses.html','/academic-hub.html',
                    '/student-dashboard.html','/instructor-dashboard.html')
);
alter table public.qh_learning_activity drop constraint if exists qh_learning_activity_min_seconds_check;
alter table public.qh_learning_activity add constraint qh_learning_activity_min_seconds_check check (active_seconds >= 1);
alter table public.qh_learning_activity drop constraint if exists qh_learning_activity_lesson_page_check;
alter table public.qh_learning_activity add constraint qh_learning_activity_lesson_page_check check (lesson_id is null or page_path = '/lesson.html');

alter table public.qh_learning_activity enable row level security;

create or replace function qh_private.is_learning_owner()
returns boolean language sql stable security definer set search_path to ''
as $$SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.qh_lms_accounts
 WHERE user_id=(SELECT auth.uid()) AND role='owner' AND active=true
)$$;
revoke all on function qh_private.is_learning_owner() from public, anon;
grant execute on function qh_private.is_learning_owner() to authenticated;

-- New: server-side guard. Stamps the time, derives course from lesson, rate-limits per user.
create or replace function qh_private.learning_activity_guard()
returns trigger language plpgsql security definer set search_path to ''
as $$
declare recent_seconds int; recent_rows int; lesson_course uuid;
begin
  -- service_role / postgres maintenance bypasses the limits
  if auth.uid() is null then return new; end if;
  new.visited_at := now();
  if new.lesson_id is not null then
    select course_id into lesson_course from public.qh_lessons where id = new.lesson_id;
    new.course_id := lesson_course;
  end if;
  perform pg_advisory_xact_lock(hashtext('qh_learning_activity:' || new.user_id::text));
  select coalesce(sum(active_seconds),0), count(*) into recent_seconds, recent_rows
    from public.qh_learning_activity
   where user_id = new.user_id and visited_at > now() - interval '60 seconds';
  if recent_seconds + new.active_seconds > 75 or recent_rows >= 8 then
    raise exception 'learning activity rate limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function qh_private.learning_activity_guard() from public, anon, authenticated;

drop trigger if exists qh_learning_activity_guard on public.qh_learning_activity;
create trigger qh_learning_activity_guard before insert on public.qh_learning_activity
  for each row execute function qh_private.learning_activity_guard();

drop policy if exists qh_learning_activity_insert_own on public.qh_learning_activity;
create policy qh_learning_activity_insert_own on public.qh_learning_activity
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and visited_at >= now() - interval '5 minutes'
              and visited_at <= now() + interval '1 minute');
drop policy if exists qh_learning_activity_select_own_or_admin on public.qh_learning_activity;
create policy qh_learning_activity_select_own_or_admin on public.qh_learning_activity
  for select to authenticated
  using (user_id = (select auth.uid()) or (select qh_private.is_learning_owner()));
drop policy if exists qh_learning_activity_delete_own on public.qh_learning_activity;
create policy qh_learning_activity_delete_own on public.qh_learning_activity
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.qh_learning_activity from anon;
revoke all on public.qh_learning_activity from authenticated;
grant select, insert, delete on public.qh_learning_activity to authenticated;
