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

// Bulk enroll multiple students in a course
export async function bulkEnrollStudents(courseId, studentEmails) {
  if (!studentEmails || studentEmails.length === 0) {
    throw new Error('No students provided');
  }

  const enrollmentResults = {
    successful: [],
    failed: []
  };

  for (const email of studentEmails) {
    try {
      // Find user by email
      const { data: users, error: searchError } = await supabase
        .from('qh_profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (searchError || !users) {
        enrollmentResults.failed.push({
          email,
          reason: 'User not found'
        });
        continue;
      }

      const userId = users.user_id;

      // Check if already enrolled
      const { data: existing, error: checkError } = await supabase
        .from('qh_enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        enrollmentResults.failed.push({
          email,
          reason: 'Already enrolled'
        });
        continue;
      }

      // Enroll the student
      const { data: enrollment, error: enrollError } = await supabase
        .from('qh_enrollments')
        .insert({
          course_id: courseId,
          user_id: userId,
          enrolled_at: new Date().toISOString()
        })
        .select()
        .single();

      if (enrollError) throw enrollError;

      // Send enrollment email
      try {
        const { sendEnrollmentEmail } = await import('./email-notifications.js');
        const { data: course } = await supabase
          .from('qh_courses')
          .select('title')
          .eq('id', courseId)
          .single();

        if (course) {
          await sendEnrollmentEmail(userId, email, course.title, courseId);
        }
      } catch (emailError) {
        console.error('Failed to send enrollment email:', emailError);
        // Don't fail enrollment if email fails
      }

      enrollmentResults.successful.push({
        email,
        enrollmentId: enrollment.id
      });
    } catch (error) {
      enrollmentResults.failed.push({
        email,
        reason: error.message
      });
    }
  }

  return enrollmentResults;
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

  // Send enrollment confirmation email
  try {
    const { sendEnrollmentEmail } = await import('./email-notifications.js');
    const { data: course } = await getCourseById(courseId);
    await sendEnrollmentEmail(user.id, user.email, course.title, courseId);
  } catch (err) {
    // Silently fail - email is optional
    console.error('Failed to send enrollment email:', err);
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
  const user = (await supabase.auth.getUser()).data.user;

  const { data, error } = await supabase
    .from('qh_discussion_posts')
    .select('*, qh_profiles(first_name, last_name), qh_post_likes(count)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Enrich with user's like status
  if (user && data) {
    const postIds = data.map(p => p.id);
    const { data: userLikes, error: likeError } = await supabase
      .from('qh_post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (!likeError) {
      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
      return data.map(post => ({
        ...post,
        likeCount: post.qh_post_likes?.[0]?.count || 0,
        userLiked: likedPostIds.has(post.id)
      }));
    }
  }

  return data.map(post => ({
    ...post,
    likeCount: post.qh_post_likes?.[0]?.count || 0,
    userLiked: false
  }));
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

export async function submitAssignment(assignmentId, content, fileUrl = null, fileName = null) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_assignment_submissions')
    .upsert({
      assignment_id: assignmentId,
      user_id: user.id,
      content: content,
      file_url: fileUrl,
      file_name: fileName
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Upload assignment file to Supabase Storage
export async function uploadAssignmentFile(courseId, userId, file) {
  if (!file) return null;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Create unique file path: assignments/{courseId}/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${file.name}`;
  const filePath = `assignments/${courseId}/${userId}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('assignment-submissions')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assignment-submissions')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: file.name,
      path: filePath
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file: ' + error.message);
  }
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
    const certificate = await generateCertificate(courseId);

    // Send completion email
    try {
      const { sendCompletionEmail } = await import('./email-notifications.js');
      const { data: course } = await getCourseById(courseId);
      await sendCompletionEmail(user.id, user.email, course.title, certificate.certificate_code);
    } catch (err) {
      console.error('Failed to send completion email:', err);
    }
  } else {
    // Send progress milestone email (25%, 50%, 75%)
    if ([25, 50, 75].includes(progressPct)) {
      try {
        const { sendProgressEmail } = await import('./email-notifications.js');
        const { data: course } = await getCourseById(courseId);
        await sendProgressEmail(user.id, user.email, course.title, progressPct);
      } catch (err) {
        console.error('Failed to send progress email:', err);
      }
    }
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

// Like a discussion post
export async function likeDiscussionPost(postId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('qh_post_likes')
    .insert({
      post_id: postId,
      user_id: user.id
    })
    .select()
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Unlike a discussion post
export async function unlikeDiscussionPost(postId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('qh_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);

  if (error) throw error;
  return true;
}

// Get like count for a post
export async function getPostLikeCount(postId) {
  const { data, error } = await supabase
    .from('qh_post_likes')
    .select('count', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw error;
  return data?.length || 0;
}

// Get likes for multiple posts
export async function getPostLikes(postIds) {
  if (!postIds || postIds.length === 0) return {};

  const { data, error } = await supabase
    .from('qh_post_likes')
    .select('post_id, count', { count: 'exact' })
    .in('post_id', postIds);

  if (error) throw error;

  const likeCounts = {};
  postIds.forEach(id => likeCounts[id] = 0);
  data?.forEach(item => {
    likeCounts[item.post_id] = item.count;
  });

  return likeCounts;
}

// Check if user liked a post
export async function userLikedPost(postId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return false;

  const { data, error } = await supabase
    .from('qh_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// Get likes for a post with current user's like status
export async function getPostLikesWithUserStatus(postId) {
  const user = (await supabase.auth.getUser()).data.user;

  // Get like count
  const { count, error: countError } = await supabase
    .from('qh_post_likes')
    .select('count', { count: 'exact' })
    .eq('post_id', postId);

  if (countError) throw countError;

  // Check if user liked
  let userLiked = false;
  if (user) {
    const { data: likeData } = await supabase
      .from('qh_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    userLiked = !!likeData;
  }

  return {
    likeCount: count || 0,
    userLiked
  };
}

// Generate and download certificate as PDF
export async function generateCertificatePDF(courseId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Get certificate data
  const { data: certificate, error: certError } = await supabase
    .from('qh_certificates')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  if (certError) throw certError;
  if (!certificate) throw new Error('Certificate not found');

  // Get course data
  const { data: course, error: courseError } = await supabase
    .from('qh_courses')
    .select('title, description')
    .eq('id', courseId)
    .single();

  if (courseError) throw courseError;

  // Generate SVG certificate (alternative to pdf-lib for simplicity)
  const certificateHTML = generateCertificateHTML({
    studentName: user.email.split('@')[0],
    courseName: course.title,
    completionDate: new Date(certificate.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    certificateCode: certificate.certificate_code
  });

  // Create downloadable content
  return {
    html: certificateHTML,
    fileName: `certificate-${course.title.replace(/\s+/g, '-').toLowerCase()}.html`,
    certificateCode: certificate.certificate_code,
    courseName: course.title
  };
}

function generateCertificateHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate - ${data.courseName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
    }
    .certificate {
      width: 100%;
      max-width: 900px;
      aspect-ratio: 11 / 8.5;
      background: white;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      border-radius: 15px;
      padding: 60px 80px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      print-color-adjust: exact;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%);
      border-radius: 50%;
    }
    .certificate::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -30%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(118, 75, 162, 0.05) 0%, transparent 70%);
      border-radius: 50%;
    }
    .certificate-content {
      position: relative;
      z-index: 1;
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .certificate-header {
      margin-bottom: 30px;
    }
    .certificate-logo {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .certificate-title {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
      letter-spacing: 2px;
    }
    .certificate-subtitle {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .certificate-divider {
      width: 80px;
      height: 2px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      margin: 20px auto 30px;
    }
    .certificate-body {
      margin: 20px 0;
    }
    .certificate-text {
      font-size: 16px;
      color: #555;
      margin: 10px 0;
      line-height: 1.6;
    }
    .certificate-course {
      font-size: 24px;
      font-weight: 600;
      color: #667eea;
      margin: 20px 0;
      font-style: italic;
    }
    .certificate-name {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      margin: 20px 0;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .certificate-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      position: relative;
      z-index: 1;
    }
    .certificate-code {
      text-align: left;
      font-size: 12px;
      color: #999;
    }
    .certificate-code-label {
      display: block;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 3px;
    }
    .certificate-date {
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    .certificate-signature {
      text-align: right;
      font-size: 12px;
      color: #999;
    }
    .certificate-seal {
      position: absolute;
      top: 30px;
      right: 40px;
      font-size: 60px;
      opacity: 0.1;
      z-index: 0;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .certificate {
        box-shadow: none;
        border-radius: 0;
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="certificate-seal">🎓</div>

    <div class="certificate-content">
      <div class="certificate-header">
        <div class="certificate-logo">📚</div>
        <div class="certificate-title">Certificate of Completion</div>
        <div class="certificate-subtitle">QuranHikma Learning Platform</div>
      </div>

      <div class="certificate-divider"></div>

      <div class="certificate-body">
        <div class="certificate-text">This certifies that</div>
        <div class="certificate-name">${data.studentName}</div>
        <div class="certificate-text">has successfully completed the course</div>
        <div class="certificate-course">${data.courseName}</div>
        <div class="certificate-text">and demonstrated proficiency in the course material</div>
      </div>
    </div>

    <div class="certificate-footer">
      <div class="certificate-code">
        <span class="certificate-code-label">Certificate Code</span>
        ${data.certificateCode}
      </div>
      <div class="certificate-date">
        <strong>Date Issued</strong><br>
        ${data.completionDate}
      </div>
      <div class="certificate-signature">
        <strong>QuranHikma</strong><br>
        Learning Platform
      </div>
    </div>
  </div>

  <script>
    // Auto-print functionality (can be triggered by user)
    // window.print();
  </script>
</body>
</html>`;
}
