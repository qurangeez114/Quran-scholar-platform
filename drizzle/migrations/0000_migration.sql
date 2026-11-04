-- ===== Enums
create type public.equb_periodicity as enum ('weekly','biweekly','monthly');
create type public.equb_payout_method as enum ('manual','rotating','random');
create type public.equb_role as enum ('organizer','participant');
create type public.equb_group_status as enum ('forming','active','completed');

-- ===== Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  full_name text,
  avatar_url text,
  country text,
  city text,
  preferred_language text not null default 'en',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_len check (char_length(display_name) between 1 and 60),
  constraint profiles_lang check (preferred_language in ('en','ti','am','ar','fr','it','de','sv','nl'))
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, full_name)
  values (new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), 'Member'), 60),
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ===== Groups
create table public.equb_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 1000),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  periodicity public.equb_periodicity not null,
  contribution_amount numeric(14,2) not null check (contribution_amount > 0 and contribution_amount < 100000000),
  max_members int not null check (max_members between 2 and 100),
  start_date date not null,
  timezone text not null default 'UTC',
  payout_method public.equb_payout_method not null default 'rotating',
  rules text check (char_length(rules) <= 4000),
  organizer_id uuid not null,
  status public.equb_group_status not null default 'forming',
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default now()
);
grant select on public.equb_groups to authenticated;
grant all on public.equb_groups to service_role;
alter table public.equb_groups enable row level security;

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  user_id uuid not null,
  role public.equb_role not null default 'participant',
  payout_position int,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create index on public.group_members(user_id);
grant select on public.group_members to authenticated;
grant all on public.group_members to service_role;
alter table public.group_members enable row level security;

create or replace function public.is_group_member(_group uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.group_members where group_id=_group and user_id=_user) $$;
create or replace function public.is_group_organizer(_group uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.group_members where group_id=_group and user_id=_user and role='organizer') $$;

create policy "members read group" on public.equb_groups for select to authenticated using (public.is_group_member(id, auth.uid()));
create policy "members read membership" on public.group_members for select to authenticated using (public.is_group_member(group_id, auth.uid()));

-- ===== Invites (never selectable by non-organizers; codes not enumerable)
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  code text not null unique,
  created_by uuid not null,
  expires_at timestamptz not null,
  max_uses int not null default 1 check (max_uses between 1 and 100),
  uses int not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.group_invites to authenticated;
grant all on public.group_invites to service_role;
alter table public.group_invites enable row level security;
create policy "organizers read invites" on public.group_invites for select to authenticated using (public.is_group_organizer(group_id, auth.uid()));

create table public.invite_responses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.group_invites(id) on delete cascade,
  user_id uuid not null,
  response text not null check (response in ('accepted','declined')),
  created_at timestamptz not null default now(),
  unique (invite_id, user_id)
);
grant select on public.invite_responses to authenticated;
grant all on public.invite_responses to service_role;
alter table public.invite_responses enable row level security;
create policy "own responses" on public.invite_responses for select to authenticated using (auth.uid() = user_id);

-- ===== Rounds / payouts
create table public.equb_rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  round_number int not null,
  due_date date not null,
  recipient_id uuid,
  payout_recorded_at timestamptz,
  payout_recorded_by uuid,
  recipient_confirmed_at timestamptz,
  payout_note text check (char_length(payout_note) <= 500),
  created_at timestamptz not null default now(),
  unique (group_id, round_number)
);
grant select on public.equb_rounds to authenticated;
grant all on public.equb_rounds to service_role;
alter table public.equb_rounds enable row level security;
create policy "members read rounds" on public.equb_rounds for select to authenticated using (public.is_group_member(group_id, auth.uid()));

-- ===== Contributions ledger (records only)
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  round_id uuid not null references public.equb_rounds(id) on delete cascade,
  payer_id uuid not null,
  amount numeric(14,2) not null check (amount > 0 and amount < 100000000),
  note text check (char_length(note) <= 500),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  payer_confirmed_at timestamptz,
  organizer_confirmed_at timestamptz,
  unique (round_id, payer_id)
);
create index on public.contributions(group_id);
grant select on public.contributions to authenticated;
grant all on public.contributions to service_role;
alter table public.contributions enable row level security;
create policy "members read contributions" on public.contributions for select to authenticated using (public.is_group_member(group_id, auth.uid()));

