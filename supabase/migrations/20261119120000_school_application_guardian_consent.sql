-- Age and parent/guardian consent on school applications.
-- Apply in the Supabase SQL Editor (or db push) after the earlier school-admissions migrations.
-- Existing rows keep a null date of birth; new submissions from school-apply always set it.
-- This does not set a minimum enrollment age. That value remains To be provided by QuranHikma.

alter table public.qh_school_applications
  add column if not exists date_of_birth date,
  add column if not exists age_at_submission integer
    check (age_at_submission is null or (age_at_submission >= 0 and age_at_submission <= 120)),
  add column if not exists guardian_name text not null default '' check (length(guardian_name) <= 160),
  add column if not exists guardian_email text not null default '' check (length(guardian_email) <= 254),
  add column if not exists guardian_consent boolean not null default false;

comment on column public.qh_school_applications.date_of_birth is
  'Applicant date of birth, used only to record age at submission and whether parent/guardian consent was required (under 18). No minimum enrollment age is enforced here.';
comment on column public.qh_school_applications.age_at_submission is
  'Whole years of age at the time of submission, computed from date_of_birth.';
comment on column public.qh_school_applications.guardian_name is
  'Parent or guardian full name; required when the applicant is under 18.';
comment on column public.qh_school_applications.guardian_email is
  'Parent or guardian email; required when the applicant is under 18, and must differ from the applicant email.';
comment on column public.qh_school_applications.guardian_consent is
  'True when a parent or guardian consented to the application. Required when the applicant is under 18.';

alter table public.qh_school_applications
  drop constraint if exists qh_school_applications_guardian_for_minors;
alter table public.qh_school_applications
  add constraint qh_school_applications_guardian_for_minors check (
    date_of_birth is null
    or (
      age_at_submission >= 18
      and guardian_name = ''
      and guardian_email = ''
      and guardian_consent = false
    )
    or (
      age_at_submission < 18
      and length(trim(guardian_name)) >= 3
      and guardian_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and guardian_consent = true
    )
  );
