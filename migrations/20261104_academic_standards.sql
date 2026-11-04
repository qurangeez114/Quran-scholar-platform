-- Academic standards fields for qh_courses (catalog, syllabus, credit).
-- NOT APPLIED. Review, then run in the Supabase SQL editor. Additive and idempotent; existing data is untouched.
-- All new columns are nullable: the site shows "To be provided by QuranHikma" until real values are entered.

ALTER TABLE public.qh_courses
  ADD COLUMN IF NOT EXISTS course_code        TEXT,          -- e.g. 'MRS 101' (institution-assigned)
  ADD COLUMN IF NOT EXISTS learning_outcomes  JSONB,         -- ["Analyze ...", "Evaluate ..."]  (measurable verbs)
  ADD COLUMN IF NOT EXISTS syllabus           JSONB,         -- see shape below
  ADD COLUMN IF NOT EXISTS credit_hours       NUMERIC(4,1) CHECK (credit_hours IS NULL OR credit_hours >= 0),
  ADD COLUMN IF NOT EXISTS prerequisites      TEXT,
  ADD COLUMN IF NOT EXISTS instructor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_name    TEXT,          -- display name; should match the published faculty profile
  ADD COLUMN IF NOT EXISTS schedule           TEXT,          -- e.g. 'Spring 2027, 10 weeks, self-paced'
  ADD COLUMN IF NOT EXISTS delivery_mode      TEXT,          -- e.g. 'Online, asynchronous'
  ADD COLUMN IF NOT EXISTS tuition            TEXT;          -- display text, e.g. 'Free' or a price; payment logic is separate

-- syllabus JSONB shape read by /syllabus.html (all keys optional):
-- {
--   "office_hours": "text",
--   "late_work_policy": "text",
--   "weekly_schedule": [{"week": 1, "topic": "text", "due": "text"}],
--   "readings": [{"author": "", "title": "", "publisher": "", "year": "", "pages": "", "required": true}],
--   "assessments": [{"name": "Quizzes", "weight": 30, "description": "text"}]
-- }

COMMENT ON COLUMN public.qh_courses.learning_outcomes IS 'JSON array of measurable learning outcome statements';
COMMENT ON COLUMN public.qh_courses.syllabus IS 'Syllabus JSON: office_hours, late_work_policy, weekly_schedule[], readings[], assessments[]';

-- Existing qh_courses RLS (public SELECT of published courses, creator-only writes) already covers these columns.
