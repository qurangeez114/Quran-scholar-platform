-- QuranHikma: quiz integrity, public lesson counts, public ads read, certificate verification, lesson objectives.
-- NOT APPLIED. Review, then run in the Supabase SQL editor (after 20261104_academic_standards.sql).
-- Additive and idempotent. The site detects each piece and falls back to current behaviour until it is applied.

-- ---------------------------------------------------------------------------
-- 1. Per-lesson learning objectives (shown on lesson and syllabus pages)
-- ---------------------------------------------------------------------------
ALTER TABLE public.qh_lessons
  ADD COLUMN IF NOT EXISTS learning_objectives JSONB;   -- ["Identify ...", "Explain ..."]
-- Outcome-to-assessment mapping lives in qh_courses.syllabus:
--   "assessments": [{"name":"Quizzes","weight":30,"outcomes":[1,3]}]   (1-based indexes into learning_outcomes)

-- ---------------------------------------------------------------------------
-- 2. Server-side quiz grading
-- Correct answers move to a table students cannot read. qh_grade_quiz grades and records the attempt.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qh_quiz_keys (
  quiz_id        UUID NOT NULL REFERENCES public.qh_quizzes(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  correct_answer TEXT NOT NULL,          -- original wording
  variant_answer TEXT,                   -- reworded ("final check") wording, if any
  PRIMARY KEY (quiz_id, question_index)
);
ALTER TABLE public.qh_quiz_keys ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies for anon/authenticated: only SECURITY DEFINER functions and the service role read it.
REVOKE ALL ON public.qh_quiz_keys FROM anon, authenticated;

-- Backfill keys from the existing questions JSON (questions[i].correct_answer, questions[i].variant.options[answer]).
INSERT INTO public.qh_quiz_keys (quiz_id, question_index, correct_answer, variant_answer)
SELECT q.id, (e.ord - 1)::int, e.item->>'correct_answer',
       CASE WHEN jsonb_typeof(e.item->'variant'->'options') = 'array'
            THEN e.item->'variant'->'options'->>(COALESCE(NULLIF(e.item->'variant'->>'answer',''),'0'))::int END
FROM public.qh_quizzes q
CROSS JOIN LATERAL jsonb_array_elements(q.questions) WITH ORDINALITY AS e(item, ord)
WHERE e.item ? 'correct_answer'
ON CONFLICT (quiz_id, question_index) DO UPDATE
  SET correct_answer = EXCLUDED.correct_answer, variant_answer = EXCLUDED.variant_answer;

-- p_answers: JSON array of chosen option TEXT in original question order. p_stage: 'final' grades against reworded (variant) answers when present, anything else against the originals. Every call records one graded attempt.
CREATE OR REPLACE FUNCTION public.qh_grade_quiz(p_quiz_id UUID, p_answers JSONB, p_stage TEXT DEFAULT 'final')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_total INT; v_correct INT := 0; v_pass INT; v_pct INT; v_passed BOOLEAN;
  v_results JSONB := '[]'::jsonb; k RECORD; v_ans TEXT; v_ok BOOLEAN; v_key TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  -- Caller must be enrolled in the course that owns this quiz.
  IF NOT EXISTS (
    SELECT 1 FROM qh_quizzes qz JOIN qh_lessons l ON l.id = qz.lesson_id
    JOIN qh_enrollments en ON en.course_id = l.course_id AND en.user_id = v_uid
    WHERE qz.id = p_quiz_id) THEN
    RAISE EXCEPTION 'Not enrolled in this course' USING ERRCODE = '42501';
  END IF;
  SELECT COUNT(*) INTO v_total FROM qh_quiz_keys WHERE quiz_id = p_quiz_id;
  IF v_total = 0 THEN RAISE EXCEPTION 'No answer key for this quiz' USING ERRCODE = 'P0002'; END IF;
  FOR k IN SELECT * FROM qh_quiz_keys WHERE quiz_id = p_quiz_id ORDER BY question_index LOOP
    v_ans := p_answers->>k.question_index;
    v_key := CASE WHEN p_stage = 'final' AND k.variant_answer IS NOT NULL THEN k.variant_answer ELSE k.correct_answer END;
    v_ok := v_ans IS NOT NULL AND v_ans = v_key;
    IF v_ok THEN v_correct := v_correct + 1; END IF;
    v_results := v_results || jsonb_build_object('index', k.question_index, 'correct', v_ok, 'correct_answer', v_key);
  END LOOP;
  SELECT COALESCE(passing_score, 70) INTO v_pass FROM qh_quizzes WHERE id = p_quiz_id;
  v_pct := ROUND(v_correct * 100.0 / v_total);
  v_passed := v_pct >= v_pass;
  INSERT INTO qh_quiz_answers (quiz_id, user_id, answers, score, passed)
  VALUES (p_quiz_id, v_uid, p_answers, v_pct, v_passed);
  RETURN jsonb_build_object('score', v_pct, 'correct', v_correct, 'total', v_total,
                            'passing_score', v_pass, 'passed', v_passed, 'graded_by', 'server', 'results', v_results);
END $$;
REVOKE ALL ON FUNCTION public.qh_grade_quiz(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qh_grade_quiz(UUID, JSONB, TEXT) TO authenticated;

-- Follow-up (do separately, after confirming the client uses qh_grade_quiz):
--   * strip correct_answer / variant.answer from qh_quizzes.questions for student reads (e.g. a student view), and
--   * drop the direct INSERT policy on qh_quiz_answers so scores can only be written by qh_grade_quiz.
-- Doing either before the client switch would break the current quiz page.

-- ---------------------------------------------------------------------------
-- 3. Public lesson counts for published courses (no lesson content exposed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qh_public_lesson_counts(p_course_ids UUID[] DEFAULT NULL)
RETURNS TABLE (course_id UUID, lesson_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, COUNT(l.id)
  FROM qh_courses c LEFT JOIN qh_lessons l ON l.course_id = c.id
  WHERE c.is_published = TRUE AND (p_course_ids IS NULL OR c.id = ANY(p_course_ids))
  GROUP BY c.id;
$$;
GRANT EXECUTE ON FUNCTION public.qh_public_lesson_counts(UUID[]) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Public read of currently active ads (safe columns only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qh_active_ads()
RETURNS TABLE (id UUID, business_name TEXT, ad_text TEXT, link_url TEXT, image_url TEXT, starts_at DATE, ends_at DATE)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.business_name, a.ad_text, a.link_url, a.image_url, a.starts_at::date, a.ends_at::date
  FROM ads a
  WHERE a.status = 'active'
    AND (a.starts_at IS NULL OR a.starts_at::date <= CURRENT_DATE)
    AND (a.ends_at   IS NULL OR a.ends_at::date   >= CURRENT_DATE)
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.qh_active_ads() TO anon, authenticated;
-- If ads.id is not UUID in your schema, change the RETURNS TABLE id type before running.

-- ---------------------------------------------------------------------------
-- 5. Certificate verification by code (read-only; no personal data beyond what the certificate shows)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qh_verify_certificate(p_code TEXT)
RETURNS TABLE (certificate_code TEXT, course_title TEXT, completion_date DATE, issued_at TIMESTAMPTZ, score INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ce.certificate_code, co.title, ce.completion_date, ce.issued_at, ce.score
  FROM qh_certificates ce JOIN qh_courses co ON co.id = ce.course_id
  WHERE ce.certificate_code = p_code
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.qh_verify_certificate(TEXT) TO anon, authenticated;
-- Recipient name is intentionally not returned. If QuranHikma wants it shown, decide the source
-- (profile display name) and the student's consent first.
