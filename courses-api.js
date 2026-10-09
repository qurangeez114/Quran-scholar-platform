// Course API helpers for LMS
import { supabase } from './accounts/client.js';

export async function getCourses(published_only = true) {
  let query = supabase.from('qh_courses').select('*');

  if (published_only) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCourseById(id) {
  const { data, error } = await supabase
    .from('qh_courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCourse(title, description = '') {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_courses')
    .insert({
      title,
      description,
      created_by: user.id,
      is_published: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourse(id, updates) {
  const { data, error } = await supabase
    .from('qh_courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCourse(id) {
  const { error } = await supabase
    .from('qh_courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getLessonsByCourse(courseId) {
  const { data, error } = await supabase
    .from('qh_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('lesson_order', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createLesson(courseId, title, lesson_order = 1) {
  const { data, error } = await supabase
    .from('qh_lessons')
    .insert({
      course_id: courseId,
      title,
      lesson_order,
      lesson_type: 'text'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLesson(id, updates) {
  const { data, error } = await supabase
    .from('qh_lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson(id) {
  const { error } = await supabase
    .from('qh_lessons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function enrollInCourse(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_enrollments')
    .insert({
      course_id: courseId,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    // Already enrolled
    if (error.code === '23505') {
      return { already_enrolled: true };
    }
    throw error;
  }
  return data;
}

export async function getEnrollments(userId = null) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user && !userId) throw new Error('Not authenticated');

  const target_user = userId || user.id;

  const { data, error } = await supabase
    .from('qh_enrollments')
    .select('*, qh_courses(*)')
    .eq('user_id', target_user)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getEnrollment(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    return null; // Not enrolled
  }
  if (error) throw error;
  return data;
}

export async function getDiscussionThreads(lessonId) {
  const { data, error } = await supabase
    .from('qh_discussion_threads')
    .select('*, qh_discussion_posts(count)')
    .eq('lesson_id', lessonId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createDiscussionThread(lessonId, title) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_discussion_threads')
    .insert({
      lesson_id: lessonId,
      title,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDiscussionPosts(threadId) {
  const { data, error } = await supabase
    .from('qh_discussion_posts')
    .select('*, qh_profiles(first_name, last_name)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createDiscussionPost(threadId, content) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_discussion_posts')
    .insert({
      thread_id: threadId,
      user_id: user.id,
      content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitQuiz(quizId, answers, score) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_quiz_answers')
    .upsert({
      quiz_id: quizId,
      user_id: user.id,
      answers,
      score,
      passed: score >= 70
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitAssignment(assignmentId, content) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_assignment_submissions')
    .upsert({
      assignment_id: assignmentId,
      user_id: user.id,
      submission_content: content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEnrollmentProgress(enrollmentId, progress_pct) {
  const { data, error } = await supabase
    .from('qh_enrollments')
    .update({ progress_pct })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// PHASE 3: Advanced Features
// ============================================================================

// Certificate Generation
export async function generateCertificate(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Generate unique certificate code
  const certificateCode = `CERT-${user.id.substring(0, 8)}-${courseId.substring(0, 8)}-${Date.now()}`;

  const { data, error } = await supabase
    .from('qh_certificates')
    .insert({
      user_id: user.id,
      course_id: courseId,
      certificate_code: certificateCode,
      completion_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) {
    // Certificate already exists for this course
    if (error.code === '23505') {
      return getCertificateForCourse(courseId);
    }
    throw error;
  }
  return data;
}

export async function getCertificateForCourse(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_certificates')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    return null; // No certificate yet
  }
  if (error) throw error;
  return data;
}

export async function getCertificates() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_certificates')
    .select('*, qh_courses(title, description)')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Student Progress Tracking
export async function updateStudentProgress(courseId, lessonId, completed = false, quizScore = null, assignmentGrade = null) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const progressData = {
    user_id: user.id,
    course_id: courseId,
    lesson_id: lessonId,
    completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
    quiz_score: quizScore,
    assignment_grade: assignmentGrade,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('qh_student_progress')
    .upsert(progressData)
    .select()
    .single();

  if (error) throw error;

  // Update enrollment progress percentage
  await updateEnrollmentProgressFromLessons(courseId);

  return data;
}

export async function getStudentProgress(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_student_progress')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id);

  if (error) throw error;
  return data;
}

export async function updateEnrollmentProgressFromLessons(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Get total lessons in course
  const { data: lessons, error: lessonsError } = await supabase
    .from('qh_lessons')
    .select('id')
    .eq('course_id', courseId);

  if (lessonsError) throw lessonsError;

  if (lessons.length === 0) {
    return; // No lessons, nothing to calculate
  }

  // Get completed lessons
  const { data: progress, error: progressError } = await supabase
    .from('qh_student_progress')
    .select('lesson_id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('completed', true);

  if (progressError) throw progressError;

  const completedCount = progress.length;
  const progressPct = Math.round((completedCount / lessons.length) * 100);

  // Update enrollment
  const { error: updateError } = await supabase
    .from('qh_enrollments')
    .update({
      progress_pct: progressPct,
      completed_lessons: completedCount,
      updated_at: new Date().toISOString()
    })
    .eq('course_id', courseId)
    .eq('user_id', user.id);

  if (updateError) throw updateError;

  // Check if course is completed (100%) and generate certificate
  if (progressPct === 100) {
    await generateCertificate(courseId);
  }

  return { progressPct, completedCount, totalLessons: lessons.length };
}

// Course Analytics
export async function getCourseAnalytics(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Verify user is course creator
  const { data: course, error: courseError } = await supabase
    .from('qh_courses')
    .select('created_by')
    .eq('id', courseId)
    .single();

  if (courseError) throw courseError;
  if (course.created_by !== user.id) throw new Error('Not authorized');

  // Get enrollment statistics
  const { data: enrollments, error: enrollError } = await supabase
    .from('qh_enrollments')
    .select('id, progress_pct, completed_lessons')
    .eq('course_id', courseId);

  if (enrollError) throw enrollError;

  // Get quiz statistics
  const { data: quizzes, error: quizError } = await supabase
    .from('qh_quiz_answers')
    .select('score')
    .in('quiz_id',
      await supabase
        .from('qh_quizzes')
        .select('id')
        .in('lesson_id',
          await supabase
            .from('qh_lessons')
            .select('id')
            .eq('course_id', courseId)
        )
    );

  if (quizError && quizError.code !== 'PGRST116') throw quizError;

  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter(e => e.progress_pct === 100).length;
  const averageScore = quizzes && quizzes.length > 0
    ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length)
    : null;

  return {
    courseId,
    totalEnrollments,
    completedEnrollments,
    completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    averageScore,
    averageProgressPct: totalEnrollments > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_pct, 0) / totalEnrollments)
      : 0
  };
}

export async function getInstructorDashboard() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Get all courses created by user
  const { data: courses, error: coursesError } = await supabase
    .from('qh_courses')
    .select('id, title, is_published, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (coursesError) throw coursesError;

  // Get analytics for each course
  const analytics = await Promise.all(
    courses.map(course => getCourseAnalytics(course.id).catch(() => null))
  );

  return courses.map((course, idx) => ({
    ...course,
    analytics: analytics[idx]
  }));
}

// Student Dashboard
export async function getStudentDashboard() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data: enrollments, error } = await supabase
    .from('qh_enrollments')
    .select(`
      id,
      course_id,
      progress_pct,
      completed_lessons,
      enrolled_at,
      qh_courses(id, title, description, is_published)
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;

  // Get certificates
  const { data: certificates, error: certError } = await supabase
    .from('qh_certificates')
    .select('course_id, issued_at')
    .eq('user_id', user.id);

  if (certError) throw certError;

  const certificateCourses = new Set(certificates.map(c => c.course_id));

  return enrollments.map(enrollment => ({
    ...enrollment,
    hasCertificate: certificateCourses.has(enrollment.course_id),
    isCompleted: enrollment.progress_pct === 100
  }));
}
