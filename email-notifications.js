// Email Notifications for LMS Events
// Uses Supabase Edge Functions or API to send emails

import { supabase } from './accounts/client.js';

// Email templates
const emailTemplates = {
  enrollmentConfirmation: (userName, courseName) => ({
    subject: `Welcome to ${courseName}!`,
    html: `
      <h2>Welcome to ${courseName}!</h2>
      <p>Hi ${userName},</p>
      <p>You have successfully enrolled in <strong>${courseName}</strong>.</p>
      <p>Start learning now and track your progress. Good luck!</p>
      <a href="${window.location.origin}/course.html?course={courseId}" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;">
        Go to Course
      </a>
      <p style="margin-top: 2rem; font-size: 0.9rem; color: #999;">
        © QuranHikma Learning Platform
      </p>
    `
  }),

  lessonCompletion: (userName, courseName, completionPct) => ({
    subject: `Progress Update: ${courseName} - ${completionPct}% Complete`,
    html: `
      <h2>Great Progress!</h2>
      <p>Hi ${userName},</p>
      <p>You are now <strong>${completionPct}%</strong> complete with <strong>${courseName}</strong>.</p>
      <p>Keep up the great work!</p>
      <a href="${window.location.origin}/student-dashboard.html" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;">
        View Dashboard
      </a>
      <p style="margin-top: 2rem; font-size: 0.9rem; color: #999;">
        © QuranHikma Learning Platform
      </p>
    `
  }),

  courseCompletion: (userName, courseName, certificateCode) => ({
    subject: `🎓 Congratulations! You Completed ${courseName}`,
    html: `
      <h2>🎓 Course Completed!</h2>
      <p>Congratulations ${userName}!</p>
      <p>You have successfully completed <strong>${courseName}</strong>.</p>
      <p>Your certificate has been generated with code: <strong>${certificateCode}</strong></p>
      <a href="${window.location.origin}/student-dashboard.html" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;">
        Download Certificate
      </a>
      <p style="margin-top: 2rem; font-size: 0.9rem; color: #999;">
        © QuranHikma Learning Platform
      </p>
    `
  }),

  assignmentGraded: (userName, assignmentTitle, grade, feedback) => ({
    subject: `Your Assignment Has Been Graded: ${assignmentTitle}`,
    html: `
      <h2>Assignment Graded</h2>
      <p>Hi ${userName},</p>
      <p>Your assignment <strong>${assignmentTitle}</strong> has been graded.</p>
      <p><strong>Grade:</strong> ${grade}/100</p>
      ${feedback ? `<p><strong>Feedback:</strong></p><p>${feedback}</p>` : ''}
      <a href="${window.location.origin}/student-dashboard.html" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;">
        View Assignment
      </a>
      <p style="margin-top: 2rem; font-size: 0.9rem; color: #999;">
        © QuranHikma Learning Platform
      </p>
    `
  }),

  quizResult: (userName, quizTitle, score, passed) => ({
    subject: `Quiz Result: ${quizTitle} - ${score}%`,
    html: `
      <h2>Quiz Result</h2>
      <p>Hi ${userName},</p>
      <p>You completed the quiz <strong>${quizTitle}</strong>.</p>
      <p><strong>Score:</strong> ${score}%</p>
      <p><strong>Status:</strong> ${passed ? '✓ Passed' : '✗ Did Not Pass'}</p>
      ${!passed ? '<p>Review the course material and try again.</p>' : ''}
      <a href="${window.location.origin}/student-dashboard.html" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;">
        View Results
      </a>
      <p style="margin-top: 2rem; font-size: 0.9rem; color: #999;">
        © QuranHikma Learning Platform
      </p>
    `
  })
};

// Send enrollment confirmation email
export async function sendEnrollmentEmail(userId, userEmail, courseName, courseId) {
  try {
    const template = emailTemplates.enrollmentConfirmation(
      userEmail.split('@')[0],
      courseName
    );

    await sendEmail(userEmail, template.subject, template.html);
    console.log('Enrollment email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending enrollment email:', error);
    // Don't throw - email is nice to have but not critical
  }
}

