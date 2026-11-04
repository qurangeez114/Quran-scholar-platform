alter table public.equb_groups
  add column if not exists eligibility text,
  add column if not exists dropout_rules text,
  add column if not exists missed_payment_rules text,
  add column if not exists dispute_rules text,
  add column if not exists refund_rules text,
  add column if not exists fees_enabled boolean not null default false,
  add column if not exists terms_version integer not null default 0;

create table public.group_terms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  version integer not null,
  terms jsonb not null,
  change_summary text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (group_id, version)
);
grant select on public.group_terms to authenticated;
grant all on public.group_terms to service_role;
alter table public.group_terms enable row level security;
create policy "members read terms" on public.group_terms for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create table public.term_acceptances (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  terms_id uuid not null references public.group_terms(id) on delete cascade,
  version integer not null,
  user_id uuid not null,
  accepted_at timestamptz not null default now(),
  unique (terms_id, user_id)
);
grant select on public.term_acceptances to authenticated;
grant all on public.term_acceptances to service_role;
alter table public.term_acceptances enable row level security;
create policy "members read acceptances" on public.term_acceptances for select to authenticated using (public.is_group_member(group_id, auth.uid()));

-- Snapshot of current terms
create or replace function public._terms_snapshot(_group uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'contribution_amount', g.contribution_amount, 'currency', g.currency, 'periodicity', g.periodicity,
    'max_members', g.max_members, 'payout_amount', g.contribution_amount * g.max_members,
    'start_date', g.start_date, 'timezone', g.timezone, 'payout_method', g.payout_method,
    'fees', case when g.fees_enabled then 'enabled' else 'none' end,
    'eligibility', g.eligibility, 'dropout_rules', g.dropout_rules, 'missed_payment_rules', g.missed_payment_rules,
    'dispute_rules', g.dispute_rules, 'refund_rules', g.refund_rules, 'rules', g.rules,
    'interest', 'none')
  from public.equb_groups g where g.id = _group $$;

create or replace function public._publish_terms(_group uuid, _summary text) returns integer
language plpgsql security definer set search_path = public as $$
declare v int; tid uuid;
begin
  update public.equb_groups set terms_version = terms_version + 1 where id=_group returning terms_version into v;
  insert into public.group_terms(group_id, version, terms, change_summary, created_by)
  values (_group, v, public._terms_snapshot(_group), _summary, auth.uid()) returning id into tid;
  insert into public.term_acceptances(group_id, terms_id, version, user_id) values (_group, tid, v, auth.uid());
  perform public._log(_group, 'terms_published', 'terms', tid, jsonb_build_object('version', v, 'summary', _summary));
  return v;
end $$;

create or replace function public.has_accepted_current_terms(_group uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.term_acceptances a join public.equb_groups g on g.id=a.group_id
    where a.group_id=_group and a.user_id=_user and a.version=g.terms_version) $$;

