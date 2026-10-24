-- Public source records contain no visitor queries or account information.
create table public.qh_search_vocabulary (
 term text primary key check (length(term) between 2 and 100)
);
alter table public.qh_search_vocabulary enable row level security;
create policy vocabulary_public_read on public.qh_search_vocabulary for select to anon, authenticated using (true);
grant select on public.qh_search_vocabulary to anon, authenticated;
grant all on public.qh_search_vocabulary to service_role;

insert into public.qh_search_vocabulary(term)
select distinct lower(trim(term)) from (
 select unnest(array['Quran','Qur’an','Hadith','Sunnah','Sunan','Abu Dawud','Abu Dawood','Sunan Abi Dawud','Bukhari','Sahih al-Bukhari','Muslim','Sahih Muslim','Tirmidhi','Ibn Majah','Nasai','Tabari','Ibn Kathir','Qurtubi','Jalalayn','Sadi','Zamakhshari','tafsir','jizya','apostasy','inheritance','slavery','women','children','rights','non-Muslim','Islamic','country','Christian','Christianity','Jewish','Judaism','Muhammad','Abraham','Moses','Jesus','Mary','Zaynab','Zayd','Aisha','Khaybar','Badr','Uhud','Mecca','Medina','Augustine','Chrysostom','stoning','marriage','divorce','prayer','fasting','justice','charity','education','history','Quranic','Arabic','English','translation','surah','verse','prophet','punishment','covenant','religion','freedom','protection','people','book','scholar','scholars']) as term
 union all select term from public.search_aliases
 union all select alias from public.search_aliases
 union all select regexp_split_to_table(name,'[^[:alnum:]’''-]+') from public.themes
) words where length(trim(term)) between 3 and 100
on conflict do nothing;

create table public.qh_external_sources (
 source_url text primary key check (length(source_url)<=2048 and source_url ~ '^https://(en[.]wikipedia[.]org/wiki/|doi[.]org/10[.]|sunnah[.]com/(abudawud|bukhari|muslim|tirmidhi|ibnmajah|nasai):[0-9]+[a-z]?$)'),
 title text not null check (length(title) between 1 and 500),
 excerpt text not null default '' check (length(excerpt)<=1000),
 provider text not null check (provider in ('Wikipedia','Crossref','Sunnah.com')),
 source_kind text not null check (source_kind in ('encyclopedia','scholarly_metadata','hadith_reference')),
 attribution text not null check (length(attribution)<=1000),
 rights_note text not null check (length(rights_note)<=500),
 revision_id text check (length(revision_id)<=100),
 retrieved_at timestamptz not null default now(),
 review_status text not null default 'pending' check (review_status in ('pending','reviewed','rejected'))
);
alter table public.qh_external_sources enable row level security;
create policy external_sources_public_read on public.qh_external_sources for select to anon, authenticated using (review_status <> 'rejected');
grant select on public.qh_external_sources to anon, authenticated;
grant all on public.qh_external_sources to service_role;

-- Query associations are server-only. Hashes permit reuse without retaining raw searches.
create table public.qh_external_search_cache (
 query_hash text not null check (query_hash ~ '^[a-f0-9]{64}$'),
 source_url text not null references public.qh_external_sources(source_url),
 created_at timestamptz not null default now(),
 primary key(query_hash,source_url)
);
create index qh_external_search_cache_source_idx on public.qh_external_search_cache(source_url);
alter table public.qh_external_search_cache enable row level security;
revoke all on public.qh_external_search_cache from anon,authenticated;
grant all on public.qh_external_search_cache to service_role;

-- Shared, database-backed budget limits external requests across function instances.
create table public.qh_external_search_budget (
 hour timestamptz primary key,
 requests integer not null check(requests between 1 and 120)
);
alter table public.qh_external_search_budget enable row level security;
revoke all on public.qh_external_search_budget from anon,authenticated;
grant all on public.qh_external_search_budget to service_role;
create function public.qh_take_external_search_slot() returns boolean
language sql volatile security invoker set search_path = '' as $$
 with slot as (
  insert into public.qh_external_search_budget(hour,requests) values(date_trunc('hour',now()),1)
  on conflict(hour) do update set requests=qh_external_search_budget.requests+1
    where qh_external_search_budget.requests<120
  returning 1
 ) select exists(select 1 from slot);
$$;
revoke all on function public.qh_take_external_search_slot() from public,anon,authenticated;
grant execute on function public.qh_take_external_search_slot() to service_role;
