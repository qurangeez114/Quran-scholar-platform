-- Minimal Supabase-like environment for offline tests (not the real Supabase image).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
-- auth.uid(): reads the JWT subject the way Supabase does
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Supabase default privileges: functions created in public are executable by anon/authenticated/service_role
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
