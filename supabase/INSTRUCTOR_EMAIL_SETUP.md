# QuranHikma instructor invitation setup — production

## What is implemented
When the owner provisions a NEW instructor, the server calls Supabase Auth `inviteUserByEmail` with the destination `https://quranhikma.com/instructor-welcome.html`. It sets the temporary password in Auth server-side. It does **not** send that password by email. The owner must share the password separately using a private channel. The new instructor must set their own password before access to teaching pages.

For an EXISTING registered user, the server grants instructor access without changing their existing password and requests a sign-in email with `signInWithOtp` and `shouldCreateUser: false`. Owner can resend the invitation from Admin Page. Email-accepted means Supabase accepted the request, not that it reached the inbox.

`/instructor-welcome.html` explains the first-login steps and links to the existing login and `/account.html?mode=recover` password-reset flow. An Auth password hash change clears the `must_change_password` flag, including changes made after a recovery link. Do not put temporary passwords in emails, URLs, or user metadata.

## REQUIRED Supabase Auth settings
Project: `ylosytbxpzxzwfzjpaej`.

1. **Authentication → SMTP Settings:** Configure a verified production custom SMTP provider and from address (e.g. `no-reply@quranhikma.com`). Without custom SMTP, the built-in Supabase sender only permits project-team addresses and is unsuitable for inviting external instructors. Do not paste SMTP credentials into the repository.
2. **Authentication → URL Configuration:** Set Site URL to `https://quranhikma.com`. Add the exact allowed Redirect URL `https://quranhikma.com/instructor-welcome.html`, and preserve `https://quranhikma.com/account.html` for password-recovery emails. If the welcome redirect is not allowed, Supabase may silently send users elsewhere.
3. **Authentication → Email Templates → Invite user:** Replace with `supabase/email-templates/instructor-invite.html`, which includes an acceptance link, separate temporary-password instructions, and a reset option. **Magic Link**: use `supabase/email-templates/instructor-magic-link.html` for existing users. Email templates committed to Git are examples for configuring the hosted project's Email Templates; they are NOT automatically activated by a Git push or migration.
4. Confirm the native invitation email template includes `{{ .ConfirmationURL }}` to keep the verification link functional. Do not use an ordinary login URL instead of the single-use link.
5. Test a controlled recipient mailbox (not a random external address): owner provisions new instructor → email appears → click link → temporary password login works → password change completes → refresh instructor dashboard; test Forgot Password instead of the temporary password → link works and clears gate. Test an existing registered account → sign-in link works without changing its password. Verify resend works only for owner and suspended instructors cannot be invited until restored.

## Operational notes
- Email deliverability cannot be verified by successful Edge Function invocation alone; inspect Auth logs and your SMTP provider's delivery logs on failures.
- Native Auth invitation/OTP limits and expiration apply. Expired invites can be reissued from Admin Page (resend uses a fresh sign-in link).
- No full password or password hash should be logged, displayed in the email, or saved to `qh_lms_accounts`.
- Update two templates at the Supabase Dashboard to actually include the complete instructions *inside the email*. Before that, the default emails will link to the onboarding page which has the instructions.
