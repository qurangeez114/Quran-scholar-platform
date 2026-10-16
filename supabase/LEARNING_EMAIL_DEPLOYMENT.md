# Automatic instructor AND student registration email

## Immediate workflow
When an authorized administrator registers an instructor, or an instructor/owner registers a student in a class, `lms-admin` sends an email through **Supabase Auth during the registration request**, not through a scheduled check.

| Action | Email behavior | Password |
| --- | --- | --- |
| Register new instructor | `inviteUserByEmail` with `/instructor-welcome.html` redirect | Temporary password must be shared separately or replaced using Forgot Password |
| Register new student in owned class | `inviteUserByEmail` with `/student-welcome.html` redirect | Same secure first-login change |
| Authorize existing account as instructor | `signInWithOtp` with `shouldCreateUser:false` | Existing password unchanged |
| Enroll existing account into a **new** class | `signInWithOtp` with `shouldCreateUser:false` | Existing password unchanged |
| Repeat existing assignment to same role/class | No duplicate invitation | Unchanged |
| Owner clicks `Resend invitation email` | Fresh instructor sign-in link | Unchanged |
| Instructor clicks `Resend login email` for **their class's** student | Fresh student sign-in link | Unchanged |

A successful Supabase email API call means the mail provider accepted the send request; it **does not prove delivery**. If an existing account's notification fails after provisioning, the UI displays the failure and provides a resend control. Invitations are not to contain plaintext passwords, and user-supplied emails never authorize privilege assignment directly; the existing server verifies owner/course ownership.

Site self-sign-up on `/account.html?mode=signup` already requests email confirmation through Supabase Auth (independent of administrator course enrollment).

## Required to actually send automatic emails from 360quranhikma@gmail.com

Gmail being connected to ChatGPT **does not configure site SMTP**. Hosted Supabase Authentication must be configured separately. Project: `ylosytbxpzxzwfzjpaej`.

1. Google Account `360quranhikma@gmail.com`: turn on two-step verification, create an **App Password** if eligible. Never send it in ChatGPT, commit it to GitHub, or display it to students.
2. In Supabase Dashboard → Authentication → Emails / SMTP Settings: enable Custom SMTP, sender `360quranhikma@gmail.com`, display name `QuranHikma Education`, host `smtp.gmail.com`, port `465` for TLS or `587` for STARTTLS, username `360quranhikma@gmail.com`, password the Google App Password. Enter only in secure Supabase credential UI. Gmail's rate limits may require moving to a dedicated transactional sender at scale.
3. Authentication → URL Configuration: Site URL `https://quranhikma.com`; **allowlisted redirect URLs** `https://quranhikma.com/instructor-welcome.html`, `https://quranhikma.com/student-welcome.html`, `https://quranhikma.com/account.html`. Keep other existing redirect URLs intact.
4. Authentication → Email Templates → Invite user: set subject `You're invited to QuranHikma Learning`; paste `supabase/email-templates/learning-invite.html`. Authentication → Email Templates → Magic Link: subject `Your QuranHikma learning access`; paste `supabase/email-templates/learning-magic-link.html`. These committed HTML files are **not** automatically installed into hosted Auth email templates.
5. Deploy revised Supabase Edge Function `lms-admin` from `supabase/functions/lms-admin/index.ts` and `deno.json`, keeping **verify_jwt=true**. Only after deployment, deploy frontend code on `main`.
6. Test with controlled addresses, not genuine unconsenting recipients. Verify new instructor, new student, authorized existing user, existing student new class, duplicate suppression, reset link and first-login password change, resend authorization, and that SMTP actually delivered mail.

## Current rollout boundary
Until production function and SMTP are configured and tested, **do not claim immediate emails are live**. The prior hourly checking automation is a temporary fallback, not an instant registration trigger.

A successful test on a stubbed Supabase client or a green GitHub CI run validates behavior, but does not validate real email delivery.
