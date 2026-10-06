-- Lets people sign in with the username they chose.
create table if not exists public.profiles (
  username text primary key,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to anon, authenticated with check (true);
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
