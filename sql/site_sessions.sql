-- Run once in the Supabase SQL editor.
-- Then replace OWNER_EMAIL with the account that may view the report.

create table if not exists public.site_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  user_id uuid,
  email text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  path text,
  country text,
  region text,
  city text,
  timezone text,
  user_agent text
);

alter table public.site_sessions enable row level security;

drop policy if exists site_sessions_insert on public.site_sessions;
create policy site_sessions_insert on public.site_sessions
  for insert to anon, authenticated with check (true);

drop policy if exists site_sessions_update on public.site_sessions;
create policy site_sessions_update on public.site_sessions
  for update to anon, authenticated using (true) with check (true);

drop policy if exists site_sessions_admin_read on public.site_sessions;
create policy site_sessions_admin_read on public.site_sessions
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'OWNER_EMAIL');
