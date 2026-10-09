-- QuranHikma Learning Management System (LMS) Schema
-- Phase 1 + Phase 3 (Certificates, Progress Tracking, Analytics)
-- Created: 2026-10-09

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PHASE 1: Foundation Tables
-- ============================================================================

-- Courses table - course information and metadata
CREATE TABLE IF NOT EXISTS qh_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table - individual lesson content
CREATE TABLE IF NOT EXISTS qh_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('text', 'video', 'quiz', 'assignment')),
  content TEXT, -- for text lessons
  video_url TEXT, -- for video lessons
  lesson_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table - quiz definitions and metadata
CREATE TABLE IF NOT EXISTS qh_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES qh_lessons(id) ON DELETE CASCADE,
  passing_score INTEGER DEFAULT 70,
  questions JSONB NOT NULL, -- array of {id, question, options, correct_answer}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz answers table - student quiz submissions and scores
CREATE TABLE IF NOT EXISTS qh_quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES qh_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- {questionId: answer, ...}
  score INTEGER NOT NULL, -- 0-100 percentage
  passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignments table - assignment definitions
CREATE TABLE IF NOT EXISTS qh_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES qh_lessons(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions table - student work submissions and grades
CREATE TABLE IF NOT EXISTS qh_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES qh_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  grade INTEGER, -- 0-100
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table - course enrollment and progress tracking
CREATE TABLE IF NOT EXISTS qh_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  progress_pct INTEGER DEFAULT 0,
  completed_lessons INTEGER DEFAULT 0,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
);

-- Discussion threads table - discussion topics per lesson
CREATE TABLE IF NOT EXISTS qh_discussion_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES qh_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discussion posts table - discussion replies
CREATE TABLE IF NOT EXISTS qh_discussion_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES qh_discussion_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course materials table - downloadable files
CREATE TABLE IF NOT EXISTS qh_course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHASE 3: Advanced Features
-- ============================================================================

-- Certificates table - certificate generation and tracking
CREATE TABLE IF NOT EXISTS qh_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  certificate_code TEXT UNIQUE NOT NULL, -- unique identifier for verification
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completion_date DATE NOT NULL,
  score INTEGER, -- final course score if applicable
  UNIQUE(user_id, course_id)
);

-- Student progress table - detailed progress tracking per lesson
CREATE TABLE IF NOT EXISTS qh_student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES qh_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score INTEGER,
  assignment_grade INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- Course analytics table - instructor analytics
CREATE TABLE IF NOT EXISTS qh_course_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES qh_courses(id) ON DELETE CASCADE,
  total_enrollments INTEGER DEFAULT 0,
  completed_enrollments INTEGER DEFAULT 0,
  average_score DECIMAL(5, 2),
  average_completion_time_days INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE qh_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE qh_course_analytics ENABLE ROW LEVEL SECURITY;

-- qh_courses RLS: Only creators can modify, anyone can view published
CREATE POLICY qh_courses_select ON qh_courses
  FOR SELECT USING (
    is_published = TRUE OR
    auth.uid() = created_by
  );

CREATE POLICY qh_courses_insert ON qh_courses
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY qh_courses_update ON qh_courses
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY qh_courses_delete ON qh_courses
  FOR DELETE USING (auth.uid() = created_by);

-- qh_lessons RLS: Only creators and enrolled users can view
CREATE POLICY qh_lessons_select ON qh_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_lessons.course_id
      AND (qh_courses.created_by = auth.uid() OR qh_courses.is_published = TRUE)
    )
    AND (
      qh_courses.is_published = TRUE OR
      EXISTS (
        SELECT 1 FROM qh_enrollments
        WHERE qh_enrollments.course_id = qh_lessons.course_id
        AND qh_enrollments.user_id = auth.uid()
      )
    )
  );

CREATE POLICY qh_lessons_insert ON qh_lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_lessons.course_id
      AND qh_courses.created_by = auth.uid()
    )
  );

CREATE POLICY qh_lessons_update ON qh_lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_lessons.course_id
      AND qh_courses.created_by = auth.uid()
    )
  );

