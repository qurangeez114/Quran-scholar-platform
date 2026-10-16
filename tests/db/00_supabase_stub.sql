-- LOCAL TEST ONLY. Mimics the parts of Supabase that migrations rely on.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
drop schema if exists auth cascade;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema if not exists public;
grant usage on schema public to anon, authenticated;
-- Stand-ins for course tables. Only names and user_id matter for the staff policies here.
create table public.qh_courses (id bigint generated always as identity primary key, title text not null, published boolean not null default false);
create table public.qh_lessons (id bigint generated always as identity primary key, course_id bigint references public.qh_courses(id), title text);
create table public.qh_course_materials (id bigint generated always as identity primary key, course_id bigint);
create table public.qh_quizzes (id bigint generated always as identity primary key, course_id bigint);
create table public.qh_assignments (id bigint generated always as identity primary key, course_id bigint);
create table public.qh_enrollments (user_id uuid not null, course_id bigint not null, primary key (user_id, course_id));
create table public.qh_quiz_answers (id bigint generated always as identity primary key, user_id uuid);
create table public.qh_assignment_submissions (id bigint generated always as identity primary key, user_id uuid);
do $$ declare t text; begin
  foreach t in array array['qh_courses','qh_lessons','qh_course_materials','qh_quizzes','qh_assignments','qh_enrollments','qh_quiz_answers','qh_assignment_submissions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
-- Two users. Owner matches the migration's email. Ordinary user does not.
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-00000000000a','magicallife19@gmail.com'),
 ('00000000-0000-4000-8000-00000000000b','student@example.test');
