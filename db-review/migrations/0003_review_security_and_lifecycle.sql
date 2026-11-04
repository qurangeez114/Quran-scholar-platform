-- =====================================================================
-- REVIEW ONLY. Do NOT apply to any live database until approved.
-- Builds on drizzle/migrations 0000 -> 0002. Not in the Drizzle journal.
-- No money movement: payouts and contributions remain off-platform records.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Least-privilege EXECUTE
--    Postgres grants EXECUTE to PUBLIC by default, so revoking only from
--    anon (as 0000/0002 did) left every function callable by anon.
--    Start from zero, then grant back exactly what signed-in members use.
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

-- Signed-in member RPCs (the app and the group-detail workflow call these)
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
  public.confirm_payout(uuid)
to authenticated;

-- RLS policies evaluate these as the signed-in user, so they must stay executable.
grant execute on function public.is_group_member(uuid, uuid), public.is_group_organizer(uuid, uuid) to authenticated;

-- Everything else (_terms_snapshot, _publish_terms, _log, _notify*, trigger
-- functions, has_accepted_current_terms) remains internal-only.

-- ---------------------------------------------------------------------
-- 2. Contribution concurrency
--    Lock the round first. Simultaneous submissions for the same round
--    queue behind the lock, so the existence check cannot race into a
--    unique-constraint error. Identical retries return the same record.
--    Confirmed records are never changed.
-- ---------------------------------------------------------------------
create or replace function public.record_contribution(_round uuid, _payer uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; cid uuid; uid uuid := auth.uid(); existing record; grp_status public.equb_group_status;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into r from public.equb_rounds where id = _round for update;
  if r.id is null or not public.is_group_member(r.group_id, uid) then raise exception 'Not allowed'; end if;
  select status into grp_status from public.equb_groups where id = r.group_id;
  if grp_status <> 'active' then raise exception 'Contributions can only be recorded for an active circle'; end if;
  if _payer <> uid and not public.is_group_organizer(r.group_id, uid) then raise exception 'Only the organizer can record for another member'; end if;
  if not public.is_group_member(r.group_id, _payer) then raise exception 'Payer is not a member'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Amount must be positive'; end if;

  select * into existing from public.contributions where round_id = _round and payer_id = _payer;
  if existing.id is not null then
    if existing.payer_confirmed_at is not null or existing.organizer_confirmed_at is not null then
      if existing.amount = _amount then return existing.id; end if; -- idempotent retry
      raise exception 'This contribution is already confirmed and cannot be changed';
    end if;
    if existing.amount = _amount and coalesce(existing.note, '') = coalesce(nullif(trim(_note), ''), '') then
      return existing.id; -- idempotent retry, nothing to change
    end if;
    update public.contributions
      set amount = _amount, note = nullif(trim(_note), ''), recorded_by = uid, recorded_at = now()
      where id = existing.id returning id into cid;
    perform public._log(r.group_id, 'contribution_updated', 'contribution', cid,
      jsonb_build_object('round', r.round_number, 'amount', _amount, 'payer', _payer));
  else
    insert into public.contributions(group_id, round_id, payer_id, amount, note, recorded_by)
    values (r.group_id, _round, _payer, _amount, nullif(trim(_note), ''), uid) returning id into cid;
    perform public._log(r.group_id, 'contribution_recorded', 'contribution', cid,
      jsonb_build_object('round', r.round_number, 'amount', _amount, 'payer', _payer));
  end if;

  if _payer <> uid then
    perform public._notify(_payer, r.group_id, 'confirm_needed', 'Please confirm your contribution for round ' || r.round_number, 'Recorded by the organizer.', '/groups/' || r.group_id);
  else
    perform public._notify_organizers(r.group_id, 'confirm_needed', public._display_name(uid) || ' recorded a contribution for round ' || r.round_number, 'Awaiting your confirmation.', '/groups/' || r.group_id);
  end if;
  return cid;
end $$;

-- ---------------------------------------------------------------------
-- 3. Independent confirmation
--    A payer cannot also supply the organizer confirmation for their own
--    payment. The payer confirms payment; a different organizer confirms
--    receipt. Returned `changed` reflects only updates actually made.
--    OPEN DECISION: a single-organizer circle whose organizer pays a round
--    cannot finish that round until a second organizer exists.
-- ---------------------------------------------------------------------
create or replace function public.confirm_contribution(_contribution uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c record; uid uuid := auth.uid(); is_org boolean; changed boolean := false;
begin
  select * into c from public.contributions where id = _contribution for update;
  if c.id is null or not public.is_group_member(c.group_id, uid) then raise exception 'Not allowed'; end if;
  is_org := public.is_group_organizer(c.group_id, uid);
  if uid <> c.payer_id and not is_org then raise exception 'Only the payer or organizer can confirm'; end if;

  if uid = c.payer_id then
    if c.payer_confirmed_at is null then
      update public.contributions set payer_confirmed_at = now() where id = c.id;
      changed := true;
      perform public._log(c.group_id, 'contribution_payer_confirmed', 'contribution', c.id, '{}'::jsonb);
      perform public._notify_organizers(c.group_id, 'confirmed', public._display_name(uid) || ' confirmed a contribution', null, '/groups/' || c.group_id);
    end if;
  else
    if c.organizer_confirmed_at is null then
      update public.contributions set organizer_confirmed_at = now() where id = c.id;
      changed := true;
      perform public._log(c.group_id, 'contribution_organizer_confirmed', 'contribution', c.id, '{}'::jsonb);
      perform public._notify(c.payer_id, c.group_id, 'confirmed', 'Organizer confirmed your contribution', null, '/groups/' || c.group_id);
    end if;
  end if;
  return json_build_object('changed', changed);
end $$;

-- ---------------------------------------------------------------------
-- 4. Payout order: exactly-once validation, locked once a schedule exists
-- ---------------------------------------------------------------------
create or replace function public.set_payout_order(_group uuid, _users uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare i int; g record; n int;
begin
  select * into g from public.equb_groups where id = _group for update;
  if g.id is null or not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can set the order'; end if;
  if g.status <> 'forming' or exists (select 1 from public.equb_rounds where group_id = _group) then
    raise exception 'Payout order is locked once the schedule is generated'; end if;
  if exists (select 1 from public.contributions where group_id = _group) then
    raise exception 'Order is locked once contributions are recorded'; end if;
  n := coalesce(cardinality(_users), 0);
  if n = 0 or n <> (select count(*) from public.group_members where group_id = _group) then
    raise exception 'Order must list every member exactly once'; end if;
  if exists (select 1 from unnest(_users) u group by u having count(*) > 1) then
    raise exception 'Order must not list the same member twice'; end if;
  if exists (select 1 from unnest(_users) u where u is null or not public.is_group_member(_group, u)) then
    raise exception 'Order must list every member exactly once'; end if;
  for i in 1..n loop
    update public.group_members set payout_position = i where group_id = _group and user_id = _users[i];
  end loop;
  perform public._log(_group, 'payout_order_set', 'group', _group, jsonb_build_object('members', n));
end $$;

-- ---------------------------------------------------------------------
-- 5. Schedule generation: serialised with the group row lock
--    Serialises with set_payout_order and concurrent generate_schedule calls.
-- ---------------------------------------------------------------------
create or replace function public.generate_schedule(_group uuid)
returns int language plpgsql security definer set search_path = public as $$
declare g record; n int; m record; idx int := 0; step interval;
begin
  select * into g from public.equb_groups where id = _group for update;
  if g.id is null or not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can generate the schedule'; end if;
  if g.status = 'completed' then raise exception 'A completed circle cannot be rescheduled'; end if;
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
-- 6. Payout recording: only after every member's contribution is confirmed
--    by both payer and organizer. Payouts are still off-platform records.
--    ASSUMPTION: the recipient also contributes (matches payout_amount =
--    contribution_amount * max_members in _terms_snapshot).
-- ---------------------------------------------------------------------
create or replace function public.record_payout(_round uuid, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; members int; confirmed int;
begin
  select * into r from public.equb_rounds where id = _round for update;
  if r.id is null or not public.is_group_organizer(r.group_id, auth.uid()) then raise exception 'Only the organizer can record a payout'; end if;
  if r.payout_recorded_at is not null then return; end if; -- idempotent
  select count(*) into members from public.group_members where group_id = r.group_id;
  select count(*) into confirmed from public.contributions
    where round_id = _round and payer_confirmed_at is not null and organizer_confirmed_at is not null;
  if confirmed < members then
    raise exception 'Every contribution for this round must be confirmed by payer and organizer first (% of % confirmed)', confirmed, members;
  end if;
  update public.equb_rounds set payout_recorded_at = now(), payout_recorded_by = auth.uid(), payout_note = nullif(trim(_note), '') where id = _round;
  perform public._log(r.group_id, 'payout_recorded', 'round', _round, jsonb_build_object('round', r.round_number, 'recipient', r.recipient_id));
  perform public._notify(r.recipient_id, r.group_id, 'confirm_needed', 'Please confirm you received the round ' || r.round_number || ' payout', 'Marked as paid outside the app by the organizer.', '/groups/' || r.group_id);
end $$;

-- ---------------------------------------------------------------------
-- 7. accept_current_terms: explicit failure if the terms row is missing
-- ---------------------------------------------------------------------
create or replace function public.accept_current_terms(_group uuid, _version int) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if not public.is_group_member(_group, auth.uid()) then raise exception 'Not a member'; end if;
  select * into t from public.group_terms where group_id = _group and version = (select terms_version from public.equb_groups where id = _group);
  if t.id is null or t.version <> _version then raise exception 'Terms changed while you were reviewing. Please review the latest version.'; end if;
  insert into public.term_acceptances(group_id, terms_id, version, user_id) values (_group, t.id, t.version, auth.uid()) on conflict do nothing;
  perform public._log(_group, 'terms_accepted', 'terms', t.id, jsonb_build_object('version', t.version));
end $$;
