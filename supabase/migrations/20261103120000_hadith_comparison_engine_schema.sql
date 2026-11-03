-- QuranHikma Hadith Narration Comparison Engine — schema (Phase 1 pilot)
-- NOT APPLIED. Requires owner approval. Additive only: creates new tables; never
-- alters/updates/deletes hadith_corpus*, narrative_*, isnad_*, narrators, Sources/Stories/History.
-- Aligns with existing tables via nullable foreign keys:
--   hadith_families.narrative_group_id        -> narrative_groups(id)
--   hadith_family_members.hadith_corpus_canonical_id -> hadith_corpus(id)  (hadith_corpus_canonical is a VIEW over hadith_corpus with the same ids; FKs cannot target a view)
--   hadith_family_members.narrative_version_id -> narrative_versions(id)
--   hadith_transmitters.narrator_id           -> narrators(id)
--   hadith_isnads.isnad_occurrence_id         -> isnad_occurrences(id)
-- Name note: public.hadith_propositions already exists (240 rows, per-hadith theme hierarchy),
-- so family-scoped claims live in hadith_family_propositions.

begin;

do $$ begin
  create type public.hadith_verification_status as enum ('candidate','source_checked','analysis_reviewed','disputed','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.hadith_relationship_type as enum ('identical','similar','complementary','omission','divergent',
    'apparent_contradiction','direct_contradiction','unrelated','unresolved_attribution','chronology_difference','translation_difference');
exception when duplicate_object then null; end $$;

