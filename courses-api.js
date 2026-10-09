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
