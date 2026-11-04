-- =====================================================================
-- REVIEW ONLY. Do NOT apply to production until reviewed and tested
-- against an accurate staging copy of the live database.
-- Builds on 0000 -> 0003. Not in the Drizzle journal.
-- No money movement: contributions and payouts are off-platform records.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Safety prechecks: fail fast if live data already breaks the new rules
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from public.contributions c join public.equb_groups g on g.id = c.group_id
             where c.amount <> g.contribution_amount) then
    raise exception 'Existing contributions differ from the agreed amount. Resolve them before applying 0004.';
  end if;
  if exists (select 1 from public.contributions c join public.equb_rounds r on r.id = c.round_id
             where c.group_id <> r.group_id) then
    raise exception 'Contribution group does not match its round. Resolve before applying 0004.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------
alter type public.equb_group_status add value if not exists 'terminated';

alter table public.group_members add column if not exists verifier_consent_at timestamptz;

alter table public.contributions
  add column if not exists payer_confirmed_by uuid,
  add column if not exists organizer_confirmed_by uuid;   -- the independent verifier

create table if not exists public.missed_contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  round_id uuid not null references public.equb_rounds(id) on delete cascade,
  payer_id uuid not null,
  round_number int not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  detected_on date not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (round_id, payer_id)
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  round_id uuid not null references public.equb_rounds(id) on delete cascade,
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  opened_by uuid not null,
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'withdrawn')),
  resolution text check (char_length(resolution) <= 2000),
  resolved_by uuid,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index if not exists disputes_one_open_per_contribution
  on public.disputes(contribution_id) where status = 'open';

create table if not exists public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  actor_id uuid not null,
  kind text not null check (kind in ('opened', 'note', 'resolved', 'withdrawn')),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.group_terminations (
  group_id uuid primary key references public.equb_groups(id) on delete cascade,
  requested_by uuid not null,
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  requested_at timestamptz not null default now(),
  effective_at timestamptz
);

