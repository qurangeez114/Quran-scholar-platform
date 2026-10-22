-- Offer one accepted applicant to several instructors; first to accept wins.
create table if not exists public.qh_school_application_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.qh_school_applications(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  offered_by uuid references auth.users(id) on delete set null,
  offered_at timestamptz not null default now(),
  status text not null default 'offered' check (status in ('offered','accepted','declined','closed','withdrawn')),
  responded_at timestamptz,
  unique (application_id, instructor_id)
);
create index if not exists qh_school_application_offers_instructor
  on public.qh_school_application_offers(instructor_id,status);
alter table public.qh_school_application_offers enable row level security;
revoke all on public.qh_school_application_offers from public,anon,authenticated;
grant all on public.qh_school_application_offers to service_role;

-- Audit actions for offers.
alter table public.qh_school_application_assignments
  drop constraint if exists qh_school_application_assignments_action_check;
alter table public.qh_school_application_assignments
  add constraint qh_school_application_assignments_action_check
  check (action in ('assign','claim','reassign','offer','offer_accept','offer_decline','offer_withdraw'));

-- Admin offers an accepted, unassigned application to a list of instructors.
-- Re-offering to an instructor whose offer was declined/withdrawn/closed reopens it.
create or replace function public.qh_offer_application(
  p_application uuid, p_instructors uuid[], p_actor uuid
) returns jsonb language plpgsql security definer set search_path to '' as $fn$
declare app public.qh_school_applications%rowtype; i uuid; offered uuid[] := '{}';
begin
  if not exists(select 1 from public.qh_staff_members where user_id=p_actor) then raise exception 'Administrator required'; end if;
  if p_instructors is null or cardinality(p_instructors)=0 then raise exception 'Choose at least one instructor'; end if;
  if cardinality(p_instructors)>50 then raise exception 'Too many instructors selected'; end if;
  select * into app from public.qh_school_applications where id=p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if app.status<>'accepted' then raise exception 'Only accepted applications can be offered'; end if;
  if app.instructor_id is not null then raise exception 'This applicant has already been assigned'; end if;
  foreach i in array (select array_agg(distinct x) from unnest(p_instructors) x) loop
    if not exists(select 1 from public.qh_lms_accounts where user_id=i and role='instructor' and active)
      then raise exception 'Choose active instructors only'; end if;
    insert into public.qh_school_application_offers(application_id,instructor_id,offered_by)
      values (app.id,i,p_actor)
      on conflict (application_id,instructor_id) do update
        set status='offered',offered_by=excluded.offered_by,offered_at=now(),responded_at=null
        where public.qh_school_application_offers.status<>'offered';
    if found then
      offered := offered||i;
      insert into public.qh_school_application_assignments(application_id,action,new_instructor_id,actor_id)
        values (app.id,'offer',i,p_actor);
    end if;
  end loop;
  return jsonb_build_object('application_id',app.id,'offered_instructor_ids',to_jsonb(offered));
end $fn$;

-- Instructor accepts (or declines) an offer. Accept locks the application row
-- (inside qh_assign_application), so concurrent accepts serialize: the loser
-- sees instructor_id already set and fails.
create or replace function public.qh_respond_application_offer(
  p_application uuid, p_instructor uuid, p_accept boolean
) returns jsonb language plpgsql security definer set search_path to '' as $fn$
declare app public.qh_school_applications%rowtype; o public.qh_school_application_offers%rowtype; res jsonb;
begin
  select * into app from public.qh_school_applications where id=p_application for update;
  if not found then raise exception 'Application not found'; end if;
  select * into o from public.qh_school_application_offers
    where application_id=p_application and instructor_id=p_instructor for update;
  if not found then raise exception 'No offer found for you on this applicant'; end if;
  if o.status='withdrawn' then raise exception 'This offer was withdrawn by the administrator'; end if;
  if app.instructor_id is not null and app.instructor_id<>p_instructor or o.status='closed' then
    raise exception 'Already taken: another instructor accepted this student first'; end if;
  if o.status<>'offered' then raise exception 'You already responded to this offer'; end if;
  if not p_accept then
    update public.qh_school_application_offers set status='declined',responded_at=now() where id=o.id;
    insert into public.qh_school_application_assignments(application_id,action,new_instructor_id,actor_id)
      values (app.id,'offer_decline',p_instructor,p_instructor);
    return jsonb_build_object('application_id',app.id,'declined',true);
  end if;
  res := public.qh_assign_application(p_application,p_instructor,p_instructor,'claim');
  update public.qh_school_application_offers set status='accepted',responded_at=now() where id=o.id;
  update public.qh_school_application_offers set status='closed',responded_at=now()
    where application_id=p_application and id<>o.id and status='offered';
  insert into public.qh_school_application_assignments(application_id,action,new_instructor_id,actor_id,enrolled_course_ids)
    values (app.id,'offer_accept',p_instructor,p_instructor,
      coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(res->'enrolled_course_ids') x),'{}'));
  return res||jsonb_build_object('accepted_offer',true);
end $fn$;

create or replace function public.qh_withdraw_application_offer(
  p_application uuid, p_instructor uuid, p_actor uuid
) returns jsonb language plpgsql security definer set search_path to '' as $fn$
begin
  if not exists(select 1 from public.qh_staff_members where user_id=p_actor) then raise exception 'Administrator required'; end if;
  perform 1 from public.qh_school_applications where id=p_application for update;
  update public.qh_school_application_offers set status='withdrawn',responded_at=now()
    where application_id=p_application and instructor_id=p_instructor and status='offered';
  if not found then raise exception 'No open offer to withdraw'; end if;
  insert into public.qh_school_application_assignments(application_id,action,new_instructor_id,actor_id)
    values (p_application,'offer_withdraw',p_instructor,p_actor);
  return jsonb_build_object('application_id',p_application,'withdrawn',p_instructor);
end $fn$;

-- Direct assign/claim should also close any open offers.
create or replace function public.qh_close_offers_on_assign() returns trigger
language plpgsql security definer set search_path to '' as $fn$
begin
  if new.instructor_id is not null and new.instructor_id is distinct from old.instructor_id then
    update public.qh_school_application_offers set status='closed',responded_at=now()
      where application_id=new.id and status='offered' and instructor_id<>new.instructor_id;
    update public.qh_school_application_offers set status='accepted',responded_at=now()
      where application_id=new.id and status='offered' and instructor_id=new.instructor_id;
  end if;
  return new;
end $fn$;
drop trigger if exists qh_close_offers_on_assign on public.qh_school_applications;
create trigger qh_close_offers_on_assign after update of instructor_id on public.qh_school_applications
  for each row execute function public.qh_close_offers_on_assign();

revoke all on function public.qh_offer_application(uuid,uuid[],uuid) from public,anon,authenticated;
revoke all on function public.qh_respond_application_offer(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.qh_withdraw_application_offer(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.qh_close_offers_on_assign() from public,anon,authenticated;
grant execute on function public.qh_offer_application(uuid,uuid[],uuid) to service_role;
grant execute on function public.qh_respond_application_offer(uuid,uuid,boolean) to service_role;
grant execute on function public.qh_withdraw_application_offer(uuid,uuid,uuid) to service_role;
