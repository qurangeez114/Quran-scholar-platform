-- Admissions: requested classes, applicant account link, instructor assignment.
alter table public.qh_school_applications
  add column if not exists requested_course_ids uuid[] not null default '{}',
  add column if not exists applicant_user_id uuid references auth.users(id) on delete set null,
  add column if not exists instructor_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz;
do $$ begin
  alter table public.qh_school_applications add constraint qh_school_applications_course_limit
    check (cardinality(requested_course_ids)<=5);
exception when duplicate_object then null; end $$;
create index if not exists qh_school_applications_instructor on public.qh_school_applications(instructor_id);

create table if not exists public.qh_school_application_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.qh_school_applications(id) on delete cascade,
  action text not null check (action in ('assign','claim','reassign')),
  old_instructor_id uuid references auth.users(id) on delete set null,
  new_instructor_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  enrolled_course_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists qh_school_application_assignments_app
  on public.qh_school_application_assignments(application_id,created_at desc);
alter table public.qh_school_application_assignments enable row level security;
revoke all on public.qh_school_application_assignments from public,anon,authenticated;
grant all on public.qh_school_application_assignments to service_role;

-- p_mode: 'claim' (instructor takes an unassigned application; fails if assigned),
-- 'assign' (admin, unassigned only), 'reassign' (admin only).
-- Enrolls the applicant's account (if known) in the requested published classes
-- through the same pending->approve path used by enrollment requests.
create or replace function public.qh_assign_application(
  p_application uuid, p_instructor uuid, p_actor uuid, p_mode text
) returns jsonb language plpgsql security definer set search_path to '' as $fn$
declare
  app public.qh_school_applications%rowtype;
  is_admin boolean;
  student uuid;
  cid uuid;
  c public.qh_courses%rowtype;
  req uuid;
  enrolled uuid[] := '{}';
  skipped uuid[] := '{}';
begin
  if p_mode not in ('assign','claim','reassign') then raise exception 'Invalid assignment mode'; end if;
  is_admin := exists(select 1 from public.qh_staff_members where user_id=p_actor);
  if not exists(select 1 from public.qh_lms_accounts where user_id=p_instructor and role='instructor' and active)
    then raise exception 'Choose an active instructor'; end if;
  select * into app from public.qh_school_applications where id=p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if app.status<>'accepted' then raise exception 'Only accepted applications can be assigned'; end if;
  if p_mode='claim' then
    if p_actor<>p_instructor then raise exception 'Instructors may only claim for themselves'; end if;
    if app.instructor_id is not null then raise exception 'This applicant has already been assigned'; end if;
  elsif p_mode='assign' then
    if not is_admin then raise exception 'Administrator required'; end if;
    if app.instructor_id is not null then raise exception 'Already assigned; use reassign'; end if;
  else
    if not is_admin then raise exception 'Administrator required'; end if;
    if app.instructor_id is null then raise exception 'Application is not assigned yet'; end if;
    if app.instructor_id=p_instructor then raise exception 'Already assigned to this instructor'; end if;
  end if;
  student := app.applicant_user_id;
  if student is null then
    select u.id into student from auth.users u
     where lower(u.email)=lower(app.email) and u.email_confirmed_at is not null limit 1;
  end if;
  update public.qh_school_applications set instructor_id=p_instructor,assigned_by=p_actor,
    assigned_at=now(),applicant_user_id=coalesce(applicant_user_id,student),updated_at=now()
   where id=app.id;
  if student is not null then
    foreach cid in array app.requested_course_ids loop
      select * into c from public.qh_courses where id=cid;
      if not found or not c.is_published or (c.access_closes_at is not null and c.access_closes_at<=now()) then
        skipped := skipped||cid; continue; end if;
      if exists(select 1 from public.qh_enrollments where user_id=student and course_id=cid) then continue; end if;
      select id into req from public.qh_academic_enrollment_requests
        where course_id=cid and student_id=student and status in ('pending','consent_pending') limit 1;
      if req is null then
        insert into public.qh_academic_enrollment_requests(course_id,student_id,requested_by,request_type,status,note)
        values (cid,student,p_actor,'faculty','pending','School admission assignment')
        returning id into req;
      else
        update public.qh_academic_enrollment_requests set status='pending' where id=req;
      end if;
      perform public.qh_academic_approve_enrollment(req, c.created_by);
      enrolled := enrolled||cid; req := null;
    end loop;
  end if;
  insert into public.qh_school_application_assignments(application_id,action,old_instructor_id,new_instructor_id,actor_id,enrolled_course_ids)
  values (app.id,p_mode,app.instructor_id,p_instructor,p_actor,enrolled);
  return jsonb_build_object('application_id',app.id,'instructor_id',p_instructor,
    'previous_instructor_id',app.instructor_id,'applicant_user_id',student,
    'enrolled_course_ids',to_jsonb(enrolled),'skipped_course_ids',to_jsonb(skipped));
end $fn$;
revoke all on function public.qh_assign_application(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.qh_assign_application(uuid,uuid,uuid,text) to service_role;
