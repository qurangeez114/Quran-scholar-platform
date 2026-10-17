-- Keep membership review and invitation consent tied to the CURRENT group owner.
-- Installed as a new migration because the original collaboration migration is already live.
create or replace function public.qh_academic_accept_group(p_request uuid,p_actor uuid)
returns uuid language plpgsql security definer set search_path to '' as $proc$
declare
 r public.qh_academic_group_requests%rowtype;
 g public.qh_academic_study_groups%rowtype;
 current_owner uuid;
begin
 select * into r from public.qh_academic_group_requests where id=p_request for update;
 if not found or r.status<>'pending' then raise exception 'Group request is no longer pending'; end if;
 select * into g from public.qh_academic_study_groups where id=r.group_id;
 if not found or g.archived then raise exception 'Group unavailable'; end if;
 select gm.student_id into current_owner from public.qh_academic_group_members gm
  where gm.group_id=r.group_id and gm.is_owner=true;
 if current_owner is null then raise exception 'Group has no owner'; end if;
 if not exists (
  select 1 from public.qh_courses c
  where c.id=g.course_id and (c.access_closes_at is null or c.access_closes_at>now())
 ) then raise exception 'Class is closed'; end if;
 if not exists (
  select 1 from public.qh_enrollments
  where course_id=g.course_id and user_id=r.student_id
 ) then raise exception 'Student must be enrolled in the class'; end if;
 if exists (
  select 1 from public.qh_academic_message_blocks bl
  where (bl.blocker_id=r.student_id and bl.blocked_id=current_owner)
     or (bl.blocker_id=current_owner and bl.blocked_id=r.student_id)
 ) then raise exception 'Group owner is blocked'; end if;
 if r.kind='invite' then
  if p_actor<>r.student_id then raise exception 'Only invited student may accept'; end if;
  if r.initiated_by<>current_owner then raise exception 'Invitation came from a former group owner'; end if;
 elsif r.kind='join' then
  if p_actor<>current_owner then raise exception 'Only current group owner may approve'; end if;
 else raise exception 'Invalid membership request'; end if;
 insert into public.qh_academic_group_members(group_id,student_id)
 values(r.group_id,r.student_id) on conflict do nothing;
 update public.qh_academic_group_requests
 set status='accepted',resolved_at=now() where id=r.id;
 return r.group_id;
end $proc$;
revoke all on function public.qh_academic_accept_group(uuid,uuid) from public,anon,authenticated;
grant execute on function public.qh_academic_accept_group(uuid,uuid) to service_role;

create or replace function public.qh_academic_transfer_group(p_group uuid,p_old uuid,p_new uuid)
returns boolean language plpgsql security definer set search_path to '' as $proc$
begin
 if p_old=p_new then raise exception 'Choose a different member'; end if;
 perform 1 from public.qh_academic_study_groups where id=p_group and archived=false for update;
 if not found then raise exception 'Study group unavailable'; end if;
 if not exists (
  select 1 from public.qh_academic_group_members
  where group_id=p_group and student_id=p_old and is_owner
 ) then raise exception 'Only current owner may transfer'; end if;
 if not exists (
  select 1 from public.qh_academic_group_members
  where group_id=p_group and student_id=p_new
 ) then raise exception 'New owner must already be a member'; end if;
 update public.qh_academic_group_members set is_owner=false
 where group_id=p_group and student_id=p_old;
 update public.qh_academic_group_members set is_owner=true
 where group_id=p_group and student_id=p_new;
 -- Old owner's invitations must not bind the group after responsibility transfers.
 update public.qh_academic_group_requests
 set status='cancelled',resolved_at=now()
 where group_id=p_group and kind='invite' and initiated_by=p_old and status='pending';
 return true;
end $proc$;
revoke all on function public.qh_academic_transfer_group(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.qh_academic_transfer_group(uuid,uuid,uuid) to service_role;