create table if not exists public.termination_consents (
  group_id uuid not null references public.equb_groups(id) on delete cascade,
  user_id uuid not null,
  consented_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ---------------------------------------------------------------------
-- 1b. Membership information: stop the arbitrary-user oracle
--    Policies now use is_my_group / is_my_organizer, which only ever
--    look at the signed-in user. The 2-argument helpers stay internal.
-- ---------------------------------------------------------------------
create or replace function public.is_my_group(_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_group_member(_group, auth.uid()) $$;

create or replace function public.is_my_organizer(_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_group_organizer(_group, auth.uid()) $$;

-- Grants and RLS for the new tables (reads only; all writes go through RPCs)
do $$ declare t text; begin
  foreach t in array array['missed_contributions','disputes','dispute_events','group_terminations','termination_consents'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
create policy "members read missed" on public.missed_contributions for select to authenticated using (public.is_my_group(group_id));
create policy "members read disputes" on public.disputes for select to authenticated using (public.is_my_group(group_id));
create policy "members read dispute events" on public.dispute_events for select to authenticated
  using (exists (select 1 from public.disputes d where d.id = dispute_id and public.is_my_group(d.group_id)));
create policy "members read termination" on public.group_terminations for select to authenticated using (public.is_my_group(group_id));
create policy "members read termination consents" on public.termination_consents for select to authenticated using (public.is_my_group(group_id));

-- Append-only audit: no UPDATE or DELETE on these tables, even for service code
create or replace function public._append_only() returns trigger language plpgsql as $$
begin raise exception 'This audit record is append-only'; end $$;
create trigger activity_log_append_only before update or delete on public.activity_log for each row execute function public._append_only();
create trigger dispute_events_append_only before update or delete on public.dispute_events for each row execute function public._append_only();

drop policy if exists "members read group" on public.equb_groups;
drop policy if exists "members read membership" on public.group_members;
drop policy if exists "organizers read invites" on public.group_invites;
drop policy if exists "members read rounds" on public.equb_rounds;
drop policy if exists "members read contributions" on public.contributions;
drop policy if exists "members read log" on public.activity_log;
drop policy if exists "members read terms" on public.group_terms;
drop policy if exists "members read acceptances" on public.term_acceptances;

create policy "members read group" on public.equb_groups for select to authenticated using (public.is_my_group(id));
create policy "members read membership" on public.group_members for select to authenticated using (public.is_my_group(group_id));
create policy "organizers read invites" on public.group_invites for select to authenticated using (public.is_my_organizer(group_id));
create policy "members read rounds" on public.equb_rounds for select to authenticated using (public.is_my_group(group_id));
create policy "members read contributions" on public.contributions for select to authenticated using (public.is_my_group(group_id));
create policy "members read log" on public.activity_log for select to authenticated using (public.is_my_group(group_id));
create policy "members read terms" on public.group_terms for select to authenticated using (public.is_my_group(group_id));
create policy "members read acceptances" on public.term_acceptances for select to authenticated using (public.is_my_group(group_id));

-- ---------------------------------------------------------------------
-- 3. Independent verification by consent (no automatic promotion)
-- ---------------------------------------------------------------------
create or replace function public._is_verifier(_group uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members m
    where m.group_id = _group and m.user_id = _user
      and (m.role = 'organizer' or m.verifier_consent_at is not null)) $$;

create or replace function public.consent_to_verify(_group uuid) returns void
language plpgsql security definer set search_path = public as $$
declare changed boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.group_members set verifier_consent_at = now()
    where group_id = _group and user_id = auth.uid() and verifier_consent_at is null;
  changed := found;
  if not changed and not exists (select 1 from public.group_members where group_id = _group and user_id = auth.uid()) then
    raise exception 'Not a member'; end if;
  if changed then
    perform public._log(_group, 'verifier_consent_given', 'member', auth.uid(), '{}'::jsonb);
  end if;
end $$;

create or replace function public.withdraw_verifier_consent(_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.group_members set verifier_consent_at = null
    where group_id = _group and user_id = auth.uid() and verifier_consent_at is not null;
  if found then perform public._log(_group, 'verifier_consent_withdrawn', 'member', auth.uid(), '{}'::jsonb); end if;
end $$;

-- Payer confirms payment. A different authorized verifier confirms receipt.
-- No one confirms their own contribution; the payer branch never sets the verifier fields.
create or replace function public.confirm_contribution(_contribution uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c record; uid uuid := auth.uid(); changed boolean := false; grp public.equb_group_status;
begin
  select * into c from public.contributions where id = _contribution for update;
  if c.id is null or not public.is_group_member(c.group_id, uid) then raise exception 'Not allowed'; end if;
  select status into grp from public.equb_groups where id = c.group_id;
  if grp = 'completed' then raise exception 'This circle is complete; confirmations are closed'; end if;

  if uid = c.payer_id then
    if c.payer_confirmed_at is null then
      update public.contributions set payer_confirmed_at = now(), payer_confirmed_by = uid where id = c.id;
      changed := true;
      perform public._log(c.group_id, 'contribution_payer_confirmed', 'contribution', c.id, '{}'::jsonb);
      perform public._notify_organizers(c.group_id, 'confirmed', public._display_name(uid) || ' confirmed a contribution', null, '/groups/' || c.group_id);
    end if;
  else
    if not public._is_verifier(c.group_id, uid) then
      raise exception 'Only the payer or an authorized verifier can confirm this contribution'; end if;
    if c.organizer_confirmed_at is null then
      update public.contributions set organizer_confirmed_at = now(), organizer_confirmed_by = uid where id = c.id;
      changed := true;
      perform public._log(c.group_id, 'contribution_verified', 'contribution', c.id, jsonb_build_object('verifier', uid));
      perform public._notify(c.payer_id, c.group_id, 'confirmed', 'A verifier confirmed your contribution', null, '/groups/' || c.group_id);
    end if;
  end if;
  return json_build_object('changed', changed);
end $$;

-- ---------------------------------------------------------------------
-- 4. Contributions: agreed amount only; no partial payments yet
-- ---------------------------------------------------------------------
create or replace function public.record_contribution(_round uuid, _payer uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; g record; cid uuid; uid uuid := auth.uid(); existing record;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into r from public.equb_rounds where id = _round for update;
  if r.id is null or not public.is_group_member(r.group_id, uid) then raise exception 'Not allowed'; end if;
  select * into g from public.equb_groups where id = r.group_id;
  if g.status <> 'active' then raise exception 'Contributions can only be recorded for an active circle'; end if;
  if r.payout_recorded_at is not null then raise exception 'This round has already been paid out'; end if;
  if _payer <> uid and not public.is_group_organizer(r.group_id, uid) then raise exception 'Only the organizer can record for another member'; end if;
  if not public.is_group_member(r.group_id, _payer) then raise exception 'Payer is not a member'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Amount must be positive'; end if;
  if _amount <> g.contribution_amount then
    raise exception 'Each contribution must equal the agreed amount of % per round. Partial payments are not supported yet.', g.contribution_amount;
  end if;

  select * into existing from public.contributions where round_id = _round and payer_id = _payer for update;
  if existing.id is not null then
    if existing.payer_confirmed_at is not null or existing.organizer_confirmed_at is not null then
      return existing.id; -- confirmed records are never changed; identical retry is a no-op
    end if;
    if coalesce(existing.note, '') = coalesce(nullif(trim(_note), ''), '') then
      return existing.id; -- identical retry
    end if;
    update public.contributions set note = nullif(trim(_note), ''), recorded_by = uid, recorded_at = now()
      where id = existing.id returning id into cid;
    perform public._log(r.group_id, 'contribution_updated', 'contribution', cid, jsonb_build_object('round', r.round_number, 'payer', _payer));
  else
    insert into public.contributions(group_id, round_id, payer_id, amount, note, recorded_by)
    values (r.group_id, _round, _payer, _amount, nullif(trim(_note), ''), uid) returning id into cid;
    perform public._log(r.group_id, 'contribution_recorded', 'contribution', cid, jsonb_build_object('round', r.round_number, 'payer', _payer, 'amount', _amount));
  end if;

  if _payer <> uid then
    perform public._notify(_payer, r.group_id, 'confirm_needed', 'Please confirm your contribution for round ' || r.round_number, 'Recorded by the organizer.', '/groups/' || r.group_id);
  else
    perform public._notify_organizers(r.group_id, 'confirm_needed', public._display_name(uid) || ' recorded a contribution for round ' || r.round_number, 'Awaiting verification.', '/groups/' || r.group_id);
  end if;
  return cid;
end $$;

-- ---------------------------------------------------------------------
-- 5. Payouts: every member confirmed, no open dispute, active circle only
-- ---------------------------------------------------------------------
create or replace function public.record_payout(_round uuid, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; g record; members int; confirmed int;
begin
  select * into r from public.equb_rounds where id = _round for update;
  if r.id is null or not public.is_group_organizer(r.group_id, auth.uid()) then raise exception 'Only the organizer can record a payout'; end if;
  if r.payout_recorded_at is not null then return; end if; -- idempotent
  select * into g from public.equb_groups where id = r.group_id;
  if g.status <> 'active' then raise exception 'Payouts can only be recorded for an active circle'; end if;
  if exists (select 1 from public.disputes d where d.round_id = _round and d.status = 'open') then
    raise exception 'This round has an open dispute and cannot be paid out until it is resolved'; end if;
  select count(*) into members from public.group_members where group_id = r.group_id;
  select count(*) into confirmed from public.contributions
    where round_id = _round and payer_confirmed_at is not null and organizer_confirmed_at is not null;
  if confirmed < members then
    raise exception 'Every contribution for this round must be confirmed by the payer and a verifier first (% of % confirmed)', confirmed, members;
  end if;
  update public.equb_rounds set payout_recorded_at = now(), payout_recorded_by = auth.uid(), payout_note = nullif(trim(_note), '') where id = _round;
  perform public._log(r.group_id, 'payout_recorded', 'round', _round, jsonb_build_object('round', r.round_number, 'recipient', r.recipient_id));
  perform public._notify(r.recipient_id, r.group_id, 'confirm_needed', 'Please confirm you received the round ' || r.round_number || ' payout', 'Marked as paid outside the app by the organizer.', '/groups/' || r.group_id);
end $$;

-- ---------------------------------------------------------------------
-- 6. Schedule: refuse terminated and completed circles
-- ---------------------------------------------------------------------
create or replace function public.generate_schedule(_group uuid)
returns int language plpgsql security definer set search_path = public as $$
declare g record; n int; m record; idx int := 0; step interval;
begin
  select * into g from public.equb_groups where id = _group for update;
  if g.id is null or not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can generate the schedule'; end if;
  if g.status in ('completed', 'terminated') then raise exception 'This circle is closed and cannot be rescheduled'; end if;
  if exists (select 1 from public.contributions where group_id = _group)
     or exists (select 1 from public.equb_rounds where group_id = _group and payout_recorded_at is not null) then
    raise exception 'Schedule is locked once records exist'; end if;
  select count(*) into n from public.group_members where group_id = _group;
  if n < 2 then raise exception 'At least 2 members are needed to build a schedule'; end if;
  step := case g.periodicity when 'weekly' then interval '7 days' when 'biweekly' then interval '14 days' else interval '1 month' end;
  delete from public.equb_rounds where group_id = _group;
  for m in
    select user_id from public.group_members where group_id = _group
    order by case when g.payout_method = 'random' then random() else 0 end,
             case when g.payout_method = 'manual' then payout_position end nulls last,
             joined_at
  loop
    idx := idx + 1;
    insert into public.equb_rounds(group_id, round_number, due_date, recipient_id)
    values (_group, idx, (g.start_date + step * (idx - 1))::date, m.user_id);
    update public.group_members set payout_position = idx where group_id = _group and user_id = m.user_id;
  end loop;
  update public.equb_groups set status = 'active' where id = _group;
  perform public._log(_group, 'schedule_generated', 'group', _group, jsonb_build_object('rounds', idx, 'method', g.payout_method));
  insert into public.notifications(user_id, group_id, kind, title, body, link)
    select user_id, _group, 'schedule', 'Payout schedule ready for ' || g.name, 'Check your round and due dates.', '/groups/' || _group
    from public.group_members where group_id = _group and user_id <> auth.uid();
  return idx;
end $$;

-- ---------------------------------------------------------------------
-- 7. Missed contributions
--    Due = round due_date in the circle's timezone. A round is missed for a
--    payer once the due date has passed and the payment is not fully confirmed.
-- ---------------------------------------------------------------------
create or replace function public._detect_missed(_group uuid, _as_of date) returns int
language plpgsql security definer set search_path = public as $$
declare g record; rd record; m record; added int := 0; paid boolean;
begin
  select * into g from public.equb_groups where id = _group;
  if g.id is null or g.status <> 'active' then return 0; end if;
  for rd in select id, round_number, due_date from public.equb_rounds where group_id = _group and due_date < _as_of loop
    for m in select user_id from public.group_members where group_id = _group loop
      select exists (select 1 from public.contributions c where c.round_id = rd.id and c.payer_id = m.user_id
                     and c.payer_confirmed_at is not null and c.organizer_confirmed_at is not null) into paid;
      if paid then
        update public.missed_contributions set status = 'resolved', resolved_at = now()
          where round_id = rd.id and payer_id = m.user_id and status = 'open';
      else
        insert into public.missed_contributions(group_id, round_id, payer_id, round_number, due_date, status, detected_on)
          values (_group, rd.id, m.user_id, rd.round_number, rd.due_date, 'open', _as_of)
          on conflict (round_id, payer_id) do nothing;
        if found then
          added := added + 1;
          perform public._notify(m.user_id, _group, 'missed', 'Payment for round ' || rd.round_number || ' is overdue', 'Please pay and ask a verifier to confirm.', '/groups/' || _group);
          perform public._notify_organizers(_group, 'missed', 'Round ' || rd.round_number || ' has an unconfirmed payment', null, '/groups/' || _group);
        end if;
      end if;
    end loop;
  end loop;
  return added;
end $$;

create or replace function public.refresh_missed_contributions(_group uuid) returns int
language plpgsql security definer set search_path = public as $$
declare today date;
begin
  if not public.is_group_member(_group, auth.uid()) then raise exception 'Not allowed'; end if;
  select (now() at time zone g.timezone)::date into today from public.equb_groups g where g.id = _group;
  return public._detect_missed(_group, today);
end $$;

-- ---------------------------------------------------------------------
-- 8. Disputes: a payment can be disputed; the round cannot be paid out
--    while a dispute is open. Resolution is by an independent verifier.
-- ---------------------------------------------------------------------
create or replace function public._is_dispute_party(_contribution uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contributions c join public.equb_rounds r on r.id = c.round_id
    where c.id = _contribution and (c.payer_id = _user or r.recipient_id = _user
          or public.is_group_organizer(c.group_id, _user))) $$;

create or replace function public.open_dispute(_contribution uuid, _reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c record; rd record; uid uuid := auth.uid(); did uuid;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into c from public.contributions where id = _contribution;
  if c.id is null then raise exception 'Not allowed'; end if;
  select * into rd from public.equb_rounds where id = c.round_id;
  if not public.is_group_member(c.group_id, uid) or not public._is_dispute_party(c.id, uid) then
    raise exception 'Only the payer, the round recipient or the organizer can open a dispute'; end if;
  if rd.payout_recorded_at is not null then raise exception 'This round has already been paid out'; end if;
  insert into public.disputes(group_id, round_id, contribution_id, opened_by, reason)
    values (c.group_id, c.round_id, c.id, uid, trim(_reason)) returning id into did;
  insert into public.dispute_events(dispute_id, actor_id, kind, body) values (did, uid, 'opened', trim(_reason));
  perform public._log(c.group_id, 'dispute_opened', 'dispute', did, jsonb_build_object('round', rd.round_number));
  perform public._notify_organizers(c.group_id, 'dispute', 'A dispute was opened for round ' || rd.round_number, null, '/groups/' || c.group_id);
  return did;
end $$;

create or replace function public.add_dispute_note(_dispute uuid, _body text) returns void
language plpgsql security definer set search_path = public as $$
declare d record; c record; uid uuid := auth.uid();
begin
  select * into d from public.disputes where id = _dispute;
  if d.id is null or d.status <> 'open' then raise exception 'This dispute is not open'; end if;
  select * into c from public.contributions where id = d.contribution_id;
  if not public._is_dispute_party(d.contribution_id, uid) and uid <> d.opened_by then raise exception 'Not allowed'; end if;
  if coalesce(trim(_body), '') = '' then raise exception 'Note cannot be empty'; end if;
  insert into public.dispute_events(dispute_id, actor_id, kind, body) values (_dispute, uid, 'note', trim(_body));
end $$;

create or replace function public.resolve_dispute(_dispute uuid, _resolution text) returns void
language plpgsql security definer set search_path = public as $$
declare d record; c record; uid uuid := auth.uid();
begin
  select * into d from public.disputes where id = _dispute for update;
  if d.id is null or d.status <> 'open' then raise exception 'This dispute is not open'; end if;
  select * into c from public.contributions where id = d.contribution_id;
  if not public._is_verifier(d.group_id, uid) then raise exception 'Only an authorized verifier can resolve a dispute'; end if;
  if uid = d.opened_by or uid = c.payer_id then
    raise exception 'The person who opened or is disputed cannot resolve the dispute'; end if;
  if coalesce(trim(_resolution), '') = '' then raise exception 'Resolution must explain the outcome'; end if;
  update public.disputes set status = 'resolved', resolution = trim(_resolution), resolved_by = uid, closed_at = now() where id = _dispute;
  insert into public.dispute_events(dispute_id, actor_id, kind, body) values (_dispute, uid, 'resolved', trim(_resolution));
  perform public._log(d.group_id, 'dispute_resolved', 'dispute', _dispute, jsonb_build_object('resolved_by', uid));
end $$;

create or replace function public.withdraw_dispute(_dispute uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d record; uid uuid := auth.uid();
begin
  select * into d from public.disputes where id = _dispute for update;
  if d.id is null or d.status <> 'open' or d.opened_by <> uid then raise exception 'Only the person who opened an open dispute can withdraw it'; end if;
  update public.disputes set status = 'withdrawn', closed_at = now() where id = _dispute;
  insert into public.dispute_events(dispute_id, actor_id, kind, body) values (_dispute, uid, 'withdrawn', null);
  perform public._log(d.group_id, 'dispute_withdrawn', 'dispute', _dispute, '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- 9. Early termination: organizer requests; every member must consent.
--    Once all members consent, the circle is terminated. No further
--    contributions, payouts or schedules are allowed.
-- ---------------------------------------------------------------------
create or replace function public.request_termination(_group uuid, _reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare g record; members int; consents int; uid uuid := auth.uid();
begin
  select * into g from public.equb_groups where id = _group for update;
  if g.id is null or not public.is_group_organizer(_group, uid) then raise exception 'Only the organizer can request termination'; end if;
  if g.status <> 'active' then raise exception 'Only an active circle can be terminated'; end if;
  if exists (select 1 from public.group_terminations where group_id = _group) then raise exception 'A termination is already requested'; end if;
  insert into public.group_terminations(group_id, requested_by, reason) values (_group, uid, trim(_reason));
  insert into public.termination_consents(group_id, user_id) values (_group, uid);
  perform public._log(_group, 'termination_requested', 'group', _group, jsonb_build_object('reason', trim(_reason)));
  perform public._notify_organizers(_group, 'termination', 'Early termination requested for ' || g.name, trim(_reason), '/groups/' || _group);
  select count(*) into members from public.group_members where group_id = _group;
  select count(*) into consents from public.termination_consents where group_id = _group;
  if consents >= members then return public._effect_termination(_group); end if;
  return false;
end $$;

create or replace function public._effect_termination(_group uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.group_terminations set effective_at = now() where group_id = _group and effective_at is null;
  update public.equb_groups set status = 'terminated' where id = _group;
  perform public._log(_group, 'circle_terminated', 'group', _group, '{}'::jsonb);
  return true;
end $$;

create or replace function public.consent_termination(_group uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare members int; consents int; uid uuid := auth.uid();
begin
  if not public.is_group_member(_group, uid) then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.group_terminations where group_id = _group and effective_at is null) then
    raise exception 'No termination is pending for this circle'; end if;
  insert into public.termination_consents(group_id, user_id) values (_group, uid) on conflict do nothing;
  perform public._log(_group, 'termination_consented', 'member', uid, '{}'::jsonb);
  select count(*) into members from public.group_members where group_id = _group;
  select count(*) into consents from public.termination_consents where group_id = _group;
  if consents >= members then return public._effect_termination(_group); end if;
  return false;
end $$;

-- ---------------------------------------------------------------------
-- 10. Completion and final reconciliation
-- ---------------------------------------------------------------------
create or replace function public.complete_circle(_group uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g record; members int; rounds int; paid_rounds int; full_confirmed int;
begin
  select * into g from public.equb_groups where id = _group for update;
  if g.id is null or not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can complete the circle'; end if;
  if g.status <> 'active' then raise exception 'Only an active circle can be completed'; end if;
  select count(*) into members from public.group_members where group_id = _group;
  select count(*) into rounds from public.equb_rounds where group_id = _group;
  select count(*) into paid_rounds from public.equb_rounds where group_id = _group and payout_recorded_at is not null and recipient_confirmed_at is not null;
  if rounds = 0 or paid_rounds <> rounds then raise exception 'Every round must be paid out and acknowledged first'; end if;
  select count(*) into full_confirmed from public.contributions c
    where c.group_id = _group and c.payer_confirmed_at is not null and c.organizer_confirmed_at is not null;
  if full_confirmed <> rounds * members then raise exception 'Every contribution must be confirmed before completion'; end if;
  if exists (select 1 from public.disputes where group_id = _group and status = 'open') then
    raise exception 'Resolve open disputes before completion'; end if;
  if exists (select 1 from public.missed_contributions where group_id = _group and status = 'open') then
    raise exception 'Resolve missed contributions before completion'; end if;
  update public.equb_groups set status = 'completed' where id = _group;
  perform public._log(_group, 'circle_completed', 'group', _group, jsonb_build_object('rounds', rounds, 'members', members));
end $$;

create or replace function public.circle_reconciliation(_group uuid)
returns table(user_id uuid, display_name text, contributions_expected numeric, contributions_confirmed numeric,
              payout_expected numeric, payout_confirmed numeric, net_position numeric)
language plpgsql stable security definer set search_path = public as $$
declare g record; rounds int; members int;
begin
  if not public.is_group_member(_group, auth.uid()) then raise exception 'Not allowed'; end if;
  select * into g from public.equb_groups where id = _group;
  select count(*) into rounds from public.equb_rounds where group_id = _group;
  select count(*) into members from public.group_members where group_id = _group;
  return query
    with per_member as (
      select m.user_id as uid, m.payout_position as pos, m.joined_at as joined,
        coalesce(p.display_name, 'Member') as name,
        (rounds * g.contribution_amount)::numeric as c_expected,
        coalesce((select sum(c.amount) from public.contributions c
                   where c.group_id = _group and c.payer_id = m.user_id
                     and c.payer_confirmed_at is not null and c.organizer_confirmed_at is not null), 0)::numeric as c_confirmed,
        (select count(*) from public.equb_rounds r where r.group_id = _group and r.recipient_id = m.user_id)::numeric
          * g.contribution_amount * members as p_expected,
        (select count(*) from public.equb_rounds r where r.group_id = _group and r.recipient_id = m.user_id
           and r.recipient_confirmed_at is not null)::numeric
          * g.contribution_amount * members as p_confirmed
      from public.group_members m left join public.profiles p on p.id = m.user_id
      where m.group_id = _group
    )
    select pm.uid, pm.name, pm.c_expected, pm.c_confirmed, pm.p_expected, pm.p_confirmed, pm.p_confirmed - pm.c_confirmed
    from per_member pm
    order by pm.pos nulls last, pm.joined;
end $$;

-- ---------------------------------------------------------------------
-- 11. Lock internal helpers, then grant exactly what members use
-- ---------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function
  public.create_circle(jsonb),
  public.create_group(text, text, text, public.equb_periodicity, numeric, int, date, text, public.equb_payout_method, text),
  public.update_group(uuid, text, text, text),
  public.update_terms(uuid, jsonb, text),
  public.accept_current_terms(uuid, int),
  public.preview_invite(text),
  public.accept_invite_with_terms(text, int),
  public.accept_invite(text),
  public.decline_invite(text),
  public.create_invite(uuid, int, int),
  public.revoke_invite(uuid),
  public.get_group_members(uuid),
  public.set_payout_order(uuid, uuid[]),
  public.generate_schedule(uuid),
  public.record_contribution(uuid, uuid, numeric, text),
  public.confirm_contribution(uuid),
  public.record_payout(uuid, text),
  public.confirm_payout(uuid),
  public.consent_to_verify(uuid),
  public.withdraw_verifier_consent(uuid),
  public.refresh_missed_contributions(uuid),
  public.open_dispute(uuid, text),
  public.add_dispute_note(uuid, text),
  public.resolve_dispute(uuid, text),
  public.withdraw_dispute(uuid),
  public.request_termination(uuid, text),
  public.consent_termination(uuid),
  public.complete_circle(uuid),
  public.circle_reconciliation(uuid)
to authenticated;

-- RLS policies evaluate these as the signed-in user; they only read the caller's own identity.
grant execute on function public.is_my_group(uuid), public.is_my_organizer(uuid) to authenticated;
