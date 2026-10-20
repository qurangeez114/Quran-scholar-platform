-- Public school applications are distinct from LMS accounts or enrollments.
-- Application records contain personally provided contact information and are
-- accessible only through audited service-role actions.
create table if not exists public.qh_school_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(length(trim(full_name)) between 3 and 160),
  email text not null check(length(email) between 5 and 254),
  country text not null default '' check(length(country)<=100),
  city text not null default '' check(length(city)<=100),
  program_interest text not null check(program_interest in (
    'quranic_studies','hadith_and_history','comparative_scripture',
    'arabic_languages','independent_research','general_learning'
  )),
  learning_goal text not null check(length(trim(learning_goal)) between 20 and 3000),
  academic_background text not null default '' check(length(academic_background)<=1500),
  education_level text not null check(education_level in (
    'self_taught','secondary','college','undergraduate','graduate','other'
  )),
  preferred_language text not null check(length(trim(preferred_language)) between 2 and 80),
  attendance_mode text not null check(attendance_mode in ('self_paced','live','either')),
  privacy_consent boolean not null check(privacy_consent=true),
  status text not null default 'submitted'
    check(status in ('submitted','under_review','waitlisted','accepted','declined')),
  reviewer_note text not null default '' check(length(reviewer_note)<=2500),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists qh_school_applications_email_date
  on public.qh_school_applications (lower(email),submitted_at desc);
create index if not exists qh_school_applications_status_date
  on public.qh_school_applications(status,submitted_at desc);

create table if not exists public.qh_school_application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.qh_school_applications(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  old_status text not null,
  new_status text not null,
  review_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists qh_school_application_reviews_app
  on public.qh_school_application_reviews(application_id,created_at desc);
alter table public.qh_school_applications enable row level security;
alter table public.qh_school_application_reviews enable row level security;
revoke all on public.qh_school_applications from public,anon,authenticated;
revoke all on public.qh_school_application_reviews from public,anon,authenticated;
grant all on public.qh_school_applications,public.qh_school_application_reviews to service_role;
comment on table public.qh_school_applications is
 'Private admissions applications. A submitted or accepted application does not create an account or course enrollment.';