create table if not exists public.hadith_families (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  family_type text not null check (family_type in ('event','statement','action','legal_ruling','theological_claim','teaching')),
  scope text not null,
  narrative_group_id bigint references public.narrative_groups(id) on delete set null,
  verification_status public.hadith_verification_status not null default 'candidate',
  created_by text not null,                -- analyst or model id
  method text,                             -- e.g. hce-rules-v1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hadith_family_members (
  id bigint generated always as identity primary key,
  family_id bigint not null references public.hadith_families(id) on delete cascade,
  hadith_corpus_canonical_id bigint not null references public.hadith_corpus(id) on delete restrict,
  narrative_version_id bigint references public.narrative_versions(id) on delete set null,
  branch text,                             -- e.g. Companion-level branch key
  is_abridged boolean not null default false,
  text_norm_sha256 text,                   -- detects later edits to the source row
  membership_status public.hadith_verification_status not null default 'candidate',
  membership_evidence text,
  created_at timestamptz not null default now(),
  unique (family_id, hadith_corpus_canonical_id)
);

-- Edition-specific references: stable internal id (hadith_corpus_canonical.id) ↔ each numbering scheme.
create table if not exists public.hadith_variants (
  id bigint generated always as identity primary key,
  hadith_corpus_canonical_id bigint not null references public.hadith_corpus(id) on delete restrict,
  edition text not null,                   -- 'sunnah.com', 'qh_stored_number', 'fuad_abd_al_baqi', …
  reference text not null,                 -- 'bukhari:4953', 'muslim:160a', …
  url text check (url is null or url ~ '^https://'),
  match_method text not null,              -- 'full_text_normalised'
  match_ratio numeric(5,4),
  verified_at timestamptz,
  verification_status public.hadith_verification_status not null default 'candidate',
  unique (hadith_corpus_canonical_id, edition, reference)
);

create table if not exists public.hadith_transmitters (
  id bigint generated always as identity primary key,
  key text not null unique,
  display_name text not null,
  arabic_pattern text,
  generation_role text,
  narrator_id bigint references public.narrators(id) on delete set null,
  identity_status public.hadith_verification_status not null default 'candidate',
  biography_sources jsonb not null default '[]'::jsonb,   -- [{work, volume, page, url}]
  reliability_assessments jsonb not null default '[]'::jsonb  -- [{scholar, assessment, source}] — disagreements kept side by side
);

create table if not exists public.hadith_isnads (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.hadith_family_members(id) on delete cascade,
  route_no smallint not null default 1,    -- parallel routes (taḥwīl ح) in one report
  isnad_occurrence_id bigint references public.isnad_occurrences(id) on delete set null,
  note text,
  verification_status public.hadith_verification_status not null default 'candidate',
  unique (member_id, route_no)
);
create table if not exists public.hadith_isnad_links (
  isnad_id bigint not null references public.hadith_isnads(id) on delete cascade,
  position smallint not null,              -- 1 = collector's teacher … n = Companion
  transmitter_id bigint not null references public.hadith_transmitters(id) on delete restrict,
  inherited boolean not null default false, -- "bi-hādhā al-isnād": not written out in this report
  primary key (isnad_id, position)
);

create table if not exists public.hadith_family_propositions (
  id bigint generated always as identity primary key,
  family_id bigint not null references public.hadith_families(id) on delete cascade,
  key text not null,
  label text not null,
  unique (family_id, key)
);
create table if not exists public.hadith_proposition_assertions (
  id bigint generated always as identity primary key,
  proposition_id bigint not null references public.hadith_family_propositions(id) on delete cascade,
  member_id bigint not null references public.hadith_family_members(id) on delete cascade,
  stance text not null check (stance in ('affirms','negates')),   -- silence = no row (omission)
  value text, exclusive boolean not null default false, lexical boolean not null default false,
  interpretation text,                     -- required reading for implicit claims
  evidence_arabic text not null,           -- exact normalised phrase found in the text
  verification_status public.hadith_verification_status not null default 'candidate',
  unique (proposition_id, member_id)
);

create table if not exists public.hadith_relationships (
  id bigint generated always as identity primary key,
  family_id bigint not null references public.hadith_families(id) on delete cascade,
  member_a_id bigint not null references public.hadith_family_members(id) on delete cascade,
  member_b_id bigint not null references public.hadith_family_members(id) on delete cascade,
  relationship public.hadith_relationship_type not null,
  layer text not null default 'matn' check (layer in ('matn','isnad')),
  similarity numeric(5,3),
  differences jsonb not null default '[]'::jsonb,
  explanation text,
  method text not null,                    -- rules version or model id
  verification_status public.hadith_verification_status not null default 'candidate',
  created_at timestamptz not null default now(),
  check (member_a_id <> member_b_id),
  unique (member_a_id, member_b_id, layer, method)
);

-- Review / revision trail for any analysis record. Disagreements are separate rows, never overwritten.
create table if not exists public.hadith_analysis_reviews (
  id bigint generated always as identity primary key,
  target_table text not null check (target_table in ('hadith_families','hadith_family_members','hadith_variants','hadith_transmitters',
    'hadith_isnads','hadith_proposition_assertions','hadith_relationships','hadith_quran_links','hadith_family_conclusions')),
  target_id bigint not null,
  reviewer text not null,
  from_status public.hadith_verification_status,
  to_status public.hadith_verification_status not null,
  evidence jsonb not null check (jsonb_typeof(evidence)='array' and jsonb_array_length(evidence) > 0),
  source_checked boolean not null default false,
  comment text,
  created_at timestamptz not null default now(),
  check (to_status <> 'analysis_reviewed' or source_checked)
);

create table if not exists public.hadith_family_conclusions (
  id bigint generated always as identity primary key,
  family_id bigint not null references public.hadith_families(id) on delete cascade,
  kind text not null check (kind in ('conclusion','uncertainty')),
  ordinal smallint not null,
  body text not null,
  citations text[] not null default '{}',
  authored_by text not null,
  verification_status public.hadith_verification_status not null default 'candidate',
  unique (family_id, kind, ordinal)
);

-- Optional, evidence-based Qur'an connections (separate from hadith_verse_links; no writes to that table).
create table if not exists public.hadith_quran_links (
  id bigint generated always as identity primary key,
  family_id bigint not null references public.hadith_families(id) on delete cascade,
  sura_id smallint not null check (sura_id between 1 and 114),
  aya_from smallint not null, aya_to smallint not null check (aya_to >= aya_from),
  relation text not null check (relation in ('quoted_in_text','occasion_of_revelation','explains','thematic')),
  evidence_member_id bigint references public.hadith_family_members(id) on delete set null,
  evidence_arabic text,
  verification_status public.hadith_verification_status not null default 'candidate',
  unique (family_id, sura_id, aya_from, aya_to, relation)
);
-- Compatible hook for the Sources/Stories workstream (no FK, so the two workstreams stay independent).
alter table public.hadith_families add column if not exists external_refs jsonb not null default '[]'::jsonb;  -- [{kind:'story'|'source', id}]

create index if not exists hfm_family_idx on public.hadith_family_members(family_id);
create index if not exists hfm_canon_idx on public.hadith_family_members(hadith_corpus_canonical_id);
create index if not exists hv_canon_idx on public.hadith_variants(hadith_corpus_canonical_id);
create index if not exists hr_family_idx on public.hadith_relationships(family_id);
create index if not exists hql_verse_idx on public.hadith_quran_links(sura_id, aya_from);
create index if not exists har_target_idx on public.hadith_analysis_reviews(target_table, target_id);

-- RLS: public read (labels shown in UI), writes only by service_role (no insert/update/delete policies).
do $$ declare t text; begin
  foreach t in array array['hadith_families','hadith_family_members','hadith_variants','hadith_transmitters','hadith_isnads',
    'hadith_isnad_links','hadith_family_propositions','hadith_proposition_assertions','hadith_relationships',
    'hadith_analysis_reviews','hadith_family_conclusions','hadith_quran_links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_public_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||'_public_read', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;

commit;
