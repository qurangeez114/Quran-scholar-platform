# Hadith merge plan: `hadith_connections` → `hadith_verse_links`

**Status:** plan only. This document changes no code and no database objects.
**Every production SQL statement below, including the REVOKE step, needs explicit approval from the project owner before it is run.**

- Prepared: 2026-10-16. Repo state: `main` @ 76fb0a6 (2026-10-16 08:01 PT). PR #12 @ ae321a3 is open, not merged.
- Data counts are from the live database (public read key), 2026-10-15 ~18:40 PT.
- Database: PostgreSQL 17.6, so `security_invoker` views are supported (PG 15+).

## 1. Why
- `hadith_connections` (18,878 rows) is the legacy per-ayah hadith table. 3,278 rows are displayed; 15,600 are hidden AI rows (`hadith_grade = 'ai_synthesis'` or `is_ai_generated`).
- `hadith_verse_links` (17,870 rows) → `hadith_corpus_canonical` (84,074 rows) is the newer source.
- Coverage of displayed legacy rows (text-verified match to a corpus hadith):

| status | displayed | hidden (AI) |
|---|---|---|
| already linked at the same ayah | 744 | 1,529 |
| in corpus, no link at that ayah | 2,505 | 2,250 |
| no corpus match | 29 | 11,821 |

- If readers switched to links only today, 36 ayahs would lose all hadith (e.g. 2:9, 10:61, 26:125).
- `hadith_analysis.hadith_id`: 992 of 13,764 rows point to `hadith_connections.id`. Those ids must keep resolving.

## 2. PR #12 status
- PR #12 (open) changes the main ayah Hadith tab (`index.html` `loadHadithPanel`) to read only `hadith_verse_links` → `hadith_corpus_canonical`. On `main` the tab still reads `hadith_connections` (`index.html:6745`, `6781`).
- Its trusted-method list (`hadith-trust.js`) should move `corpus_promoted`, `web_verified` and `corpus-link` to **suggested**. In the audit, 194 of 231 displayed `corpus_promoted` rows were unrelated to their ayah.
- Do not merge PR #12 before step 4 below, or the 36 ayahs above go empty.