CREATE POLICY qh_lessons_delete ON qh_lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_lessons.course_id
      AND qh_courses.created_by = auth.uid()
    )
  );

-- qh_enrollments RLS: Users can only see their own
CREATE POLICY qh_enrollments_select ON qh_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY qh_enrollments_insert ON qh_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY qh_enrollments_update ON qh_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

-- qh_quiz_answers RLS: Users see their own, instructors see all
CREATE POLICY qh_quiz_answers_select ON qh_quiz_answers
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM qh_quizzes
      JOIN qh_lessons ON qh_lessons.id = qh_quizzes.lesson_id
      JOIN qh_courses ON qh_courses.id = qh_lessons.course_id
      WHERE qh_quizzes.id = qh_quiz_answers.quiz_id
      AND qh_courses.created_by = auth.uid()
    )
  );

CREATE POLICY qh_quiz_answers_insert ON qh_quiz_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- qh_assignment_submissions RLS: Users see their own, instructors see all
CREATE POLICY qh_assignment_submissions_select ON qh_assignment_submissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM qh_assignments
      JOIN qh_lessons ON qh_lessons.id = qh_assignments.lesson_id
      JOIN qh_courses ON qh_courses.id = qh_lessons.course_id
      WHERE qh_assignments.id = qh_assignment_submissions.assignment_id
      AND qh_courses.created_by = auth.uid()
    )
  );

CREATE POLICY qh_assignment_submissions_insert ON qh_assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY qh_assignment_submissions_update ON qh_assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM qh_assignments
      JOIN qh_lessons ON qh_lessons.id = qh_assignments.lesson_id
      JOIN qh_courses ON qh_courses.id = qh_lessons.course_id
      WHERE qh_assignments.id = qh_assignment_submissions.assignment_id
      AND qh_courses.created_by = auth.uid()
    )
  );

-- qh_certificates RLS: Users see their own, instructors see theirs
CREATE POLICY qh_certificates_select ON qh_certificates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_certificates.course_id
      AND qh_courses.created_by = auth.uid()
    )
  );

-- qh_student_progress RLS: Users see their own, instructors see theirs
CREATE POLICY qh_student_progress_select ON qh_student_progress
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_student_progress.course_id
      AND qh_courses.created_by = auth.uid()
    )
  );

CREATE POLICY qh_student_progress_insert ON qh_student_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY qh_student_progress_update ON qh_student_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- qh_course_analytics RLS: Only instructors see their course analytics
CREATE POLICY qh_course_analytics_select ON qh_course_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qh_courses
      WHERE qh_courses.id = qh_course_analytics.course_id
      AND qh_courses.created_by = auth.uid()
    )
  );

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS qh_courses_published_idx ON qh_courses(is_published);
CREATE INDEX IF NOT EXISTS qh_courses_created_by_idx ON qh_courses(created_by);
CREATE INDEX IF NOT EXISTS qh_lessons_course_id_idx ON qh_lessons(course_id);
CREATE INDEX IF NOT EXISTS qh_enrollments_user_idx ON qh_enrollments(user_id);
CREATE INDEX IF NOT EXISTS qh_enrollments_course_idx ON qh_enrollments(course_id);
CREATE INDEX IF NOT EXISTS qh_quiz_answers_user_idx ON qh_quiz_answers(user_id);
CREATE INDEX IF NOT EXISTS qh_quiz_answers_quiz_idx ON qh_quiz_answers(quiz_id);
CREATE INDEX IF NOT EXISTS qh_assignment_submissions_user_idx ON qh_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS qh_assignment_submissions_assignment_idx ON qh_assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS qh_certificates_user_idx ON qh_certificates(user_id);
CREATE INDEX IF NOT EXISTS qh_certificates_course_idx ON qh_certificates(course_id);
CREATE INDEX IF NOT EXISTS qh_student_progress_user_idx ON qh_student_progress(user_id);
CREATE INDEX IF NOT EXISTS qh_student_progress_course_idx ON qh_student_progress(course_id);
