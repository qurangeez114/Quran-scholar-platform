-- ROLLBACK for 0003 privileges only. Restores the pre-0003 EXECUTE grants.
-- Function BODIES changed by 0003 cannot be reconstructed from this file.
-- The rollback plan is: restore the pre-apply backup (see README), then run this if needed.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('grant execute on function %s to public, anon, authenticated', f.sig);
  end loop;
end $$;
