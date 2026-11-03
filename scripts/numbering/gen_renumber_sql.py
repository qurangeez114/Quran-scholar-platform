"""Generate the coordinated renumbering migration (+ rollback) from data/numbering/mapping.csv.
Only high-confidence (ratio>=0.95, unique target) rows whose sunnah.com ref is collection:number (not book/number)."""
import csv,collections
R=[r for r in csv.DictReader(open('data/numbering/mapping.csv')) if r['status']=='wrong_number']
dup={k for k,v in collections.Counter(r['proposed_ref'] for r in R).items() if v>1}
M=[(int(r['canonical_id']),r['proposed_ref'].split(':',1)[1]) for r in R if float(r['match_ratio'])>=0.95 and r['proposed_ref'] not in dup and '/' not in r['proposed_ref']]
q=lambda s:"'"+s.replace("'","''")+"'"
DEPS=['verified_hadith_verse_links','hadith_verse_links_combined','theme_hadith_links','campaign_hadith','muhammad_hadith_links','hadiths',
      'hadith_attestation','external_narration_link','hadith_ambiguous_citations','hadith_truncated_records','hadith_verse_links_csv_import','theme_ai_synthesis']
TS='20261103'
APPLY=f"""
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
    foreach t in array deps loop
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
  execute format('create table if not exists public.%I as select h.id,h.collection,h.hadith_number from public.hadith_corpus h where false', 'hadith_renumber_bk_'||tag||'_hadith_corpus');
  execute format('insert into public.%I select h.id,h.collection,h.hadith_number from public.hadith_corpus h join rn using(id)', 'hadith_renumber_bk_'||tag||'_hadith_corpus');
  update public.hadith_corpus h set hadith_number=r.new_number from rn r where r.id=h.id and h.hadith_number=r.old_number;
  -- dependent BASE tables only (views follow automatically); joined on the old (collection, number)
  foreach t in array deps loop
    if exists (select 1 from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relname=t and c.relkind in ('r','p'))
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='collection')
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='hadith_number') then
      execute format('create table if not exists public.%I as select * from public.%I where false', 'hadith_renumber_bk_'||tag||'_'||t, t);
      execute format('insert into public.%I select d.* from public.%I d join rn r on r.collection=d.collection and r.old_number=d.hadith_number::text', 'hadith_renumber_bk_'||tag||'_'||t, t);
      execute format('update public.%I d set hadith_number=r.new_number from rn r where r.collection=d.collection and r.old_number=d.hadith_number::text', t);
      get diagnostics n = row_count; raise notice '% : % rows renumbered', t, n;
    else raise notice '% : skipped (not a base table with collection+hadith_number)', t; end if;
  end loop;
end $rn$;
"""
def engine(tag): return APPLY.replace("'hadith_renumber_bk_'||tag","'hadith_renumber_bk_"+tag+"'").replace("deps","array["+",".join(q(d) for d in DEPS)+"]").replace("foreach t in array array[","foreach t in array array[")
with open('supabase/migrations/20261103140000_hadith_renumber_sunnah_com.sql','w') as f:
    f.write(f"""-- Coordinated renumbering: hadith_corpus.hadith_number -> sunnah.com (universal) numbering, and every dependent
-- base table that refers to a hadith by (collection, hadith_number), in ONE transaction.
-- {len(M)} candidate rows (full-text ratio >= 0.95, unique target, collection:number refs; Muwatta / Muslim intro excluded).
-- Backups: public.hadith_renumber_bk_{TS}_<table> (full rows touched) + mapping public.hadith_renumber_map_{TS}.
-- Rollback: scripts/numbering/ROLLBACK_hadith_renumber_sunnah_com.sql (reverse mapping, same engine).
-- NOT APPLIED. Requires owner approval to run.
begin;
create table public.hadith_renumber_map_{TS}(id bigint primary key, collection text, old_number text, new_number text);
create temp table rn_in(id bigint primary key, new_number text) on commit drop;
""")
    for i in range(0,len(M),2000):
        f.write("insert into rn_in values\n"+",\n".join(f"({a},{q(b)})" for a,b in M[i:i+2000])+";\n")
    f.write(f"""create temp table rn on commit drop as
  select i.id, h.collection, h.hadith_number as old_number, i.new_number from rn_in i join public.hadith_corpus h using(id)
  where h.hadith_number is distinct from i.new_number;
{engine(TS)}
insert into public.hadith_renumber_map_{TS} select id,collection,old_number,new_number from rn;
commit;
""")
with open('scripts/numbering/ROLLBACK_hadith_renumber_sunnah_com.sql','w') as f:
    f.write(f"""-- ROLLBACK for 20261103140000_hadith_renumber_sunnah_com.sql: applies the stored mapping in reverse with the same engine.
begin;
create temp table rn on commit drop as select id, collection, new_number as old_number, old_number as new_number from public.hadith_renumber_map_{TS};
{engine(TS+'_rb')}
drop table public.hadith_renumber_map_{TS};
commit;
""")
print(len(M))