// Send lesson completion progress email
export async function sendProgressEmail(userId, userEmail, courseName, progressPct) {
  try {
    // Only send milestone emails at 25%, 50%, 75%, 100%
    if (![25, 50, 75, 100].includes(progressPct)) return;

    const template = emailTemplates.lessonCompletion(
      userEmail.split('@')[0],
      courseName,
      progressPct
    );

    await sendEmail(userEmail, template.subject, template.html);
    console.log('Progress email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending progress email:', error);
  }
}

// Send course completion email with certificate
export async function sendCompletionEmail(userId, userEmail, courseName, certificateCode) {
  try {
    const template = emailTemplates.courseCompletion(
      userEmail.split('@')[0],
      courseName,
      certificateCode
    );

    await sendEmail(userEmail, template.subject, template.html);
    console.log('Completion email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending completion email:', error);
  }
}

// Send assignment graded email
export async function sendAssignmentGradedEmail(userEmail, assignmentTitle, grade, feedback) {
  try {
    const template = emailTemplates.assignmentGraded(
      userEmail.split('@')[0],
      assignmentTitle,
      grade,
      feedback || 'No feedback provided'
    );

    await sendEmail(userEmail, template.subject, template.html);
    console.log('Assignment graded email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending assignment graded email:', error);
  }
}

// Send quiz result email
export async function sendQuizResultEmail(userEmail, quizTitle, score, passed) {
  try {
    const template = emailTemplates.quizResult(
      userEmail.split('@')[0],
      quizTitle,
      score,
      passed
    );

    await sendEmail(userEmail, template.subject, template.html);
    console.log('Quiz result email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending quiz result email:', error);
  }
}

// Generic email sender (integrates with Supabase Auth or external service)
async function sendEmail(toEmail, subject, htmlContent) {
  // Option 1: Use Supabase Auth email (requires email templates in Supabase)
  // This is a placeholder - actual implementation depends on your email provider

  // Option 2: Use external email service (SendGrid, Mailgun, Resend, etc.)
  // Example with Resend (https://resend.com):

  const emailData = {
    to: toEmail,
    subject: subject,
    html: htmlContent,
    from: 'noreply@quran-hikma.com' // Update with your domain
  };

  // You would implement one of these approaches:

  // A) Call a Supabase Edge Function
  // const response = await fetch(
  //   `${supabase.auth.getSession().data.session?.user?.app_metadata?.supabase_url}/functions/v1/send-email`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${supabase.auth.getSession().data.session?.access_token}`,
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify(emailData)
  //   }
  // );

  // B) Call external email API
  // const response = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${RESEND_API_KEY}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify(emailData)
  // });

  // For now, log that email would be sent
  console.log('[Email would be sent]', emailData);

  return { success: true, id: Math.random().toString(36) };
}

// Store notification preferences for users
export async function setNotificationPreferences(userId, preferences) {
  try {
    const { data, error } = await supabase
      .from('qh_notification_preferences')
      .upsert({
        user_id: userId,
        receive_enrollment_emails: preferences.enrollment ?? true,
        receive_progress_emails: preferences.progress ?? true,
        receive_completion_emails: preferences.completion ?? true,
        receive_grading_emails: preferences.grading ?? true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error setting notification preferences:', error);
    throw error;
  }
}

// Get user's notification preferences
export async function getNotificationPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('qh_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return defaults if no preferences found
    return data || {
      receive_enrollment_emails: true,
      receive_progress_emails: true,
      receive_completion_emails: true,
      receive_grading_emails: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      receive_enrollment_emails: true,
      receive_progress_emails: true,
      receive_completion_emails: true,
      receive_grading_emails: true
    };
  }
}
