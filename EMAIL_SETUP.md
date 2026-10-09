# Email Notifications Setup Guide

## Overview
The QuranHikma LMS includes an email notification system that sends automated emails to students for important course events:
- Course enrollment confirmation
- Progress milestones (25%, 50%, 75% completion)
- Course completion with certificate
- Assignment grading notifications
- Quiz result notifications

## Current Implementation

The email system is currently implemented with template generation but requires configuration of an external email provider to actually send emails.

### Placeholder Functions
The `sendEmail()` function in `email-notifications.js` currently logs emails instead of sending them. This is ready for integration with:

1. **Supabase Auth Email Templates**
2. **External Email Services** (Resend, SendGrid, Mailgun, AWS SES, etc.)

## Setting Up Email Delivery

### Option 1: Supabase Auth with Email Templates

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Configure custom email templates for different event types
4. Update the `sendEmail()` function to use Supabase Auth email API

```javascript
// Example implementation with Supabase Auth
async function sendEmail(toEmail, subject, htmlContent) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}/send-confirmation-mail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: toEmail,
        subject: subject,
        html: htmlContent
      })
    }
  );
  return response.json();
}
```

### Option 2: Resend (Recommended)

Resend is a modern email API service optimized for developers.

**Setup Steps:**
1. Sign up at https://resend.com
2. Get your API key
3. Create a verified domain (e.g., noreply@quran-hikma.com)
4. Update `email-notifications.js`:

```javascript
const RESEND_API_KEY = 'your-api-key-here';

async function sendEmail(toEmail, subject, htmlContent) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@quran-hikma.com',
      to: toEmail,
      subject: subject,
      html: htmlContent
    })
  });
  
  if (!response.ok) {
    throw new Error(`Email service error: ${response.statusText}`);
  }
  
  return response.json();
}
```

### Option 3: SendGrid

**Setup Steps:**
1. Sign up at https://sendgrid.com
2. Create a sender identity
3. Get your API key
4. Update `email-notifications.js`:

```javascript
const SENDGRID_API_KEY = 'your-api-key-here';

async function sendEmail(toEmail, subject, htmlContent) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: 'noreply@quran-hikma.com' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlContent }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`SendGrid error: ${response.statusText}`);
  }
  
  return response.json();
}
```

### Option 4: Supabase Edge Functions

Create a Supabase Edge Function to handle email sending:

```bash
supabase functions new send-email
```

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { to, subject, html } = await req.json();

  // Use your preferred email service here
  // Example with Resend:
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@quran-hikma.com",
      to: to,
      subject: subject,
      html: html,
    }),
  });

  return new Response(JSON.stringify(await response.json()));
});
```

## Email Events

### 1. Enrollment Confirmation
- **Triggered:** When student enrolls in a course
- **Contains:** Course name, start learning link
- **User Control:** Can be disabled in notification preferences

### 2. Progress Milestones
- **Triggered:** At 25%, 50%, 75% completion
- **Contains:** Current progress percentage, motivation message
- **User Control:** Can be disabled in notification preferences

### 3. Course Completion
- **Triggered:** When course reaches 100% completion
- **Contains:** Certificate code, download certificate link
- **User Control:** Can be disabled in notification preferences

### 4. Assignment Graded
- **Triggered:** When instructor grades an assignment
- **Contains:** Grade, feedback, assignment title
- **User Control:** Can be disabled in notification preferences

### 5. Quiz Results
- **Triggered:** Immediately after quiz submission
- **Contains:** Score, passing status, quiz title
- **User Control:** Can be disabled in notification preferences

## User Notification Preferences

Students can manage their notification preferences:

1. Navigate to settings (when preferences UI is added)
2. Toggle on/off for each email type
3. Preferences are stored in `qh_notification_preferences` table

## Testing Email Delivery

### In Development
Use `console.log()` to verify email content without actually sending

### In Staging
Use a test email provider:
- Mailtrap (https://mailtrap.io) - free plan available
- Ethereal Email (https://ethereal.email) - temporary email service

### In Production
- Use production API keys
- Monitor delivery rates
- Set up bounce handling
- Track opens/clicks if supported by your provider

## Email Templates

All templates are currently HTML-based and can be easily customized:

```javascript
// In email-notifications.js
emailTemplates.enrollmentConfirmation = (userName, courseName) => ({
  subject: `Welcome to ${courseName}!`,
  html: `<!-- Your HTML template here -->`
});
```

## Best Practices

1. **Test First:** Always test email delivery in development before production
2. **Unsubscribe:** Ensure compliance with email regulations (include unsubscribe links)
3. **Rate Limiting:** Implement rate limiting to prevent email floods
4. **Error Handling:** Silently fail if emails can't be sent (already implemented)
5. **Personalization:** Use student names and course names in emails
6. **Responsive Design:** Ensure emails look good on mobile devices

## Troubleshooting

### Emails not sending
1. Check that email provider API key is correctly configured
2. Verify email templates are valid HTML
3. Check for rate limiting from email provider
4. Review email provider logs for delivery errors

### Emails going to spam
1. Set up proper SPF/DKIM records with email provider
2. Use authenticated sender domain
3. Avoid spam trigger words in email content
4. Include unsubscribe headers

### High bounce rates
1. Verify email addresses are correct
2. Check if emails are being collected properly during signup
3. Implement email validation during account creation

## Database Schema

```sql
-- Notification preferences table
qh_notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,
  receive_enrollment_emails BOOLEAN DEFAULT TRUE,
  receive_progress_emails BOOLEAN DEFAULT TRUE,
  receive_completion_emails BOOLEAN DEFAULT TRUE,
  receive_grading_emails BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Future Enhancements

- [ ] Email preference UI in student dashboard
- [ ] Batch email delivery for efficiency
- [ ] Email statistics and tracking
- [ ] SMS notifications
- [ ] Push notifications
- [ ] Weekly digest emails
- [ ] Instructor notification preferences
