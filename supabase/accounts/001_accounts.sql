-- Run on staging first. Dedicated names avoid conflicts with existing content tables.
begin;
create table public.qh_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=100),
 created_at timestamptz not null default now()
);
create table public.qh_research (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check(kind in ('note','bookmark','history','presentation')),
 title text not null default '' check(length(title)<=500),
 body text not null default '' check(length(body)<=100000),
 url text check(length(url)<=2000),
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index on public.qh_research(user_id,kind,updated_at desc);
alter table public.qh_profiles enable row level security;
alter table public.qh_research enable row level security;
revoke all on public.qh_profiles,public.qh_research from public,anon,authenticated;
grant select,insert,update,delete on public.qh_research to authenticated;
grant select,insert,update on public.qh_profiles to authenticated;
create policy profiles_own on public.qh_profiles for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy research_own on public.qh_research for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.qh_touch_research() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger qh_touch before update on public.qh_research for each row execute function public.qh_touch_research();
revoke all on function public.qh_touch_research() from public,anon,authenticated;
create function public.qh_delete_account() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 delete from auth.users where id=auth.uid();
end $$;
revoke all on function public.qh_delete_account() from public,anon,authenticated;
grant execute on function public.qh_delete_account() to authenticated;
commit;
