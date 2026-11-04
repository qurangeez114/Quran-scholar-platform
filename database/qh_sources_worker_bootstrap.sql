-- QuranHikma Sources persistent screening queue (private unpublished AI drafts).
-- Roll out after review. Does NOT touch public ancient_sources / Stories.
begin;

create table if not exists public.qh_source_work_queue (
  sura integer not null check (sura between 1 and 114),
  aya integer not null check (aya > 0),
  state text not null default 'pending' check (state in ('pending','leased','needs_review','externally_screened','retry','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  eligible_at timestamptz not null default now(),
  leased_until timestamptz,
  lease_token uuid,
  updated_at timestamptz not null default now(),
  last_error text,
  primary key (sura, aya),
  constraint qh_source_lease_consistency check (state <> 'leased' or (leased_until is not null and lease_token is not null))
);
create index if not exists qh_source_work_queue_scan
  on public.qh_source_work_queue(state, eligible_at, sura, aya);
alter table public.qh_source_work_queue enable row level security;
revoke all on table public.qh_source_work_queue from PUBLIC, anon, authenticated;
grant select, insert, update on table public.qh_source_work_queue to service_role;

create table if not exists public.qh_source_screening_drafts (
  sura integer not null,
  aya integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider_model text not null,
  research_payload jsonb not null,
  verification_status text not null default 'unverified'
    check (verification_status = 'unverified'),
  primary key (sura, aya),
  foreign key (sura, aya) references public.qh_source_work_queue(sura, aya) on delete restrict
);
alter table public.qh_source_screening_drafts enable row level security;
revoke all on table public.qh_source_screening_drafts from PUBLIC, anon, authenticated;
grant select, insert, update on table public.qh_source_screening_drafts to service_role;

-- Exactly one queue row per real verse. An inserted row is NOT a reviewed verse.
insert into public.qh_source_work_queue(sura, aya)
select a.sura_id, a.aya_number
from public.ayas a
where a.sura_id between 1 and 114 and a.aya_number > 0
on conflict (sura, aya) do nothing;

-- Earlier checked-in batches (PR #105, #111, #112, #114) are only
-- preliminary screenings, not fully verified scholarly coverage.
update public.qh_source_work_queue set state='externally_screened',
  updated_at=now()
where state='pending' and ((sura=1 and aya between 1 and 7)
   or (sura=2 and aya between 1 and 30));

-- No SECURITY DEFINER: service_role is the only granted caller; RLS is enabled.
create or replace function public.qh_source_claim(p_max integer default 1)
returns table(sura integer, aya integer, lease_token uuid, arabic text, english text, attempts integer)
language sql volatile security invoker set search_path = ''
as $$
  with exhausted as (
    update public.qh_source_work_queue q
       set state='failed', lease_token=null, leased_until=null,
           last_error='expired after maximum attempts', updated_at=now()
     where state='leased' and leased_until < now() and attempts >= 5
     returning q.sura
  ), pick as (
    select q.sura, q.aya
    from public.qh_source_work_queue q
    where (
      (q.state in ('pending','retry') and q.eligible_at <= now())
      or (q.state = 'leased' and q.leased_until < now())
    ) and q.attempts < 5
    order by q.sura, q.aya
    for update skip locked
    limit least(greatest(p_max, 1), 3)
  ), claimed as (
    update public.qh_source_work_queue q
      set state = 'leased',
          attempts = q.attempts + 1,
          lease_token = gen_random_uuid(),
          leased_until = now() + interval '4 minutes',
          last_error = null,
          updated_at = now()
    from pick
    where (q.sura, q.aya) = (pick.sura, pick.aya)
    returning q.sura, q.aya, q.lease_token, q.attempts
  )
  select c.sura,c.aya,c.lease_token,a.arabic,a.english,c.attempts
  from claimed c
  join public.ayas a on a.sura_id=c.sura and a.aya_number=c.aya
  order by c.sura,c.aya;
$$;

create or replace function public.qh_source_finish(
  p_sura integer,
  p_aya integer,
  p_lease_token uuid,
  p_model text,
  p_result jsonb
)
returns boolean
language plpgsql volatile security invoker set search_path = ''
as $$
begin
  if p_result is null or jsonb_typeof(p_result) <> 'object' or
     length(coalesce(p_model,'')) > 100 then
     raise exception 'Invalid unpublished research payload';
  end if;
  perform 1 from public.qh_source_work_queue
  where sura=p_sura and aya=p_aya and lease_token=p_lease_token
    and state='leased' and leased_until > now()
  for update;
  if not found then return false; end if;

  insert into public.qh_source_screening_drafts
    (sura,aya,provider_model,research_payload,verification_status)
  values(p_sura,p_aya,p_model,p_result,'unverified')
  on conflict(sura,aya) do update
    set provider_model=excluded.provider_model,
        research_payload=excluded.research_payload,
        verification_status='unverified',
        updated_at=now();

  update public.qh_source_work_queue
    set state='needs_review', leased_until=null, lease_token=null, updated_at=now()
  where sura=p_sura and aya=p_aya;
  return true;
end;
$$;

create or replace function public.qh_source_fail(
  p_sura integer, p_aya integer, p_lease_token uuid, p_reason text
)
returns boolean
language plpgsql volatile security invoker set search_path = ''
as $$
declare n integer;
begin
  select attempts into n from public.qh_source_work_queue
    where sura=p_sura and aya=p_aya and state='leased' and
          lease_token=p_lease_token for update;
  if not found then return false; end if;
  update public.qh_source_work_queue set
    state=case when n >= 5 then 'failed' else 'retry' end,
    eligible_at=now() + make_interval(mins => least(60, power(2,n)::integer)),
    lease_token=null, leased_until=null, updated_at=now(),
    last_error=left(coalesce(p_reason,'unknown'),250)
  where sura=p_sura and aya=p_aya;
  return true;
end;
$$;
revoke all on function public.qh_source_claim(integer) from PUBLIC, anon, authenticated;
revoke all on function public.qh_source_finish(integer,integer,uuid,text,jsonb) from PUBLIC, anon, authenticated;
revoke all on function public.qh_source_fail(integer,integer,uuid,text) from PUBLIC, anon, authenticated;
grant execute on function public.qh_source_claim(integer) to service_role;
grant execute on function public.qh_source_finish(integer,integer,uuid,text,jsonb) to service_role;
grant execute on function public.qh_source_fail(integer,integer,uuid,text) to service_role;

commit;
