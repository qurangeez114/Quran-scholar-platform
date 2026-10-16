# QuranHikma instructor invitation setup — production

## What is implemented
When the owner provisions a NEW instructor, the server calls Supabase Auth `inviteUserByEmail` with the destination `https://quranhikma.com/instructor-welcome.html`. It sets the temporary password in Auth server-side. It does **not** send that password by email. The owner must share the password separately using a private channel. The new instructor must set their own password before access to teaching pages.

For an EXISTING registered user, the server grants instructor access without changing their existing password and requests a sign-in email with `signInWithOtp` and `shouldCreateUser: false`. Owner can resend the invitation from Admin Page. Email-accepted means Supabase accepted the request, not that it reached the inbox.

`/instructor-welcome.html` explains the first-login steps and links to the existing login and `/account.html?mode=recover` password-reset flow. An Auth password hash change clears the `must_change_password` flag, including changes made after a recovery link. Do not put temporary passwords in emails, URLs, or user metadata.

## REQUIRED Supabase Auth settings
Project: `ylosytbxpzxzwfzjpaej`.

1. **Authentication → Emails → SMTP Settings:** Send via the authorized Gmail account `360quranhikma@gmail.com`. Choose sender name `QuranHikma Education` and sender email `360quranhikma@gmail.com`. Gmail SMTP settings for this low-volume use: host `smtp.gmail.com`, port `465` (SSL/TLS) or `587` (STARTTLS), username `360quranhikma@gmail.com`, password **Google App Password**, NOT the ordinary Gmail password. A Google App Password normally requires 2-Step Verification; Google may restrict this option for some accounts. Never paste either password into a chat, GitHub file, or SQL editor. The owner enters it directly in Supabase's private SMTP configuration. Without custom SMTP, the built-in Supabase sender generally cannot invite recipients outside the project's authorized team.
2. **Authentication → URL Configuration:** Set Site URL to `https://quranhikma.com`. Add the exact allowed Redirect URL `https://quranhikma.com/instructor-welcome.html`, and preserve `https://quranhikma.com/account.html` for password-recovery emails. If the welcome redirect is not allowed, Supabase may silently send users elsewhere.
3. **Authentication → Email Templates → Invite user:** Replace with `supabase/email-templates/instructor-invite.html`, which includes an acceptance link, separate temporary-password instructions, and a reset option. **Magic Link**: use `supabase/email-templates/instructor-magic-link.html` for existing users. Email templates committed to Git are examples for configuring the hosted project's Email Templates; they are NOT automatically activated by a Git push or migration.
4. Confirm the native invitation email template includes `{{ .ConfirmationURL }}` to keep the verification link functional. Do not use an ordinary login URL instead of the single-use link.
5. Test a controlled recipient mailbox (not a random external address): owner provisions new instructor → email appears → click link → temporary password login works → password change completes → refresh instructor dashboard; test Forgot Password instead of the temporary password → link works and clears gate. Test an existing registered account → sign-in link works without changing its password. Verify resend works only for owner and suspended instructors cannot be invited until restored.

## Operational notes
- Email deliverability cannot be verified by successful Edge Function invocation alone; inspect Auth logs and your SMTP provider's delivery logs on failures.
- Native Auth invitation/OTP limits and expiration apply. Expired invites can be reissued from Admin Page (resend uses a fresh sign-in link).
- No full password or password hash should be logged, displayed in the email, or saved to `qh_lms_accounts`.
- Update two templates at the Supabase Dashboard to actually include the complete instructions *inside the email*. Before that, the default emails will link to the onboarding page which has the instructions.

## Authorized sending identity

- **Sender address:** `360quranhikma@gmail.com`
- **Sender display name:** `QuranHikma Education`
- **Purpose:** automatically send instructor invitations and password-recovery emails initiated from QuranHikma Supabase Auth. This sender is not configured merely by linking Gmail to ChatGPT.
- **SMTP:** Gmail Auth using `smtp.gmail.com` on port `465` (or `587`), authenticated using a dedicated Google App Password created in that account's security settings after enabling 2-Step Verification. The SMTP password must be configured by the account holder inside Supabase Auth settings; never upload it to source control or share it in conversation.
- **Templates:** `supabase/email-templates/instructor-invite.html` for first invite and `supabase/email-templates/instructor-magic-link.html` for subsequent sign-in links, with Subjects `QuranHikma — Instructor invitation` and `QuranHikma — Your instructor sign-in link` respectively.
- **Caution:** Gmail SMTP may impose sending limits and spam controls; when inviting many instructors or students, prefer a dedicated transactional email provider with authenticated domain-based sender. Do not alter application authentication settings without verifying live email delivery.
- **Sources:** https://support.google.com/mail/answer/185833 ; https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y ; https://supabase.com/docs/guides/auth/auth-smtp