-- ===== Activity log (append-only, via functions)
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_log(group_id, created_at desc);
grant select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "members read log" on public.activity_log for select to authenticated using (public.is_group_member(group_id, auth.uid()));

-- ===== Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid references public.equb_groups(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Internal helpers
create or replace function public._log(_group uuid, _action text, _etype text, _eid uuid, _details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log(group_id, actor_id, action, entity_type, entity_id, details)
  values (_group, auth.uid(), _action, _etype, _eid, coalesce(_details,'{}'::jsonb)) $$;

create or replace function public._notify(_user uuid, _group uuid, _kind text, _title text, _body text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, group_id, kind, title, body, link)
  select _user, _group, _kind, _title, _body, _link where _user is not null and _user is distinct from auth.uid() $$;

create or replace function public._notify_organizers(_group uuid, _kind text, _title text, _body text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, group_id, kind, title, body, link)
  select user_id, _group, _kind, _title, _body, _link from public.group_members
  where group_id=_group and role='organizer' and user_id is distinct from auth.uid() $$;

revoke execute on function public._log(uuid,text,text,uuid,jsonb) from public, anon, authenticated;
revoke execute on function public._notify(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke execute on function public._notify_organizers(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function public._display_name(_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select display_name from public.profiles where id=_user),'A member') $$;
revoke execute on function public._display_name(uuid) from public, anon, authenticated;

-- ===== RPC: member directory (display name + avatar only)
create or replace function public.get_group_members(_group uuid)
returns table(user_id uuid, role public.equb_role, payout_position int, joined_at timestamptz, display_name text, avatar_url text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_group_member(_group, auth.uid()) then raise exception 'Not a member of this group'; end if;
  return query select m.user_id, m.role, m.payout_position, m.joined_at, coalesce(p.display_name,'Member'), p.avatar_url
    from public.group_members m left join public.profiles p on p.id=m.user_id
    where m.group_id=_group order by m.payout_position nulls last, m.joined_at;
end $$;

-- ===== RPC: create group
create or replace function public.create_group(
  _name text, _description text, _currency text, _periodicity public.equb_periodicity,
  _amount numeric, _max_members int, _start_date date, _timezone text,
  _payout_method public.equb_payout_method, _rules text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if _timezone is null or not exists (select 1 from pg_timezone_names where name=_timezone) then raise exception 'Unknown timezone'; end if;
  insert into public.equb_groups(name, description, currency, periodicity, contribution_amount, max_members, start_date, timezone, payout_method, rules, organizer_id)
  values (trim(_name), nullif(trim(_description),''), upper(_currency), _periodicity, _amount, _max_members, _start_date, _timezone, _payout_method, nullif(trim(_rules),''), uid)
  returning id into gid;
  insert into public.group_members(group_id, user_id, role, payout_position) values (gid, uid, 'organizer', 1);
  perform public._log(gid, 'group_created', 'group', gid, jsonb_build_object('name', trim(_name)));
  return gid;
end $$;

-- ===== RPC: update group text fields
create or replace function public.update_group(_group uuid, _name text, _description text, _rules text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can edit the group'; end if;
  update public.equb_groups set name=trim(_name), description=nullif(trim(_description),''), rules=nullif(trim(_rules),'') where id=_group;
  perform public._log(_group, 'group_updated', 'group', _group, '{}'::jsonb);
end $$;

-- ===== RPC: invites
create or replace function public.create_invite(_group uuid, _days int default 7, _max_uses int default 1)
returns text language plpgsql security definer set search_path = public as $$
declare c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can invite'; end if;
  if _days < 1 or _days > 30 then raise exception 'Expiry must be 1-30 days'; end if;
  loop
    c := '';
    for i in 1..12 loop c := c || substr(alphabet, 1 + (get_byte(gen_random_bytes(1),0) % 32), 1); end loop;
    exit when not exists (select 1 from public.group_invites where code=c);
  end loop;
  insert into public.group_invites(group_id, code, created_by, expires_at, max_uses)
  values (_group, c, auth.uid(), now() + make_interval(days => _days), greatest(1, least(_max_uses, 100)));
  perform public._log(_group, 'invite_created', 'invite', null, jsonb_build_object('expires_days', _days));
  return c;
end $$;

create or replace function public.revoke_invite(_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select group_id into g from public.group_invites where id=_invite;
  if g is null or not public.is_group_organizer(g, auth.uid()) then raise exception 'Not allowed'; end if;
  update public.group_invites set revoked=true where id=_invite;
  perform public._log(g, 'invite_revoked', 'invite', _invite, '{}'::jsonb);
end $$;

create or replace function public.preview_invite(_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare inv record; g record; cnt int;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into inv from public.group_invites where code = upper(trim(_code));
  if inv is null then return json_build_object('valid', false, 'reason', 'not_found'); end if;
  if inv.revoked then return json_build_object('valid', false, 'reason', 'revoked'); end if;
  if inv.expires_at < now() then return json_build_object('valid', false, 'reason', 'expired'); end if;
  select * into g from public.equb_groups where id = inv.group_id;
  select count(*) into cnt from public.group_members where group_id = g.id;
  return json_build_object('valid', true,
    'already_member', public.is_group_member(g.id, auth.uid()),
    'exhausted', inv.uses >= inv.max_uses,
    'full', cnt >= g.max_members,
    'group', json_build_object('id', g.id, 'name', g.name, 'description', g.description, 'currency', g.currency,
      'periodicity', g.periodicity, 'contribution_amount', g.contribution_amount, 'max_members', g.max_members,
      'member_count', cnt, 'start_date', g.start_date, 'timezone', g.timezone, 'payout_method', g.payout_method,
      'rules', g.rules, 'organizer_name', public._display_name(g.organizer_id)));
end $$;

create or replace function public.accept_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv record; g record; cnt int; uid uuid := auth.uid(); pos int;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into inv from public.group_invites where code = upper(trim(_code)) for update;
  if inv is null or inv.revoked or inv.expires_at < now() then raise exception 'This invite is not valid'; end if;
  if public.is_group_member(inv.group_id, uid) then return inv.group_id; end if; -- idempotent
  if inv.uses >= inv.max_uses then raise exception 'This invite has already been used'; end if;
  select * into g from public.equb_groups where id=inv.group_id for update;
  select count(*), coalesce(max(payout_position),0) into cnt, pos from public.group_members where group_id=g.id;
  if cnt >= g.max_members then raise exception 'This group is full'; end if;
  insert into public.group_members(group_id, user_id, role, payout_position) values (g.id, uid, 'participant', pos + 1);
  update public.group_invites set uses = uses + 1 where id = inv.id;
  insert into public.invite_responses(invite_id, user_id, response) values (inv.id, uid, 'accepted')
    on conflict (invite_id, user_id) do update set response='accepted', created_at=now();
  perform public._log(g.id, 'member_joined', 'member', uid, '{}'::jsonb);
  perform public._notify_organizers(g.id, 'member_joined', public._display_name(uid) || ' joined ' || g.name, null, '/groups/' || g.id);
  return g.id;
end $$;

create or replace function public.decline_invite(_code text)
returns void language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into inv from public.group_invites where code = upper(trim(_code));
  if inv is null then raise exception 'This invite is not valid'; end if;
  if public.is_group_member(inv.group_id, auth.uid()) then raise exception 'You are already a member'; end if;
  insert into public.invite_responses(invite_id, user_id, response) values (inv.id, auth.uid(), 'declined')
    on conflict (invite_id, user_id) do update set response='declined', created_at=now();
  perform public._notify_organizers(inv.group_id, 'invite_declined', 'An invite was declined', null, '/groups/' || inv.group_id);
end $$;

-- ===== RPC: payout order + schedule
create or replace function public.set_payout_order(_group uuid, _users uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can set the order'; end if;
  if exists (select 1 from public.contributions where group_id=_group) then raise exception 'Order is locked once contributions are recorded'; end if;
  if (select count(*) from public.group_members where group_id=_group) <> coalesce(array_length(_users,1),0)
     or exists (select 1 from unnest(_users) u where not public.is_group_member(_group, u)) then raise exception 'Order must list every member exactly once'; end if;
  for i in 1..array_length(_users,1) loop
    update public.group_members set payout_position = i where group_id=_group and user_id=_users[i];
  end loop;
  perform public._log(_group, 'payout_order_set', 'group', _group, jsonb_build_object('method','manual'));
end $$;

create or replace function public.generate_schedule(_group uuid)
returns int language plpgsql security definer set search_path = public as $$
declare g record; n int; m record; idx int := 0; step interval;
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can generate the schedule'; end if;
  if exists (select 1 from public.contributions where group_id=_group) or exists (select 1 from public.equb_rounds where group_id=_group and payout_recorded_at is not null)
    then raise exception 'Schedule is locked once records exist'; end if;
  select * into g from public.equb_groups where id=_group;
  select count(*) into n from public.group_members where group_id=_group;
  if n < 2 then raise exception 'At least 2 members are needed to build a schedule'; end if;
  step := case g.periodicity when 'weekly' then interval '7 days' when 'biweekly' then interval '14 days' else interval '1 month' end;
  delete from public.equb_rounds where group_id=_group;
  for m in
    select user_id from public.group_members where group_id=_group
    order by case when g.payout_method='random' then random() else 0 end,
             case when g.payout_method='manual' then payout_position end nulls last,
             joined_at
  loop
    idx := idx + 1;
    insert into public.equb_rounds(group_id, round_number, due_date, recipient_id)
    values (_group, idx, (g.start_date + step * (idx - 1))::date, m.user_id);
    update public.group_members set payout_position = idx where group_id=_group and user_id=m.user_id;
  end loop;
  update public.equb_groups set status='active' where id=_group;
  perform public._log(_group, 'schedule_generated', 'group', _group, jsonb_build_object('rounds', idx, 'method', g.payout_method));
  insert into public.notifications(user_id, group_id, kind, title, body, link)
    select user_id, _group, 'schedule', 'Payout schedule ready for ' || g.name, 'Check your round and due dates.', '/groups/' || _group
    from public.group_members where group_id=_group and user_id <> auth.uid();
  return idx;
end $$;

-- ===== RPC: contributions
create or replace function public.record_contribution(_round uuid, _payer uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; cid uuid; uid uuid := auth.uid(); existing record;
begin
  select * into r from public.equb_rounds where id=_round;
  if r is null or not public.is_group_member(r.group_id, uid) then raise exception 'Not allowed'; end if;
  if _payer <> uid and not public.is_group_organizer(r.group_id, uid) then raise exception 'Only the organizer can record for another member'; end if;
  if not public.is_group_member(r.group_id, _payer) then raise exception 'Payer is not a member'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into existing from public.contributions where round_id=_round and payer_id=_payer;
  if existing is not null then
    if existing.payer_confirmed_at is not null or existing.organizer_confirmed_at is not null then
      raise exception 'This record already has a confirmation and cannot be changed';
    end if;
    update public.contributions set amount=_amount, note=nullif(trim(_note),''), recorded_by=uid, recorded_at=now() where id=existing.id returning id into cid;
    perform public._log(r.group_id, 'contribution_updated', 'contribution', cid, jsonb_build_object('round', r.round_number, 'amount', _amount, 'payer', _payer));
  else
    insert into public.contributions(group_id, round_id, payer_id, amount, note, recorded_by)
    values (r.group_id, _round, _payer, _amount, nullif(trim(_note),''), uid) returning id into cid;
    perform public._log(r.group_id, 'contribution_recorded', 'contribution', cid, jsonb_build_object('round', r.round_number, 'amount', _amount, 'payer', _payer));
  end if;
  if _payer <> uid then
    perform public._notify(_payer, r.group_id, 'confirm_needed', 'Please confirm your contribution for round ' || r.round_number, 'Recorded by the organizer.', '/groups/' || r.group_id);
  else
    perform public._notify_organizers(r.group_id, 'confirm_needed', public._display_name(uid) || ' recorded a contribution for round ' || r.round_number, 'Awaiting your confirmation.', '/groups/' || r.group_id);
  end if;
  return cid;
end $$;

create or replace function public.confirm_contribution(_contribution uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c record; uid uuid := auth.uid(); is_org boolean; changed boolean := false;
begin
  select * into c from public.contributions where id=_contribution for update;
  if c is null or not public.is_group_member(c.group_id, uid) then raise exception 'Not allowed'; end if;
  is_org := public.is_group_organizer(c.group_id, uid);
  if uid <> c.payer_id and not is_org then raise exception 'Only the payer or organizer can confirm'; end if;
  if uid = c.payer_id and c.payer_confirmed_at is null then
    update public.contributions set payer_confirmed_at = now() where id=c.id; changed := true;
    perform public._log(c.group_id, 'contribution_payer_confirmed', 'contribution', c.id, '{}'::jsonb);
    perform public._notify_organizers(c.group_id, 'confirmed', public._display_name(uid) || ' confirmed a contribution', null, '/groups/' || c.group_id);
  end if;
  if is_org and c.organizer_confirmed_at is null then
    update public.contributions set organizer_confirmed_at = now() where id=c.id; changed := true;
    perform public._log(c.group_id, 'contribution_organizer_confirmed', 'contribution', c.id, '{}'::jsonb);
    perform public._notify(c.payer_id, c.group_id, 'confirmed', 'Organizer confirmed your contribution', null, '/groups/' || c.group_id);
  end if;
  return json_build_object('changed', changed);
end $$;

-- ===== RPC: payouts
create or replace function public.record_payout(_round uuid, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.equb_rounds where id=_round for update;
  if r is null or not public.is_group_organizer(r.group_id, auth.uid()) then raise exception 'Only the organizer can record a payout'; end if;
  if r.payout_recorded_at is not null then return; end if; -- idempotent
  update public.equb_rounds set payout_recorded_at=now(), payout_recorded_by=auth.uid(), payout_note=nullif(trim(_note),'') where id=_round;
  perform public._log(r.group_id, 'payout_recorded', 'round', _round, jsonb_build_object('round', r.round_number, 'recipient', r.recipient_id));
  perform public._notify(r.recipient_id, r.group_id, 'confirm_needed', 'Please confirm you received the round ' || r.round_number || ' payout', 'Marked as paid outside the app by the organizer.', '/groups/' || r.group_id);
end $$;

create or replace function public.confirm_payout(_round uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.equb_rounds where id=_round for update;
  if r is null or r.recipient_id <> auth.uid() then raise exception 'Only the recipient can confirm receipt'; end if;
  if r.payout_recorded_at is null then raise exception 'The organizer has not recorded this payout yet'; end if;
  if r.recipient_confirmed_at is not null then return; end if;
  update public.equb_rounds set recipient_confirmed_at=now() where id=_round;
  perform public._log(r.group_id, 'payout_recipient_confirmed', 'round', _round, jsonb_build_object('round', r.round_number));
  perform public._notify_organizers(r.group_id, 'confirmed', public._display_name(auth.uid()) || ' confirmed receiving round ' || r.round_number, null, '/groups/' || r.group_id);
end $$;

revoke execute on function public.get_group_members(uuid) from anon;
revoke execute on function public.create_group(text,text,text,public.equb_periodicity,numeric,int,date,text,public.equb_payout_method,text) from anon;
revoke execute on function public.update_group(uuid,text,text,text) from anon;
revoke execute on function public.create_invite(uuid,int,int) from anon;
revoke execute on function public.revoke_invite(uuid) from anon;
revoke execute on function public.preview_invite(text) from anon;
revoke execute on function public.accept_invite(text) from anon;
revoke execute on function public.decline_invite(text) from anon;
revoke execute on function public.set_payout_order(uuid,uuid[]) from anon;
revoke execute on function public.generate_schedule(uuid) from anon;
revoke execute on function public.record_contribution(uuid,uuid,numeric,text) from anon;
revoke execute on function public.confirm_contribution(uuid) from anon;
revoke execute on function public.record_payout(uuid,text) from anon;
revoke execute on function public.confirm_payout(uuid) from anon;