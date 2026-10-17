-- Academic collaboration, moderated enrollment and course packaging.
-- Additive migration: existing enrollments/courses are preserved.
alter table public.qh_courses
 add column if not exists visibility text not null default 'public'
 check (visibility in ('public','private')),
 add column if not exists access_closes_at timestamptz;
-- A draft is never listed publicly. Existing published courses remain public.
create index if not exists qh_courses_public_discovery_idx
 on public.qh_courses(is_published,visibility,access_closes_at);

create table if not exists public.qh_academic_enrollment_requests (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.qh_courses(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 requested_by uuid not null references auth.users(id),
 request_type text not null check (request_type in ('student','faculty')),
 status text not null default 'pending' check (status in ('consent_pending','pending','approved','declined','cancelled')),
 note text not null default '' check (length(note)<=1200),
 responded_by uuid,
 responded_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists qh_academic_one_open_request
 on public.qh_academic_enrollment_requests(student_id,course_id)
 where status in ('consent_pending','pending');
create index if not exists qh_academic_request_course_pending
 on public.qh_academic_enrollment_requests(course_id,status,created_at);

create table if not exists public.qh_academic_contact_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 student_peer_messages boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.qh_academic_messages(
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 3000),
 resource_url text check(resource_url is null or length(resource_url)<=700),
 created_at timestamptz not null default now(),
 check(sender_id<>recipient_id)
);
create index if not exists qh_academic_message_inbox
 on public.qh_academic_messages(recipient_id,created_at desc);
create index if not exists qh_academic_message_sent
 on public.qh_academic_messages(sender_id,created_at desc);
create table if not exists public.qh_academic_message_blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (blocker_id,blocked_id),
 check(blocker_id<>blocked_id)
);
create table if not exists public.qh_academic_message_reports (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.qh_academic_messages(id) on delete cascade,
 reporter_id uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 5 and 700),
 created_at timestamptz not null default now(),
 unique(message_id,reporter_id)
);
-- Student study groups require explicit enrollment and explicit membership consent.
-- All group data stays private behind authenticated and role-checked API actions.
create table if not exists public.qh_academic_study_groups(
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.qh_courses(id) on delete cascade,
 creator_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 3 and 100),
 description text not null default '' check(length(description)<=800),
 archived boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists qh_study_groups_course on public.qh_academic_study_groups(course_id);
