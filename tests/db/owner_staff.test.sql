-- LOCAL TEST ONLY. Runs after 001 and 004. Any FAILED line aborts the run (ON_ERROR_STOP).
\set owner '00000000-0000-4000-8000-00000000000a'
\set student '00000000-0000-4000-8000-00000000000b'

-- Runs q and fails the test if q succeeds.
create function pg_temp.expect_fail(q text) returns void language plpgsql as $$
declare denied boolean := false;
begin
  begin
    execute q;
  exception when others then
    denied := true;
  end;
  if not denied then raise exception 'FAILED: statement should have been denied: %', q; end if;
  raise notice 'ok: denied: %', left(q, 90);
end $$;

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- 1. Installed state (as the database owner).
select pg_temp.assert_true(to_regprocedure('public.qh_is_staff()') is not null, 'qh_is_staff exists');
select pg_temp.assert_true((select count(*) = 1 from public.qh_staff_members), 'exactly one staff row');
select pg_temp.assert_true(exists(select 1 from public.qh_staff_members where user_id = :'owner'::uuid), 'staff row is the owner');
select pg_temp.assert_true(to_regclass('public.qh_account_deletions') is null, 'recovery tables not installed');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.qh_delete_account()', 'execute')
  and not has_function_privilege('anon', 'public.qh_delete_account()', 'execute'), 'legacy hard-delete RPC not executable by clients');

-- 2. Owner access.
select set_config('request.jwt.claim.sub', :'owner', false);
set role authenticated;
select pg_temp.assert_true(public.qh_is_staff() = true, 'owner: qh_is_staff() true');
select pg_temp.assert_true(public.qh_account_status()->>'state' = 'active', 'owner: qh_account_status() active');
select pg_temp.assert_true(public.qh_can_manage_account_archive() = false, 'owner: archive admin false while recovery is disabled');
insert into public.qh_courses(title, published) values ('Owner draft', false), ('Owner published', true);
select pg_temp.assert_true((select count(*) = 2 from public.qh_courses), 'owner: sees all courses, published or not');
reset role;

-- 3. Ordinary signed-in user: no staff rights, no course rows, no way to add staff.
select set_config('request.jwt.claim.sub', :'student', false);
set role authenticated;
select pg_temp.assert_true(public.qh_is_staff() = false, 'student: qh_is_staff() false');
select pg_temp.assert_true(public.qh_can_manage_account_archive() = false, 'student: archive admin false');
select pg_temp.assert_true((select count(*) = 0 from public.qh_courses), 'student: sees no courses (no student read policy yet)');
select pg_temp.expect_fail($q$insert into public.qh_courses(title) values ('student attempt')$q$);
-- UPDATE/DELETE on rows the user cannot see succeed with zero rows affected; verify nothing changed below.
update public.qh_courses set title = 'hijacked';
delete from public.qh_courses;
select pg_temp.expect_fail($q$insert into public.qh_staff_members(user_id) values ('00000000-0000-4000-8000-00000000000b')$q$);
select pg_temp.expect_fail($q$select count(*) from public.qh_staff_members$q$);
select pg_temp.expect_fail($q$select public.qh_delete_account()$q$);
reset role;

-- Confirm the student's attempts changed nothing.
select pg_temp.assert_true((select count(*) = 2 and bool_and(title in ('Owner draft','Owner published')) from public.qh_courses), 'student update/delete changed no courses');
select pg_temp.assert_true((select count(*) = 1 from public.qh_staff_members), 'still exactly one staff row after student attempts');
select pg_temp.assert_true(exists(select 1 from public.qh_staff_members where user_id = :'student'::uuid) = false, 'student is not staff');

-- 4. Anonymous visitor.
set role anon;
select pg_temp.expect_fail($q$select public.qh_is_staff()$q$);
select pg_temp.expect_fail($q$select public.qh_account_status()$q$);
select pg_temp.expect_fail($q$select count(*) from public.qh_courses$q$);
reset role;

-- 5. Owner RPC behavior without a session returns an error, not a grant.
select set_config('request.jwt.claim.sub', '', false);
set role authenticated;
select pg_temp.expect_fail($q$select public.qh_account_status()$q$);
reset role;

do $$ begin raise notice 'ALL CHECKS PASSED'; end $$;
