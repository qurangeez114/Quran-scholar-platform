-- Visitor analytics: write-only collector and owner-only report.
-- No service-role key is ever exposed to a browser.
-- A random session UUID distinguishes visits, not human identities.

drop policy if exists behavior_sessions_admin_read on public.behavior_sessions;
drop policy if exists behavior_events_admin_read on public.behavior_events;
drop policy if exists behavior_sessions_insert on public.behavior_sessions;
drop policy if exists behavior_sessions_update on public.behavior_sessions;
drop policy if exists behavior_events_insert on public.behavior_events;
create policy behavior_sessions_owner_read on public.behavior_sessions
  for select to authenticated using (public.qh_is_staff());
create policy behavior_events_owner_read on public.behavior_events
  for select to authenticated using (public.qh_is_staff());

-- Anonymous callers must never query private visit data or submit arbitrary identities.
revoke all on public.behavior_sessions from anon, authenticated;
revoke all on public.behavior_events from anon, authenticated;
grant select on public.behavior_sessions, public.behavior_events to authenticated;

create or replace function public.qh_behavior_ingest(
 p_session_key text,
 p_event_type text,
 p_path text default null,
 p_label text default null,
 p_seconds integer default 0,
 p_country text default null,
 p_region text default null,
 p_city text default null,
 p_device text default null,
 p_referrer text default null
) returns void
language plpgsql security definer set search_path=''
as $body$
declare
 v_uid uuid := auth.uid();
 v_email text;
 v_username text;
 v_time integer := least(greatest(coalesce(p_seconds,0),0),120);
begin
 if p_session_key is null
    or p_session_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then raise exception 'Invalid visitor session'; end if;
 if p_event_type is null or p_event_type not in
    ('page_view','heartbeat','page_leave','monetization_click','signup_wall','identify')
    then raise exception 'Invalid visitor event'; end if;

 -- Identity is verified from a signed-in JWT, not supplied by the caller.
 if v_uid is not null then
  select email, coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'username')
    into v_email,v_username from auth.users where id=v_uid;
 end if;
 insert into public.behavior_sessions(
  session_key,user_id,email,username,signed_in,last_seen_at,
  duration_seconds,page_views,country,region,city,device,referrer,landing_path)
 values(
  p_session_key,v_uid,v_email,v_username,v_uid is not null,now(),
  v_time,case when p_event_type='page_view' then 1 else 0 end,
  nullif(left(trim(p_country),80),''),nullif(left(trim(p_region),80),''),
  nullif(left(trim(p_city),80),''),nullif(left(trim(p_device),20),''),
  nullif(left(trim(p_referrer),300),''),left(coalesce(p_path,'/'),300))
 on conflict(session_key) do update set
  user_id=coalesce(excluded.user_id,public.behavior_sessions.user_id),
  email=coalesce(excluded.email,public.behavior_sessions.email),
  username=coalesce(excluded.username,public.behavior_sessions.username),
  signed_in=public.behavior_sessions.signed_in or excluded.signed_in,
  last_seen_at=now(),
  duration_seconds=public.behavior_sessions.duration_seconds + v_time,
  page_views=public.behavior_sessions.page_views +
   case when p_event_type='page_view' then 1 else 0 end,
  country=coalesce(excluded.country,public.behavior_sessions.country),
  region=coalesce(excluded.region,public.behavior_sessions.region),
  city=coalesce(excluded.city,public.behavior_sessions.city),
  device=coalesce(excluded.device,public.behavior_sessions.device);

 if p_event_type not in ('heartbeat','identify') then
  insert into public.behavior_events(
   session_key,user_id,email,event_type,path,label,seconds_on_page,country)
  values(p_session_key,v_uid,v_email,p_event_type,
   left(coalesce(p_path,'/'),300),left(coalesce(p_label,''),180),v_time,
   nullif(left(trim(p_country),80),''));
 end if;
end;
$body$;

revoke all on function public.qh_behavior_ingest(text,text,text,text,integer,text,text,text,text,text)
 from public, anon, authenticated;
grant execute on function public.qh_behavior_ingest(text,text,text,text,integer,text,text,text,text,text)
 to anon, authenticated;
