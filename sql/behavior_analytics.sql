-- Run once in Supabase SQL editor for project ylosytbxpzxzwfzjpaej.
-- Collects page use, time on site, and monetization signals.
-- Does not store passwords or raw IP addresses.

create table if not exists public.behavior_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  user_id uuid,
  email text,
  username text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  page_views integer not null default 0,
  country text,
  region text,
  city text,
  timezone text,
  referrer text,
  landing_path text,
  device text,
  signed_in boolean not null default false
);

create table if not exists public.behavior_events (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  user_id uuid,
  email text,
  event_type text not null,
  path text,
  label text,
  seconds_on_page integer,
  country text,
  created_at timestamptz not null default now()
);

create index if not exists behavior_events_created_idx on public.behavior_events (created_at desc);
create index if not exists behavior_events_type_idx on public.behavior_events (event_type);
create index if not exists behavior_sessions_seen_idx on public.behavior_sessions (last_seen_at desc);

alter table public.behavior_sessions enable row level security;
alter table public.behavior_events enable row level security;

drop policy if exists behavior_sessions_insert on public.behavior_sessions;
create policy behavior_sessions_insert on public.behavior_sessions
  for insert to anon, authenticated with check (true);

drop policy if exists behavior_sessions_update on public.behavior_sessions;
create policy behavior_sessions_update on public.behavior_sessions
  for update to anon, authenticated using (true) with check (true);

drop policy if exists behavior_events_insert on public.behavior_events;
create policy behavior_events_insert on public.behavior_events
  for insert to anon, authenticated with check (true);

-- Replace OWNER_EMAIL before relying on the report page with a normal login.
drop policy if exists behavior_sessions_admin_read on public.behavior_sessions;
create policy behavior_sessions_admin_read on public.behavior_sessions
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'OWNER_EMAIL');

drop policy if exists behavior_events_admin_read on public.behavior_events;
create policy behavior_events_admin_read on public.behavior_events
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'OWNER_EMAIL');