create or replace function public.create_circle(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid; uid uuid := auth.uid(); pm public.equb_payout_method := (_p->>'payout_method')::public.equb_payout_method;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if pm = 'random' then raise exception 'Random payout order is not available yet (pending review)'; end if;
  if (_p->>'timezone') is null or not exists (select 1 from pg_timezone_names where name=_p->>'timezone') then raise exception 'Unknown timezone'; end if;
  if (_p->>'amount')::numeric <= 0 then raise exception 'Amount must be positive'; end if;
  if (_p->>'max_members')::int not between 2 and 100 then raise exception 'Members must be 2-100'; end if;
  if coalesce(trim(_p->>'missed_payment_rules'),'')='' or coalesce(trim(_p->>'dropout_rules'),'')='' or coalesce(trim(_p->>'dispute_rules'),'')='' then
    raise exception 'Missed-payment, dropout and dispute rules are required'; end if;
  insert into public.equb_groups(name, description, currency, periodicity, contribution_amount, max_members, start_date, timezone,
    payout_method, rules, organizer_id, eligibility, dropout_rules, missed_payment_rules, dispute_rules, refund_rules, fees_enabled)
  values (trim(_p->>'name'), nullif(trim(_p->>'description'),''), upper(_p->>'currency'), (_p->>'periodicity')::public.equb_periodicity,
    (_p->>'amount')::numeric, (_p->>'max_members')::int, (_p->>'start_date')::date, _p->>'timezone', pm, nullif(trim(_p->>'rules'),''), uid,
    nullif(trim(_p->>'eligibility'),''), trim(_p->>'dropout_rules'), trim(_p->>'missed_payment_rules'), trim(_p->>'dispute_rules'),
    nullif(trim(_p->>'refund_rules'),''), false)
  returning id into gid;
  insert into public.group_members(group_id, user_id, role, payout_position) values (gid, uid, 'organizer', 1);
  perform public._log(gid, 'group_created', 'group', gid, jsonb_build_object('name', trim(_p->>'name')));
  perform public._publish_terms(gid, 'Initial terms');
  return gid;
end $$;

-- Old entry point now refuses: terms must be complete
create or replace function public.create_group(
  _name text, _description text, _currency text, _periodicity public.equb_periodicity,
  _amount numeric, _max_members int, _start_date date, _timezone text,
  _payout_method public.equb_payout_method, _rules text)
returns uuid language plpgsql security definer set search_path = public as $$
begin raise exception 'Please update the app: circles now require full written terms'; end $$;

create or replace function public.update_group(_group uuid, _name text, _description text, _rules text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can edit the group'; end if;
  update public.equb_groups set name=trim(_name), description=nullif(trim(_description),'') where id=_group;
  perform public._log(_group, 'group_updated', 'group', _group, '{}'::jsonb);
end $$;

-- Material term change => new version; every other member must re-accept
create or replace function public.update_terms(_group uuid, _p jsonb, _summary text) returns integer
language plpgsql security definer set search_path = public as $$
declare v int; g record;
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can change terms'; end if;
  if coalesce(trim(_summary),'')='' then raise exception 'Describe what changed so members can make an informed decision'; end if;
  if coalesce(trim(_p->>'missed_payment_rules'),'')='' or coalesce(trim(_p->>'dropout_rules'),'')='' or coalesce(trim(_p->>'dispute_rules'),'')='' then
    raise exception 'Missed-payment, dropout and dispute rules are required'; end if;
  update public.equb_groups set eligibility=nullif(trim(_p->>'eligibility'),''), dropout_rules=trim(_p->>'dropout_rules'),
    missed_payment_rules=trim(_p->>'missed_payment_rules'), dispute_rules=trim(_p->>'dispute_rules'),
    refund_rules=nullif(trim(_p->>'refund_rules'),''), rules=nullif(trim(_p->>'rules'),'') where id=_group returning * into g;
  v := public._publish_terms(_group, trim(_summary));
  insert into public.notifications(user_id, group_id, kind, title, body, link)
    select user_id, _group, 'terms_changed', 'Terms changed in ' || g.name, 'Review and re-accept version ' || v || ': ' || trim(_summary), '/groups/' || _group
    from public.group_members where group_id=_group and user_id <> auth.uid();
  return v;
end $$;

create or replace function public.accept_current_terms(_group uuid, _version int) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if not public.is_group_member(_group, auth.uid()) then raise exception 'Not a member'; end if;
  select * into t from public.group_terms where group_id=_group and version=(select terms_version from public.equb_groups where id=_group);
  if t.version <> _version then raise exception 'Terms changed while you were reviewing. Please review the latest version.'; end if;
  insert into public.term_acceptances(group_id, terms_id, version, user_id) values (_group, t.id, t.version, auth.uid()) on conflict do nothing;
  perform public._log(_group, 'terms_accepted', 'terms', t.id, jsonb_build_object('version', t.version));
end $$;

create or replace function public.preview_invite(_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare inv record; g record; cnt int; t record;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into inv from public.group_invites where code = upper(trim(_code));
  if inv is null then return json_build_object('valid', false, 'reason', 'not_found'); end if;
  if inv.revoked then return json_build_object('valid', false, 'reason', 'revoked'); end if;
  if inv.expires_at < now() then return json_build_object('valid', false, 'reason', 'expired'); end if;
  select * into g from public.equb_groups where id = inv.group_id;
  select count(*) into cnt from public.group_members where group_id = g.id;
  select * into t from public.group_terms where group_id=g.id and version=g.terms_version;
  return json_build_object('valid', true,
    'already_member', public.is_group_member(g.id, auth.uid()),
    'exhausted', inv.uses >= inv.max_uses, 'full', cnt >= g.max_members,
    'terms_version', g.terms_version, 'terms_published_at', t.created_at, 'terms', t.terms,
    'group', json_build_object('id', g.id, 'name', g.name, 'description', g.description, 'currency', g.currency,
      'periodicity', g.periodicity, 'contribution_amount', g.contribution_amount, 'max_members', g.max_members,
      'member_count', cnt, 'start_date', g.start_date, 'timezone', g.timezone, 'payout_method', g.payout_method,
      'rules', g.rules, 'organizer_name', public._display_name(g.organizer_id)));
end $$;

create or replace function public.accept_invite_with_terms(_code text, _version int)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv record; g record; cnt int; uid uuid := auth.uid(); pos int; t record;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into inv from public.group_invites where code = upper(trim(_code)) for update;
  if inv is null or inv.revoked or inv.expires_at < now() then raise exception 'This invite is not valid'; end if;
  if public.is_group_member(inv.group_id, uid) then return inv.group_id; end if;
  if inv.uses >= inv.max_uses then raise exception 'This invite has already been used'; end if;
  select * into g from public.equb_groups where id=inv.group_id for update;
  if g.terms_version <> _version then raise exception 'The terms changed while you were reviewing. Please review the latest version.'; end if;
  select count(*), coalesce(max(payout_position),0) into cnt, pos from public.group_members where group_id=g.id;
  if cnt >= g.max_members then raise exception 'This group is full'; end if;
  insert into public.group_members(group_id, user_id, role, payout_position) values (g.id, uid, 'participant', pos + 1);
  update public.group_invites set uses = uses + 1 where id = inv.id;
  insert into public.invite_responses(invite_id, user_id, response) values (inv.id, uid, 'accepted')
    on conflict (invite_id, user_id) do update set response='accepted', created_at=now();
  select * into t from public.group_terms where group_id=g.id and version=g.terms_version;
  insert into public.term_acceptances(group_id, terms_id, version, user_id) values (g.id, t.id, t.version, uid);
  perform public._log(g.id, 'member_joined', 'member', uid, jsonb_build_object('terms_version', t.version));
  perform public._notify_organizers(g.id, 'member_joined', public._display_name(uid) || ' joined ' || g.name, null, '/groups/' || g.id);
  return g.id;
end $$;

create or replace function public.accept_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
begin raise exception 'Please review and accept the circle terms first'; end $$;

-- Contributions require the payer to have accepted the current terms
create or replace function public._require_terms() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_accepted_current_terms(new.group_id, new.payer_id) then
    raise exception 'This member must accept the current circle terms before contributions are recorded'; end if;
  return new;
end $$;
create trigger contributions_require_terms before insert on public.contributions for each row execute function public._require_terms();

-- Schedule requires everyone to accept current terms, and random draw is disabled
create or replace function public._schedule_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select payout_method from public.equb_groups where id=new.group_id) = 'random' then
    raise exception 'Random payout order is not available yet (pending review)'; end if;
  if exists (select 1 from public.group_members m where m.group_id=new.group_id and not public.has_accepted_current_terms(new.group_id, m.user_id)) then
    raise exception 'Every member must accept the current terms before the schedule is built'; end if;
  return new;
end $$;
create trigger rounds_schedule_guard before insert on public.equb_rounds for each row execute function public._schedule_guard();

-- Backfill v1 terms for any existing circles
do $$ declare r record; tid uuid; begin
  for r in select id, organizer_id from public.equb_groups where terms_version = 0 loop
    update public.equb_groups set terms_version = 1 where id = r.id;
    insert into public.group_terms(group_id, version, terms, change_summary, created_by)
      values (r.id, 1, public._terms_snapshot(r.id), 'Initial terms', r.organizer_id) returning id into tid;
    insert into public.term_acceptances(group_id, terms_id, version, user_id) values (r.id, tid, 1, r.organizer_id);
  end loop; end $$;

revoke execute on function public.create_circle(jsonb) from anon;
revoke execute on function public.update_terms(uuid, jsonb, text) from anon;
revoke execute on function public.accept_current_terms(uuid, int) from anon;
revoke execute on function public.accept_invite_with_terms(text, int) from anon;
revoke execute on function public._publish_terms(uuid, text) from anon, authenticated;
revoke execute on function public._terms_snapshot(uuid) from anon, authenticated;