-- Run in the Supabase SQL editor. Each signed-in user can create,
-- edit, reorder, and delete only their own pages.

create table if not exists public.user_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  slug text not null,
  body text not null default '',
  source_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.user_pages enable row level security;

drop policy if exists user_pages_select on public.user_pages;
create policy user_pages_select on public.user_pages
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_pages_insert on public.user_pages;
create policy user_pages_insert on public.user_pages
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists user_pages_update on public.user_pages;
create policy user_pages_update on public.user_pages
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_pages_delete on public.user_pages;
create policy user_pages_delete on public.user_pages
  for delete to authenticated using (auth.uid() = user_id);
