-- GLOBAL EQUB — READ-ONLY DATABASE PRE-FLIGHT (2026-11-04)
-- Run on an authorized STAGING clone to compare schema drift.
-- All statements below are SELECT only. No financial/member rows are read.
-- Do not run migrations 0003/0004 in production until reviewed.

-- 1. Inventory of public table names, RLS flags and forced RLS.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

-- 2. Public SECURITY DEFINER function entry points, full signatures,
--    roles that can execute them, and whether PUBLIC supplies inherited rights.
select p.oid::regprocedure::text as function_signature,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               where a.grantee = 0 and a.privilege_type = 'EXECUTE') as granted_to_public
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.oid::regprocedure::text;

-- 3. RLS policy inventory (policy definitions only; no rows).
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

-- 4. Public function signature preconditions for 0003 and 0004.
--    Missing signatures require reconciliation before applying migrations.
with required(signature) as (values
 ('public.create_circle(jsonb)'),
 ('public.accept_current_terms(uuid,integer)'),
 ('public.preview_invite(text)'),
 ('public.accept_invite_with_terms(text,integer)'),
 ('public.get_group_members(uuid)'),
 ('public.generate_schedule(uuid)'),
 ('public.record_contribution(uuid,uuid,numeric,text)'),
 ('public.confirm_contribution(uuid)'),
 ('public.record_payout(uuid,text)'),
 ('public.confirm_payout(uuid)'),
 ('public._terms_snapshot(uuid)')
)
select signature, (to_regprocedure(signature) is not null) as present
from required order by signature;

-- 5. Index, constraint, and trigger metadata (no member or financial records).
select conrelid::regclass::text as table_name, conname as constraint_name,
       contype as constraint_type, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by table_name, constraint_name;

select schemaname, tablename, indexname, indexdef
from pg_indexes where schemaname='public'
order by tablename, indexname;

select c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not t.tgisinternal
order by table_name, trigger_name;

-- 6. Lifecycle migration 0004 readiness by table presence.
with expected(name) as (values
 ('missed_contributions'), ('disputes'), ('dispute_events'),
 ('group_terminations'), ('termination_consents')
)
select name as lifecycle_table,
       to_regclass(format('public.%I', name)) is not null as present
from expected order by name;

-- 7. Role-specific function privilege check AFTER staging migration 0004.
--    Any true result here is a red flag for manual review.
select p.oid::regprocedure::text as function_signature
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and has_function_privilege('anon',p.oid,'EXECUTE')
order by 1;

-- Expected after 0004: no rows from check 7, provided the staging
-- installation does not intentionally expose public anonymous RPCs.
-- Always separately test authorized invite preview and authenticated flows.