create table if not exists public.qh_academic_group_members(
 group_id uuid not null references public.qh_academic_study_groups(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 is_owner boolean not null default false,
 joined_at timestamptz not null default now(),
 primary key(group_id,student_id)
);
create unique index if not exists qh_study_group_one_owner on public.qh_academic_group_members(group_id) where is_owner;
create table if not exists public.qh_academic_group_requests(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.qh_academic_study_groups(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 initiated_by uuid not null references auth.users(id),
 kind text not null check(kind in ('invite','join')),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
create unique index if not exists qh_group_one_pending on public.qh_academic_group_requests(group_id,student_id)
 where status='pending';
create index if not exists qh_group_request_student on public.qh_academic_group_requests(student_id,status);
create table if not exists public.qh_academic_group_posts(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.qh_academic_study_groups(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 3000),
 resource_url text check(resource_url is null or length(resource_url)<=700),
 created_at timestamptz not null default now()
);
create index if not exists qh_group_posts_recent on public.qh_academic_group_posts(group_id,created_at desc);
-- Block contacts globally, including new group invites; member-level group posts
-- from blocked peers are hidden from the viewing student's conversation.
create table if not exists public.qh_academic_packages(
 id uuid primary key default gen_random_uuid(),
 instructor_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 160),
 description text not null default '' check(length(description)<=1200),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.qh_academic_package_items(
 package_id uuid not null references public.qh_academic_packages(id) on delete cascade,
 course_id uuid not null references public.qh_courses(id) on delete cascade,
 added_at timestamptz not null default now(),
 primary key(package_id,course_id)
);
create index if not exists qh_academic_packages_owner on public.qh_academic_packages(instructor_id);

-- Every new collaboration table is private and accessible only through the audited
-- authenticated Edge Function. Service role does not bypass business rules in that API.
alter table public.qh_academic_enrollment_requests enable row level security;
alter table public.qh_academic_contact_settings enable row level security;
alter table public.qh_academic_messages enable row level security;
alter table public.qh_academic_message_blocks enable row level security;
alter table public.qh_academic_message_reports enable row level security;
alter table public.qh_academic_study_groups enable row level security;
alter table public.qh_academic_group_members enable row level security;
alter table public.qh_academic_group_requests enable row level security;
alter table public.qh_academic_group_posts enable row level security;
alter table public.qh_academic_packages enable row level security;
alter table public.qh_academic_package_items enable row level security;
revoke all on public.qh_academic_enrollment_requests from public,anon,authenticated;
revoke all on public.qh_academic_contact_settings from public,anon,authenticated;
revoke all on public.qh_academic_messages from public,anon,authenticated;
revoke all on public.qh_academic_message_blocks from public,anon,authenticated;
revoke all on public.qh_academic_message_reports from public,anon,authenticated;
revoke all on public.qh_academic_study_groups from public,anon,authenticated;
revoke all on public.qh_academic_group_members from public,anon,authenticated;
revoke all on public.qh_academic_group_requests from public,anon,authenticated;
revoke all on public.qh_academic_group_posts from public,anon,authenticated;
revoke all on public.qh_academic_packages from public,anon,authenticated;
revoke all on public.qh_academic_package_items from public,anon,authenticated;
grant all on public.qh_academic_study_groups,public.qh_academic_group_members,
 public.qh_academic_group_requests,public.qh_academic_group_posts to service_role;
grant all on public.qh_academic_enrollment_requests,public.qh_academic_contact_settings,
 public.qh_academic_messages,public.qh_academic_message_blocks,
 public.qh_academic_message_reports,public.qh_academic_packages,
 public.qh_academic_package_items to service_role;

-- Course discovery and lesson access must enforce expiration in the database,
-- not merely by hiding buttons in the interface.
drop policy if exists lms_courses_read on public.qh_courses;
create policy lms_courses_read on public.qh_courses for select
 using (is_published and visibility='public'
   and (access_closes_at is null or access_closes_at>now()));
drop policy if exists lms_courses_enrolled on public.qh_courses;
create policy lms_courses_enrolled on public.qh_courses for select
 using ((access_closes_at is null or access_closes_at>now()) and exists (
   select 1 from public.qh_enrollments e
   where e.course_id=qh_courses.id and e.user_id=(select auth.uid())));

create or replace function qh_lms_private.can_learn(course uuid)
 returns boolean language sql stable security definer set search_path to ''
 as $func$
 select auth.uid() is not null and
 not exists(select 1 from public.qh_lms_accounts where user_id=auth.uid()
   and (not active or must_change_password)) and
 exists(select 1 from public.qh_courses c
   where c.id=course and (c.access_closes_at is null or c.access_closes_at>now())) and
 (qh_lms_private.can_manage_course(course) or exists(
   select 1 from public.qh_enrollments e where e.course_id=course and e.user_id=auth.uid()))
 $func$;
-- Existing progress policies permitted inserts based solely on the user's ID.
-- Enforce closure on new progress events and quiz/assignment answers through can_learn.
drop policy if exists progress_insert_own on public.qh_student_progress;
create policy progress_insert_own on public.qh_student_progress for insert to authenticated
 with check (user_id=(select auth.uid()) and qh_lms_private.can_learn(course_id));
drop policy if exists progress_update_own on public.qh_student_progress;
create policy progress_update_own on public.qh_student_progress for update to authenticated
 using(user_id=(select auth.uid()) and qh_lms_private.can_learn(course_id))
 with check(user_id=(select auth.uid()) and qh_lms_private.can_learn(course_id));

comment on column public.qh_courses.visibility is
 'Public courses discoverable by students and faculty; private courses require explicit enrollment.';
comment on column public.qh_courses.access_closes_at is
 'After this timestamp students cannot access lessons, materials, or make progress until extended.';
