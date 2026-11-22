-- Instructor-chosen class format and a stricter tuition currency code.
-- Additive and idempotent. Existing course-update policies already let the
-- course's instructor and the owner update these columns; no new RLS needed.

-- 1. Class format (how the course is taught). Null = not chosen yet.
alter table public.qh_courses
  add column if not exists class_format text;

alter table public.qh_courses
  drop constraint if exists qh_courses_class_format_check;
alter table public.qh_courses
  add constraint qh_courses_class_format_check check (
    class_format is null
    or class_format in ('video_text', 'video', 'text', 'live', 'audio', 'blended')
  );

comment on column public.qh_courses.class_format is
  'How the instructor teaches the course: video_text, video, text, live, audio or blended. Null when not chosen.';

-- 2. Tuition currency must be a 3-letter uppercase ISO 4217 code.
update public.qh_courses
  set tuition_currency = upper(tuition_currency)
  where tuition_currency <> upper(tuition_currency);

alter table public.qh_courses
  drop constraint if exists qh_courses_tuition_currency_check;
alter table public.qh_courses
  add constraint qh_courses_tuition_currency_check
    check (tuition_currency ~ '^[A-Z]{3}$');

notify pgrst, 'reload schema';
