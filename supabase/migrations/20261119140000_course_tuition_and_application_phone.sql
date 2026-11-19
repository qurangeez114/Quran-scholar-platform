-- Instructor-set course tuition (Free by default, or a paid amount) and an
-- optional phone number on school applications. Additive and idempotent.
-- Existing course-update policies (lms_courses_teach, lms_courses_owner_update,
-- qh_staff_manage) already allow instructors and owners to update their
-- courses, including these new columns. No new RLS is required.
--
-- Applicants must be 18 or older; that rule is enforced in the school-apply
-- function and application form, not in this migration. Guardian columns on
-- qh_school_applications are kept for earlier rows.

alter table public.qh_courses
  add column if not exists tuition_type text not null default 'free'
    check (tuition_type in ('free', 'paid')),
  add column if not exists tuition_amount numeric(10,2)
    check (tuition_amount is null or tuition_amount >= 0),
  add column if not exists tuition_currency text not null default 'USD'
    check (tuition_currency ~ '^[A-Za-z]{3}$');

alter table public.qh_courses
  drop constraint if exists qh_courses_tuition_amount_matches_type;
alter table public.qh_courses
  add constraint qh_courses_tuition_amount_matches_type check (
    (tuition_type = 'free' and tuition_amount is null)
    or (tuition_type = 'paid' and tuition_amount is not null and tuition_amount > 0)
  );

comment on column public.qh_courses.tuition_type is
  'How this course is priced: free (default) or paid. Set by the instructor.';
comment on column public.qh_courses.tuition_amount is
  'Tuition amount when tuition_type is paid; must be null when the course is free.';
comment on column public.qh_courses.tuition_currency is
  'ISO 4217 currency code for tuition_amount. Default USD.';

-- Optional applicant phone; email remains required on the application form.
alter table public.qh_school_applications
  add column if not exists phone text not null default ''
    check (length(phone) <= 40);

comment on column public.qh_school_applications.phone is
  'Optional applicant phone number. Email remains required.';
