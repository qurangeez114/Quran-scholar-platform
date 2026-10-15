-- Apply after 001_accounts.sql. Deactivation preserves account data indefinitely
-- until an explicitly authorized recovery administrator restores or purges it.
begin;
-- Refuse to install over an unsafe private-data schema.
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public'
 and tablename in ('qh_profiles','qh_research','user_pages') and not rowsecurity) then
  raise exception 'Enable and verify ownership RLS on private account tables before installing recovery';
 end if;
end $$;
create table if not exists public.qh_account_deletions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 deleted_at timestamptz not null default clock_timestamp(),
 recover_until timestamptz not null,
 check (recover_until = deleted_at + interval '72 hours')
);
create table if not exists public.qh_account_recovery_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.qh_account_recovery_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null,
 subject_id uuid not null,
 action text not null check(action in ('deactivate','self_restore','admin_restore','permanent_delete')),
 occurred_at timestamptz not null default clock_timestamp()
);
alter table public.qh_account_deletions enable row level security;
alter table public.qh_account_recovery_admins enable row level security;
alter table public.qh_account_recovery_audit enable row level security;
revoke all on public.qh_account_deletions, public.qh_account_recovery_admins, public.qh_account_recovery_audit from public, anon, authenticated;

create or replace function public.qh_account_is_active(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
 select not exists(select 1 from public.qh_account_deletions where user_id = p_user)
$$;
create or replace function public.qh_can_manage_account_archive()
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and public.qh_account_is_active(auth.uid())
 and exists(select 1 from public.qh_account_recovery_admins where user_id = auth.uid())
$$;
create or replace function public.qh_account_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.qh_account_deletions;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into d from public.qh_account_deletions where user_id = auth.uid();
 if not found then return jsonb_build_object('state','active'); end if;
 return jsonb_build_object('state',case when clock_timestamp() < d.recover_until then 'recoverable' else 'archived' end,
 'deleted_at',d.deleted_at,'recover_until',d.recover_until);
end $$;
create or replace function public.qh_request_account_deletion()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t timestamptz := clock_timestamp();
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 -- Serialize all lifecycle operations, including retries and admin actions.
 perform 1 from auth.users where id = auth.uid() for update;
 if not found then raise exception 'Account unavailable'; end if;
 insert into public.qh_account_deletions(user_id,deleted_at,recover_until)
 values(auth.uid(),t,t + interval '72 hours') on conflict(user_id) do nothing;
 if found then
  insert into public.qh_account_recovery_audit(actor_id,subject_id,action) values(auth.uid(),auth.uid(),'deactivate');
 end if;
 return public.qh_account_status();
end $$;
-- Old clients must never retain the immediate hard-delete behavior.
create or replace function public.qh_delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin perform public.qh_request_account_deletion(); end $$;
create or replace function public.qh_restore_my_account()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare deadline timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform 1 from auth.users where id = auth.uid() for update;
 select recover_until into deadline from public.qh_account_deletions where user_id = auth.uid() for update;
 if not found then return jsonb_build_object('state','active'); end if;
 if clock_timestamp() >= deadline then raise exception 'The 72-hour recovery period has ended. Contact an administrator.' using errcode='42501'; end if;
 delete from public.qh_account_deletions where user_id = auth.uid();
 insert into public.qh_account_recovery_audit(actor_id,subject_id,action) values(auth.uid(),auth.uid(),'self_restore');
 return jsonb_build_object('state','active');
end $$;
create or replace function public.qh_search_deleted_accounts(p_query text default '', p_offset integer default 0)
returns table(user_id uuid,email text,display_name text,deleted_at timestamptz,recover_until timestamptz,state text)
language plpgsql security definer set search_path = '' as $$
begin
 if not public.qh_can_manage_account_archive() then raise exception 'Recovery administrator access required' using errcode='42501'; end if;
 if length(p_query)>320 or p_offset<0 then raise exception 'Invalid search'; end if;
 return query select u.id,u.email::text,coalesce(u.raw_user_meta_data->>'display_name',''),d.deleted_at,d.recover_until,
 case when clock_timestamp()<d.recover_until then 'recoverable' else 'archived' end
 from public.qh_account_deletions d join auth.users u on u.id=d.user_id
 where p_query='' or position(lower(p_query) in lower(coalesce(u.email,'')))>0
 or position(lower(p_query) in lower(coalesce(u.raw_user_meta_data->>'display_name','')))>0
 or u.id::text=p_query or d.deleted_at::date::text=p_query
 order by d.deleted_at desc,u.id limit 50 offset p_offset;
end $$;
create or replace function public.qh_admin_restore_account(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.qh_can_manage_account_archive() then raise exception 'Recovery administrator access required' using errcode='42501'; end if;
 perform 1 from auth.users where id=p_user for update;
 delete from public.qh_account_deletions where user_id=p_user;
 if not found then raise exception 'This account is no longer deleted. Refresh the list.'; end if;
 insert into public.qh_account_recovery_audit(actor_id,subject_id,action) values(auth.uid(),p_user,'admin_restore');
end $$;
create or replace function public.qh_admin_permanently_delete_account(p_user uuid,p_confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.qh_can_manage_account_archive() then raise exception 'Recovery administrator access required' using errcode='42501'; end if;
 if p_confirmation is distinct from 'PERMANENTLY DELETE' then raise exception 'Confirmation required'; end if;
 if p_user=auth.uid() then raise exception 'Cannot permanently delete your own account here'; end if;
 perform 1 from auth.users where id=p_user for update;
 perform 1 from public.qh_account_deletions where user_id=p_user for update;
 if not found then raise exception 'Only deleted accounts can be permanently removed'; end if;
 -- Storage files require Storage API removal before the auth user is purged.
 -- Never delete storage metadata directly, which would leave orphaned objects.
 if to_regclass('storage.objects') is not null then
  if exists(select 1 from storage.objects o where o.owner_id=p_user::text) then
   raise exception 'This account owns uploaded files. Remove its files through the Storage API before permanent deletion.';
  end if;
 end if;
 insert into public.qh_account_recovery_audit(actor_id,subject_id,action) values(auth.uid(),p_user,'permanent_delete');
 -- Existing FK cascades remove private research, pages and learning records.
 -- RESTRICT references intentionally abort the entire operation, never half-delete.
 delete from auth.users where id=p_user;
end $$;

-- Restrictive policies apply even if a permissive legacy policy grants access.
-- Old access tokens cannot bypass deactivation. Guests retain public reading.
do $$
declare t record; c record;
begin
 for t in select schemaname,tablename from pg_tables where schemaname='public' and rowsecurity
 and tablename not in ('qh_account_deletions','qh_account_recovery_admins','qh_account_recovery_audit') loop
  execute format('alter table %I.%I enable row level security',t.schemaname,t.tablename);
  execute format('drop policy if exists qh_active_session on %I.%I',t.schemaname,t.tablename);
  execute format('create policy qh_active_session on %I.%I as restrictive for all to anon, authenticated using (public.qh_account_is_active(auth.uid())) with check (public.qh_account_is_active(auth.uid()))',t.schemaname,t.tablename);
  -- Hide rows belonging to deactivated owners, including public profiles/posts.
  for c in select a.attname from pg_attribute a where a.attrelid=format('%I.%I',t.schemaname,t.tablename)::regclass
   and a.attname in ('user_id','created_by') and a.atttypid='uuid'::regtype and not a.attisdropped loop
   execute format('drop policy if exists %I on %I.%I','qh_active_owner_'||c.attname,t.schemaname,t.tablename);
   execute format('create policy %I on %I.%I as restrictive for all to anon, authenticated using (public.qh_account_is_active(%I)) with check (public.qh_account_is_active(%I))','qh_active_owner_'||c.attname,t.schemaname,t.tablename,c.attname,c.attname);
  end loop;
 end loop;
 if to_regclass('storage.objects') is not null then
  execute 'drop policy if exists qh_active_session on storage.objects';
  execute 'create policy qh_active_session on storage.objects as restrictive for all to anon, authenticated using (public.qh_account_is_active(auth.uid())) with check (public.qh_account_is_active(auth.uid()))';
 end if;
end $$;

revoke all on function public.qh_account_is_active(uuid),public.qh_can_manage_account_archive(),public.qh_account_status(),public.qh_request_account_deletion(),public.qh_delete_account(),public.qh_restore_my_account(),public.qh_search_deleted_accounts(text,integer),public.qh_admin_restore_account(uuid),public.qh_admin_permanently_delete_account(uuid,text) from public,anon,authenticated;
grant execute on function public.qh_account_is_active(uuid) to anon,authenticated;
grant execute on function public.qh_can_manage_account_archive(),public.qh_account_status(),public.qh_request_account_deletion(),public.qh_delete_account(),public.qh_restore_my_account(),public.qh_search_deleted_accounts(text,integer),public.qh_admin_restore_account(uuid),public.qh_admin_permanently_delete_account(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
