-- ROLLBACK for 20261103140000_hadith_renumber_sunnah_com.sql: applies the stored mapping in reverse with the same engine.
begin;
create temp table rn on commit drop as select id, collection, new_number as old_number, old_number as new_number from public.hadith_renumber_map_20261103;

-- ---- Coordinated renumbering engine (shared by forward + rollback) ----
-- rn(collection, old_number, new_number, id): computed against LIVE hadith_corpus at run time.
-- Safety filters (fixpoint): (1) the old (collection,number) must identify exactly one hadith_corpus row, so every dependent
-- row keyed on it unambiguously means that hadith; (2) after renumbering, the new (collection,number) must be unique in
-- hadith_corpus; (3) no non-moving dependent row may already use the new key. Rows failing any are dropped from this run and keep their current number (logged in the map table).
do $rn$
declare t text; n bigint; removed bigint;
begin
  delete from rn r where (select count(*) from public.hadith_corpus h where h.collection=r.collection and h.hadith_number=r.old_number)<>1;
  loop
    with fin as (select h.collection, coalesce(r.new_number,h.hadith_number) num from public.hadith_corpus h left join rn r on r.id=h.id),
         bad as (select collection,num from fin group by 1,2 having count(*)>1)
    delete from rn r using bad b where b.collection=r.collection and b.num=r.new_number;
    get diagnostics removed = row_count;
    -- (3) a new key must not already be used by a dependent row that is NOT moving away (would silently capture orphans)
    foreach t in array array['verified_hadith_verse_links','hadith_verse_links_combined','theme_hadith_links','campaign_hadith','muhammad_hadith_links','hadiths','hadith_attestation','external_narration_link','hadith_ambiguous_citations','hadith_truncated_records','hadith_verse_links_csv_import','theme_ai_synthesis'] loop
      if exists (select 1 from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relname=t and c.relkind in ('r','p'))
         and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='collection')
         and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='hadith_number') then
        execute format('delete from rn r where exists (select 1 from public.%I d where d.collection=r.collection and d.hadith_number::text=r.new_number) and not exists (select 1 from rn r2 where r2.collection=r.collection and r2.old_number=r.new_number)', t);
        get diagnostics n = row_count; removed := removed + n;
      end if;
    end loop;
    exit when removed=0;
  end loop;
  select count(*) into n from rn; raise notice 'renumbering % hadith_corpus rows', n;
  -- base table
  execute format('create table if not exists public.%I as select h.id,h.collection,h.hadith_number from public.hadith_corpus h where false', 'hadith_renumber_bk_20261103_rb'||'_hadith_corpus');
  execute format('insert into public.%I select h.id,h.collection,h.hadith_number from public.hadith_corpus h join rn using(id)', 'hadith_renumber_bk_20261103_rb'||'_hadith_corpus');
  update public.hadith_corpus h set hadith_number=r.new_number from rn r where r.id=h.id and h.hadith_number=r.old_number;
  -- dependent BASE tables only (views follow automatically); joined on the old (collection, number)
  foreach t in array array['verified_hadith_verse_links','hadith_verse_links_combined','theme_hadith_links','campaign_hadith','muhammad_hadith_links','hadiths','hadith_attestation','external_narration_link','hadith_ambiguous_citations','hadith_truncated_records','hadith_verse_links_csv_import','theme_ai_synthesis'] loop
    if exists (select 1 from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relname=t and c.relkind in ('r','p'))
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='collection')
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='hadith_number') then
      execute format('create table if not exists public.%I as select * from public.%I where false', 'hadith_renumber_bk_20261103_rb'||'_'||t, t);
      execute format('insert into public.%I select d.* from public.%I d join rn r on r.collection=d.collection and r.old_number=d.hadith_number::text', 'hadith_renumber_bk_20261103_rb'||'_'||t, t);
      execute format('update public.%I d set hadith_number=r.new_number from rn r where r.collection=d.collection and r.old_number=d.hadith_number::text', t);
      get diagnostics n = row_count; raise notice '% : % rows renumbered', t, n;
    else raise notice '% : skipped (not a base table with collection+hadith_number)', t; end if;
  end loop;
end $rn$;

drop table public.hadith_renumber_map_20261103;
commit;
