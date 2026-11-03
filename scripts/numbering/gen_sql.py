"""Generate (1) insert-only hadith_variants migration and (2) APPROVAL_REQUIRED UPDATE script from data/numbering/mapping.csv."""
import csv,collections
R=[r for r in csv.DictReader(open('data/numbering/mapping.csv')) if r['status']=='wrong_number']
dup={k for k,v in collections.Counter(r['proposed_ref'] for r in R).items() if v>1}
q=lambda s:"'"+s.replace("'","''")+"'"
def chunks(rows,fmt,n=1000):
    for i in range(0,len(rows),n): yield ',\n'.join(fmt(r) for r in rows[i:i+n])
with open('supabase/migrations/20261103130000_hadith_variants_sunnah_com_numbering.sql','w') as f:
    f.write("""-- Numbering audit: record the verified sunnah.com reference for every hadith_corpus_canonical row whose stored
-- number/URL points at a DIFFERENT hadith. INSERT-ONLY into hadith_variants; does not modify hadith_corpus_canonical.
-- Source: data/numbering/mapping.csv (full normalised Arabic match against sunnah.com book pages, crawled 2026-11-03).
-- ratio >= 0.95 and unique target -> source_checked; otherwise candidate. Idempotent (on conflict do nothing).
-- Depends on 20261103120000_hadith_comparison_engine_schema.sql. NOT APPLIED.
""")
    for body in chunks(R,lambda r:f"({r['canonical_id']},{q(r['proposed_ref'])},{q(r['proposed_url'])},{r['match_ratio']},{q('source_checked' if float(r['match_ratio'])>=0.95 and r['proposed_ref'] not in dup else 'candidate')})"):
        f.write(f"""insert into public.hadith_variants (hadith_corpus_canonical_id, edition, reference, url, match_method, match_ratio, verified_at, verification_status)
select v.id, 'sunnah.com', v.ref, v.url, 'full_text_normalised', v.ratio, case when v.st='source_checked' then timestamptz '2026-11-03 21:00:00+00' end, v.st::public.hadith_verification_status
from (values\n{body}\n) as v(id,ref,url,ratio,st)
join public.hadith_corpus c on c.id = v.id
on conflict (hadith_corpus_canonical_id, edition, reference) do nothing;\n""")
U=[r for r in R if float(r['match_ratio'])>=0.95 and r['proposed_ref'] not in dup]
with open('scripts/numbering/APPROVAL_REQUIRED_update_canonical_numbers.sql','w') as f:
    f.write(f"""-- ============================================================================================
-- !!! APPROVAL REQUIRED — DO NOT RUN WITHOUT EXPLICIT SIGN-OFF FROM THE OWNER !!!
-- Targets the BASE TABLE public.hadith_corpus (hadith_corpus_canonical is a non-updatable view over it).
-- Changes source_url ONLY. hadith_number is NOT changed here (dependent tables join on it; see the renumbering PR).
-- STATUS: equivalent change was APPLIED to production 2026-11-03 via REST PATCH with owner approval (guarded on old URL);
-- the per-row log is kept off-repo (applied_log.csv). Re-running is a no-op because of the old-URL guard.
-- It is NOT a migration and is not picked up by `supabase db push`. Nobody has run it.
-- Scope: {len(U)} rows: wrong_number, full-text ratio >= 0.95, target ref not claimed by another row.
-- Excluded: {len(R)-len(U)} lower-confidence/ambiguous rows (kept as hadith_variants candidates only).
-- Muwatta + Muslim introduction (book/number refs): only source_url changes; hadith_number kept.
-- Safety: runs in one transaction; backs up old values to hadith_numbering_backup_20261103; each UPDATE only
-- touches a row whose source_url still equals the audited stored value.
-- Rollback: update public.hadith_corpus c set source_url=b.source_url, hadith_number=b.hadith_number
--           from public.hadith_numbering_backup_20261103 b where b.id=c.id;
-- ============================================================================================
begin;
create table if not exists public.hadith_numbering_backup_20261103 as select id, hadith_number, source_url from public.hadith_corpus where false;
create temp table fix(id bigint primary key, old_url text, new_url text, new_number text) on commit drop;
""")
    for body in chunks(U,lambda r:f"({r['canonical_id']},{q(r['stored_url'])},{q(r['proposed_url'])},{'null' if ('/' in r['proposed_ref']) else q(r['proposed_ref'].split(':',1)[1])})"):
        f.write(f"insert into fix values\n{body};\n")
    f.write("""insert into public.hadith_numbering_backup_20261103 select c.id, c.hadith_number, c.source_url from public.hadith_corpus c join fix using (id);
update public.hadith_corpus c set source_url = f.new_url
from fix f where f.id = c.id and c.source_url is not distinct from f.old_url;
-- Expect UPDATE count = """+str(len(U))+""". If different, ROLLBACK and investigate.
commit;
""")
print(len(R),len(U),len(dup))
