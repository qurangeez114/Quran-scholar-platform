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

-- Final approval and enrollment happen atomically, with a row lock.
create or replace function qh_lms_private.academic_approve_enrollment(p_request uuid,p_actor uuid)
returns uuid language plpgsql security definer set search_path to '' as $proc$
declare r public.qh_academic_enrollment_requests%rowtype;
declare c public.qh_courses%rowtype;
declare enrollment_id uuid;
begin
 select * into r from public.qh_academic_enrollment_requests
 where id=p_request for update;
 if not found or r.status<>'pending' then raise exception 'Enrollment request is no longer pending'; end if;
 select * into c from public.qh_courses where id=r.course_id;
 if not found then raise exception 'Class not found'; end if;
 if c.created_by<>p_actor and not exists(select 1 from public.qh_staff_members where user_id=p_actor)
 then raise exception 'Only the receiving instructor may approve enrollment'; end if;
 if c.access_closes_at is not null and c.access_closes_at<=now()
 then raise exception 'Class has closed'; end if;
 insert into public.qh_enrollments(user_id,course_id)
 values(r.student_id,r.course_id)
 on conflict(user_id,course_id) do nothing;
 select id into enrollment_id from public.qh_enrollments
 where user_id=r.student_id and course_id=r.course_id;
 update public.qh_academic_enrollment_requests set status='approved',responded_by=p_actor,
 responded_at=now(),updated_at=now() where id=r.id;
 return enrollment_id;
end $proc$;
revoke all on function qh_lms_private.academic_approve_enrollment(uuid,uuid) from public,anon,authenticated;
grant usage on schema qh_lms_private to service_role;
grant execute on function qh_lms_private.academic_approve_enrollment(uuid,uuid) to service_role;

-- Students explicitly accept or reject group invitations and join approvals.
create or replace function qh_lms_private.academic_accept_group(p_request uuid,p_actor uuid)
returns uuid language plpgsql security definer set search_path to '' as $proc$
declare r public.qh_academic_group_requests%rowtype;
declare g public.qh_academic_study_groups%rowtype;
begin
 select * into r from public.qh_academic_group_requests where id=p_request for update;
 if not found or r.status<>'pending' then raise exception 'Group request is no longer pending'; end if;
 select * into g from public.qh_academic_study_groups where id=r.group_id;
 if not found or g.archived then raise exception 'Group unavailable'; end if;
 if not exists(select 1 from public.qh_enrollments where course_id=g.course_id and user_id=r.student_id)
 then raise exception 'Student must be enrolled in the class'; end if;
 if exists(select 1 from public.qh_academic_message_blocks
 where (blocker_id=p_actor and blocked_id=r.student_id) or
 (blocker_id=r.student_id and blocked_id=p_actor)) and p_actor<>r.student_id
 then raise exception 'This contact is blocked'; end if;
 if r.kind='invite' and p_actor<>r.student_id
 then raise exception 'Only the invitee may accept'; end if;
 if r.kind='join' and not exists(select 1 from public.qh_academic_group_members
 where group_id=r.group_id and student_id=p_actor and is_owner)
 then raise exception 'Only the group owner may approve a join request'; end if;
 insert into public.qh_academic_group_members(group_id,student_id)
 values(r.group_id,r.student_id) on conflict do nothing;
 update public.qh_academic_group_requests set status='accepted',resolved_at=now() where id=r.id;
 return r.group_id;
end $proc$;
revoke all on function qh_lms_private.academic_accept_group(uuid,uuid) from public,anon,authenticated;
grant execute on function qh_lms_private.academic_accept_group(uuid,uuid) to service_role;

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
