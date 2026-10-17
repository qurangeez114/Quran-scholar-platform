-- Faculty public profiles / institutional-ready verified identity separation.
-- Private account email, administrative audit and verification notes are never exposed by the directory.
create table if not exists public.qh_instructor_profiles (
  user_id uuid primary key references public.qh_lms_accounts(user_id) on delete cascade,
  headline text not null default '',
  biography text not null default '',
  credentials text not null default '',
  academic_affiliation text not null default '',
  research_interests text not null default '',
  teaching_languages text not null default '',
  publications text not null default '',
  office_hours text not null default '',
  portrait_url text,
  website_url text,
  orcid_url text,
  google_scholar_url text,
  linkedin_url text,
  youtube_url text,
  facebook_url text,
  instagram_url text,
  x_url text,
  is_published boolean not null default false,
  credential_status text not null default 'unreviewed'
    check (credential_status in ('unreviewed','verified','not_verified')),
  updated_at timestamptz not null default now()
);
create table if not exists public.qh_faculty_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  instructor_id uuid not null,
  action text not null,
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);
-- Historical audit IDs are deliberately not FK-constrained to auth.users: approved account deletion must not fail.
create index if not exists qh_faculty_audit_instructor_date on public.qh_faculty_audit(instructor_id, created_at desc);
alter table public.qh_instructor_profiles enable row level security;
alter table public.qh_faculty_audit enable row level security;
revoke all on public.qh_instructor_profiles from public, anon, authenticated;
revoke all on public.qh_faculty_audit from public, anon, authenticated;
grant all on public.qh_instructor_profiles to service_role;
grant all on public.qh_faculty_audit to service_role;
grant usage, select on sequence public.qh_faculty_audit_id_seq to service_role;
-- A narrow, filtered public view is the ONLY browser-readable profile source.
-- No account email, internal credential history, or verification notes are exposed.
create or replace view public.qh_faculty_directory
with (security_barrier=true) as
select p.user_id, a.display_name, a.city, a.country,
  p.headline,p.biography,p.credentials,p.academic_affiliation,
  p.research_interests,p.teaching_languages,p.publications,p.office_hours,
  p.portrait_url,p.website_url,p.orcid_url,p.google_scholar_url,
  p.linkedin_url,p.youtube_url,p.facebook_url,p.instagram_url,p.x_url,
  p.credential_status,p.updated_at
from public.qh_instructor_profiles p
join public.qh_lms_accounts a on a.user_id=p.user_id
where p.is_published=true and a.active=true and a.role='instructor';
revoke all on public.qh_faculty_directory from public, anon, authenticated;
grant select on public.qh_faculty_directory to anon, authenticated;
comment on view public.qh_faculty_directory is 'Only explicitly published active faculty profiles; no login email or private records.';
