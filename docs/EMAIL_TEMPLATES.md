# QuranHikma Auth email templates

Supabase Auth emails (invitation, signup confirmation, magic link, password reset) are
**dashboard settings, not code**. Editing the files in `supabase/email-templates/` changes
nothing until the HTML is pasted into the Supabase dashboard. Project: `ylosytbxpzxzwfzjpaej`.

## Why instructors saw a dead invitation and then a "Confirm Your Signup" email

1. **Dead invite link (fixed in code).** The `lms-admin` function used to call
   `inviteUserByEmail` and *then* `updateUserById({password})` to store the temporary
   password. In Supabase Auth, every password change clears the user's pending
   confirmation/invitation token (`UpdatePassword` resets `confirmation_token` and all
   one-time tokens). So the invitation link was already invalid the moment the email was
   sent. The function now creates the unconfirmed user with the temporary password first
   (`admin.createUser`, which sends no email) and only then sends the invitation, which
   issues a fresh token and keeps the password.
2. **Generic "Confirm Your Signup" on resend (fixed in code).** "Resend invitation" used
   `signInWithOtp` (magic link). For a user who never confirmed their email, Supabase Auth
   turns a magic-link request into a signup confirmation, so it sends the *Confirm signup*
   template, and current Auth versions also discard the unconfirmed password. Resend now
   sends a fresh **invitation** to unconfirmed users and a **magic link** only to users who
   already confirmed.
3. **Possible extra cause: link scanners.** Some mail providers and security tools open
   links in incoming email to check them. A one-time Supabase link opened by a scanner is
   used up before the person clicks it. The optional "token hash" templates below prevent
   this (see section 4).

## 1. Where to paste

Supabase Dashboard → **Authentication** → **Emails** (called "Email Templates" in older
dashboards). Each template has a **Subject** and a **Message body (HTML)**. Paste, then
**Save**. Repeat for each template below.

Also check, under **Authentication → URL Configuration**:

- Site URL: `https://quranhikma.com`
- Redirect URLs include `https://quranhikma.com/instructor-welcome.html`,
  `https://quranhikma.com/student-welcome.html` and `https://quranhikma.com/account.html*`.

## 2. Invite user

Subject: `You are invited to QuranHikma`

Body (same as `supabase/email-templates/learning-invite.html`):

```html
<!doctype html><html><body style="margin:0;padding:28px;background:#f5f8f5;font-family:Arial,sans-serif;color:#153b30"><div style="max-width:620px;margin:auto;padding:32px;background:white;border-radius:14px"><p style="margin:0 0 8px;font-size:13px;letter-spacing:.06em;color:#8a6d2f">QURANHIKMA LEARNING</p><h1 style="margin:0 0 14px;font-size:26px">You are invited to QuranHikma</h1><p>An administrator or instructor has registered an account for you to teach or study on QuranHikma with this email address ({{ .Email }}).</p><p><strong>Step 1.</strong> Click the button below. It confirms your email address. You must do this before you can log in.</p><p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;background:#20624c;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Accept invitation</a></p><p><strong>Step 2.</strong> On the page that opens, choose your own password (at least 12 characters). If you were given a temporary password separately, you can log in with it instead; you will be asked to replace it.</p><p>This link works once. If it has expired, ask the person who invited you to resend the invitation and open the newest email.</p><p><small>Never send your password by email. If you did not expect this invitation, ignore this message.</small></p><p>QuranHikma Education</p></div></body></html>
```

## 3. Confirm signup

Subject: `Confirm your QuranHikma email`

Body (same as `supabase/email-templates/learning-confirm-signup.html`):

```html
<!doctype html><html><body style="margin:0;padding:28px;background:#f5f8f5;font-family:Arial,sans-serif;color:#153b30"><div style="max-width:620px;margin:auto;padding:32px;background:white;border-radius:14px"><p style="margin:0 0 8px;font-size:13px;letter-spacing:.06em;color:#8a6d2f">QURANHIKMA</p><h1 style="margin:0 0 14px;font-size:26px">Confirm your email address</h1><p>Please confirm that {{ .Email }} belongs to you to finish setting up your QuranHikma account.</p><p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;background:#20624c;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Confirm my email</a></p><p>After confirming, log in at <a href="https://quranhikma.com/account.html">quranhikma.com/account.html</a> with your email and password. If you were invited by an administrator or instructor, use the password you chose or the temporary password they gave you separately.</p><p>This link works once. If it has expired, open the account page, try to log in, and choose <strong>Resend confirmation email</strong>.</p><p><small>If you did not create a QuranHikma account, you can ignore this email.</small></p><p>QuranHikma Education</p></div></body></html>
```

The **Magic Link** template stays as `supabase/email-templates/learning-magic-link.html`
(see `supabase/LEARNING_EMAIL_DEPLOYMENT.md`).

## 4. Optional, recommended if links keep "expiring": token-hash links

Default templates use `{{ .ConfirmationURL }}`, which verifies the token as soon as the
link is opened (by a person *or* a scanner). The site now also understands Supabase's
token-hash links: the page opens normally and the token is used only when the person
presses **Accept invitation** / **Confirm my email** on the page.

To switch, replace only the button link (`href`) in each template:

| Template | Replace `{{ .ConfirmationURL }}` with |
|---|---|
| Invite user | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite` |
| Confirm signup | `{{ .SiteURL }}/account.html?token_hash={{ .TokenHash }}&type=signup` |
| Magic Link | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink` |
| Reset password | `{{ .SiteURL }}/account.html?token_hash={{ .TokenHash }}&type=recovery` |

Notes:
- Invite and Magic Link emails from `lms-admin` always redirect to
  `instructor-welcome.html` or `student-welcome.html` (no query string), so
  `{{ .RedirectTo }}?…` is safe there.
- The token-hash Confirm signup and Reset password links go to the plain account page, so
  a `returnTo` from the original page is not carried over. Keep `{{ .ConfirmationURL }}`
  for those two if that matters more than scanner protection.
- Deploy the site (this branch) **before** switching templates; older pages do not read
  `token_hash`.

## 5. Link expiry

Supabase Dashboard → **Authentication** → **Providers** → **Email** (or **Sign In /
Providers → Email** in newer dashboards) → **Email OTP Expiration**. The default is 3600
seconds (1 hour) and applies to invitation, confirmation, magic-link and reset links.
Consider raising it to `86400` (24 hours, the maximum) so instructors who open the email
later the same day can still accept. Each resend replaces the earlier link, so tell
instructors to open the newest email.

## 6. Test after changing

Use a controlled address. Authorize a test instructor on `/admin/lms.html`, wait for the
invitation, open it, choose a password on the welcome page, open the Instructor Dashboard,
then delete the test account. Also try logging in before accepting: the account page should
explain that the email is not confirmed and offer **Resend confirmation email**.