## 3. Inventory of readers and writers
### 3.1 Readers in this repo (`main` @ 76fb0a6)
| file:line | `select=` | notes |
|---|---|---|
| `index.html:1630` | `id` | ayah hadith marker (count) |
| `index.html:4727` | `hadith_text,collection,reference,narrator,hadith_grade,is_ai_generated` | AI study section context |
| `index.html:6745` | `hadith_text,narrator,collection,reference,hadith_grade,tradition,similarity_note,difference_note,aya_number,is_ai_generated` | Hadith tab, direct (removed by PR #12) |
| `index.html:6781` | same as 6745 | Hadith tab, surah fallback (removed by PR #12) |
| `index.html:9776` | `hadith_text,source,narrator,relevance` | **broken today** (HTTP 400: column `source` does not exist) |
| `research-classic.html:1140` | `hadith_text,source,narrator,relevance` | **broken today** (same) |
| `research-classic.html:1528` | filter on `hadith_text,narrator,collection,reference,similarity_note` | full-text search filter |
| `research-classic.html:1779` / `1786` | `id,sura_id,aya_number,hadith_text,arabic_text,narrator,collection,reference,tradition,similarity_note,hadith_grade` | research by ayah |
| `research-classic.html:1842` / `1850` | same as 1779 | research search |
| `research-classic.html:2070-2075` | uses `id` | browser bookmark/note keys `hadith-hc-<id>` (localStorage `research_bm`) |
| `study_page.html:382` | `hadith_text,collection,reference,narrator,hadith_grade` | study page |
| `theme-analysis.html:888` | `sura_id,aya_number,hadith_text,collection,narrator,hadith_grade,reference,tradition` | theme analysis |
| `netlify/functions/hadith-compare.js:51` | `hadith_text,narrator,collection,reference,hadith_grade,tradition,is_ai_generated` | AI consistency compare |
| `index-1.html:2662,2672,4580`; `quranscholars1.html:2475,2485,4109` | old page copies | retire |

Not dependent: `hadith-split-pane.js` (save/highlight/share key on text), `books.html` and `theme-reader.html` (`theme_hadith_links`, `hadith_analysis`), `campaign_hadith`, `research_items`. No Python/SQL/migration/sitemap references.

### 3.2 Database and automation (to verify in the SQL Editor; the public key cannot see these)
```sql
select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint where confrelid = 'public.hadith_connections'::regclass;
select view_schema, view_name from information_schema.view_table_usage where table_name = 'hadith_connections';
select tgname from pg_trigger where tgrelid = 'public.hadith_connections'::regclass and not tgisinternal;
select proname from pg_proc where prosrc ilike '%hadith_connections%';
select * from pg_policies where tablename = 'hadith_connections';
select grantee, privilege_type from information_schema.role_table_grants where table_name = 'hadith_connections';
select jobname, command from cron.job where command ilike '%hadith_connections%';   -- if pg_cron is installed
```
Also check Supabase Edge Functions, Database Webhooks, GitHub Actions (`.github/workflows/*`) and Netlify scheduled functions for writes to `hadith_connections`. Writers seen in the data: link methods `sura_name_extracted`, `corpus_direct_reference`, `corpus_promoted`, `corpus_direct`, `text_extracted`, `fts_auto_v1`, `web_verified`, `verse_cite_parse`, `verse_reference_extraction`, `thematic`, `tafsir_evidence_packet_4_34`. Their scripts are not in this repo.

## 4. Order of work
1. **Inventory**: finish 3.1 and 3.2, including Supabase automation. List every writer and pause it.
2. **Fix-selects PR (separate, first)**: fix `index.html:9776` and `research-classic.html:1140`, which ask for the non-existent `source` and `relevance` columns. Shipping this alone keeps old breakage separate from merge effects.
3. **Backup + tested restore**: external `pg_dump` (or a dashboard backup) of `hadith_connections` and `hadith_verse_links`, restore into a scratch project, compare row counts (§5).
4. **Merge + view** (§6, §7). *Owner approval required.*
5. **Switch readers** in 3.1 to `hadith_connections_v` (or links + corpus), then merge PR #12 with the revised trusted list.
6. **Wait period**: at least 2 weeks. Watch for 4xx errors and for writes to the old table.
7. **Revoke writes** on `hadith_connections` (§8). *Owner approval required.*

## 5. Backup and rollback
Rollback means restoring from an external backup. It does not rely on in-database copy tables.
```bash
pg_dump "$DB_URL" -Fc -t public.hadith_connections -t public.hadith_verse_links -t public.hadith_corpus_canonical -f hadith_backup_$(date +%F).dump
# tested restore into a SCRATCH project, never production:
pg_restore -d "$SCRATCH_DB_URL" --no-owner hadith_backup_YYYY-MM-DD.dump
```
```sql
-- run on both production and scratch; the counts must match
select 'hadith_connections', count(*) from hadith_connections
union all select 'hadith_verse_links', count(*) from hadith_verse_links
union all select 'hadith_corpus_canonical', count(*) from hadith_corpus_canonical;
```
Expected at the time of writing: 18,878 / 17,870 / 84,074.

## 6. Merge SQL (draft, not run; owner approval required)
```sql
begin;

-- 6.1 new columns (additive)
alter table hadith_verse_links
  add column if not exists confidence numeric,
  add column if not exists is_ai_generated boolean not null default false,
  add column if not exists similarity_note text,
  add column if not exists difference_note text,
  add column if not exists legacy_connection_id bigint,
  add column if not exists trust text not null default 'suggested'
    check (trust in ('trusted','suggested','hidden'));

-- 6.2 id map: legacy row -> corpus hadith -> link
create table if not exists hadith_connections_id_map (
  legacy_id  bigint primary key,
  corpus_id  bigint references hadith_corpus_canonical(id),
  link_id    bigint,
  match_how  text,
  status     text check (status in ('covered_same_ayah','matchable_no_link','unmatched_unique'))
);
-- load from the audit file legacy_coverage_map.csv (text-verified matches only):
-- \copy hadith_connections_id_map(legacy_id,corpus_id,match_how,status) from 'legacy_coverage_map.csv' csv header

-- 6.3 trust for existing links
update hadith_verse_links set trust = case
  when link_method in ('verse_cite_parse','pattern_sura_aya','regex:text_reference','regex_extraction_v2',
                       'explicit_citation_v1','manual','verse_reference_extraction')
    or link_method like 'tafsir_evidence_packet%' then 'trusted'
  else 'suggested' end;

-- 6.4 links for legacy rows that match a corpus hadith but have no link
insert into hadith_verse_links
  (hadith_id, sura_id, aya_number, link_method, confidence, is_ai_generated,
   similarity_note, difference_note, legacy_connection_id, source_note, trust)
select m.corpus_id, h.sura_id, h.aya_number,
       coalesce(h.link_method, 'legacy_unspecified'), h.confidence,
       coalesce(h.is_ai_generated, false) or lower(coalesce(h.hadith_grade, '')) = 'ai_synthesis',
       nullif(h.similarity_note, ''), nullif(h.difference_note, ''), h.id,
       'merged from hadith_connections',
       case when coalesce(h.is_ai_generated, false) or lower(coalesce(h.hadith_grade, '')) = 'ai_synthesis' then 'hidden'
            when h.link_method in ('verse_cite_parse','verse_reference_extraction','manual')
              or h.link_method like 'tafsir_evidence_packet%' then 'trusted'
            else 'suggested' end
from hadith_connections h
join hadith_connections_id_map m on m.legacy_id = h.id
where m.status = 'matchable_no_link'
on conflict (hadith_id, sura_id, aya_number) do nothing;

-- 6.5 rows already covered: carry notes and legacy id onto the existing link
update hadith_verse_links l set
  legacy_connection_id = coalesce(l.legacy_connection_id, h.id),
  similarity_note      = coalesce(l.similarity_note, nullif(h.similarity_note, '')),
  difference_note      = coalesce(l.difference_note, nullif(h.difference_note, ''))
from hadith_connections h
join hadith_connections_id_map m on m.legacy_id = h.id
where m.status = 'covered_same_ayah'
  and l.hadith_id = m.corpus_id and l.sura_id = h.sura_id and l.aya_number = h.aya_number;

-- 6.6 the 29 unmatched displayed rows go to a STAGING table, never the corpus
create table if not exists hadith_staging_review (
  legacy_id bigint primary key, sura_id int, aya_number int,
  hadith_text text, arabic_text text, narrator text, collection text, tradition text,
  reference text, hadith_grade text, isnad text, source_url text,
  similarity_note text, difference_note text, link_method text,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  reviewer text, reviewed_at timestamptz, created_at timestamptz not null default now()
);
insert into hadith_staging_review
  (legacy_id, sura_id, aya_number, hadith_text, arabic_text, narrator, collection, tradition,
   reference, hadith_grade, isnad, source_url, similarity_note, difference_note, link_method)
select h.id, h.sura_id, h.aya_number, h.hadith_text, h.arabic_text, h.narrator, h.collection, h.tradition,
       h.reference, h.hadith_grade, h.isnad, h.source_url, h.similarity_note, h.difference_note, h.link_method
from hadith_connections h
join hadith_connections_id_map m on m.legacy_id = h.id
where m.status = 'unmatched_unique'
  and not (coalesce(h.is_ai_generated, false) or lower(coalesce(h.hadith_grade, '')) = 'ai_synthesis')
on conflict do nothing;
-- Approved staging rows enter the corpus later, by hand, through the normal corpus process.
-- The 11,821 unmatched AI rows stay only in the archived hadith_connections table.

-- 6.7 fill link_id in the map
update hadith_connections_id_map m set link_id = l.id
from hadith_connections h, hadith_verse_links l
where h.id = m.legacy_id and l.hadith_id = m.corpus_id
  and l.sura_id = h.sura_id and l.aya_number = h.aya_number;

commit;
```

## 7. Compatibility view
The view runs with the caller's permissions (`security_invoker = true`), so RLS on the underlying tables still applies. Legacy ids are kept as `id`, so `hadith-hc-<id>` bookmarks and `hadith_analysis` references keep resolving. New links get `id = 1000000000 + link id` so they can't collide with legacy ids.
```sql
create or replace view public.hadith_connections_v
with (security_invoker = true) as
select
  coalesce(l.legacy_connection_id, 1000000000 + l.id) as id,
  l.sura_id,
  l.aya_number,
  c.text_english      as hadith_text,
  c.text_arabic       as arabic_text,
  c.narrator,
  c.collection,
  c.tradition,
  c.hadith_number     as reference,
  c.grade             as hadith_grade,
  c.isnad,
  c.source_url,
  l.similarity_note,
  l.difference_note,
  l.is_ai_generated,
  l.link_method,
  l.confidence,
  c.id                as hadith_id,
  l.trust,
  l.id                as link_id
from public.hadith_verse_links l
join public.hadith_corpus_canonical c on c.id = l.hadith_id;
```
Readers should add `trust=neq.hidden` (and `trust=eq.trusted` by default in the ayah tab).

### 7.1 Column cross-check against every reader
| column | used by (file:line) | in view |
|---|---|---|
| id | index.html:1630; research-classic.html:1779, 1842, 2070 | yes |
| sura_id | research-classic.html:1779, 1842; theme-analysis.html:888 | yes |
| aya_number | index.html:6745, 6781; research-classic.html:1779, 1842; theme-analysis.html:888 | yes |
| hadith_text | all readers | yes |
| arabic_text | research-classic.html:1779, 1842 | yes |
| narrator | index.html:4727, 6745, 6781; research-classic.html:1528, 1779, 1842; study_page.html:382; theme-analysis.html:888; hadith-compare.js:51 | yes |
| collection | index.html:4727, 6745, 6781; research-classic.html:1528, 1779, 1842; study_page.html:382; theme-analysis.html:888; hadith-compare.js:51 | yes |
| tradition | index.html:6745, 6781; research-classic.html:1779, 1842; theme-analysis.html:888; hadith-compare.js:51 | yes |
| reference | index.html:4727, 6745, 6781; research-classic.html:1528, 1779, 1842; study_page.html:382; theme-analysis.html:888; hadith-compare.js:51 | yes |
| hadith_grade | index.html:4727, 6745, 6781; research-classic.html:1779, 1842; study_page.html:382; theme-analysis.html:888; hadith-compare.js:51 | yes |
| is_ai_generated | index.html:4727, 6745, 6781; hadith-compare.js:51 | yes |
| similarity_note | index.html:6745, 6781; research-classic.html:1528, 1779, 1842 | yes |
| difference_note | index.html:6745, 6781 | yes |
| isnad, source_url, link_method, confidence, hadith_id, trust, link_id | none today (new) | yes |
| `source`, `relevance` | index.html:9776; research-classic.html:1140 | **no**: these columns never existed. Fixed in the separate fix-selects PR (step 2). |

## 8. Grants (owner approval required)
```sql
-- view: read only
revoke all on public.hadith_connections_v from anon, authenticated;
grant select on public.hadith_connections_v to anon, authenticated;

-- new support tables: no public access
revoke all on public.hadith_connections_id_map from anon, authenticated;
revoke all on public.hadith_staging_review    from anon, authenticated;

-- old table, AFTER the wait period (step 7): read only
revoke insert, update, delete, truncate on public.hadith_connections from anon, authenticated;
grant select on public.hadith_connections to anon, authenticated;
comment on table public.hadith_connections is
  'ARCHIVE: merged into hadith_verse_links; see hadith_connections_id_map and hadith_connections_v';
```
Verification:
```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_name in ('hadith_connections','hadith_connections_v','hadith_connections_id_map','hadith_staging_review')
  and grantee in ('anon','authenticated')
order by 1, 2, 3;
-- expect: SELECT only for anon/authenticated on hadith_connections_v and hadith_connections;
--         nothing on hadith_connections_id_map / hadith_staging_review.
select relname, reloptions from pg_class where relname = 'hadith_connections_v';  -- expect {security_invoker=true}
select * from pg_policies where tablename in ('hadith_connections','hadith_verse_links','hadith_corpus_canonical');
```
REST check with the anon key: `POST /rest/v1/hadith_connections_v` and `POST /rest/v1/hadith_connections` (after step 7) must fail with 401/403.

## 9. Post-merge checks
- Links added ≈ 2,505 displayed + up to 2,250 hidden (minus conflicts).
- All 36 ayahs in `ayahs_lost_if_hvl_only.json` have at least one link with `trust <> 'hidden'`.
- All 992 legacy ids in `analysis_legacy_ids.json` exist in `hadith_connections_id_map`.
- `hadith_staging_review` has 29 rows, all `pending`.

The audit files (`legacy_coverage_map.csv`, `ayahs_lost_if_hvl_only.json`, `analysis_legacy_ids.json`) were produced outside the repo. Attach them to the merge PR or regenerate them before step 4.
