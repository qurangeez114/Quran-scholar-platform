# QuranHikma release setup checklist (release/2026-11-combined)

Do these steps in order. Steps marked **(owner)** need the Supabase or Netlify dashboard;
nothing here is applied automatically by merging. Supabase project: `ylosytbxpzxzwfzjpaej`.
Site: https://quranhikma.com.

Status legend: ☐ to do. "Verified unapplied" means a read-only check against the live
database on 2026-11-16 found the objects missing.

## 1. Merge and deploy the site
- ☐ Open a pull request from `release/2026-11-combined` into `main` and merge it. It already
  contains `fix/signup-confirm-redirect`, `fix/school-qa-v2`, `feat/research-search-actions-v2`,
  `feat/academic-standards` and `fix/instructor-onboarding`; those branches no longer need
  separate pull requests.
- ☐ Confirm Netlify finished the production deploy of `main` (Netlify → Deploys).
- ☐ Spot-check: https://quranhikma.com/my-progress.html, /instructor-guide.html, /catalog.html
  and /policies.html load (before this release /my-progress.html returned 404).

## 2. Redeploy edge functions (owner)
- ☐ `lms-admin` — changed in this release (invite order fix: account is created first and the
  invitation is sent second, so the link is no longer cancelled; proper invite on Resend;
  plainer "email not sent" messages). From a machine with the Supabase CLI:
  `supabase functions deploy lms-admin --project-ref ylosytbxpzxzwfzjpaej`
  (or Dashboard → Edge Functions → lms-admin → Deploy a new version with
  `supabase/functions/lms-admin/index.ts`). The invite fix does not work until this is done.
- No other edge function source changed in this release (`academic-hub` and others are unchanged).

## 3. Apply database migrations, in this order (owner)
Run each file in Dashboard → SQL Editor (or `supabase db push` for the `supabase/migrations`
files). Each file is idempotent or additive; read it before running.

| # | File | Status |
|---|------|--------|
| 1 | `migrations/20261020_search_fuzzy.sql` (pg_trgm, `suggest_terms`) | Verified unapplied (`suggest_terms` missing) |
| 2 | `migrations/20261020_semantic_search.sql` (pgvector, `search_embeddings`, `match_passages`, `hybrid_search`) | Verified unapplied (`search_embeddings` missing). Then run `scripts/embed_backfill.mjs` to fill embeddings. |
| 3 | `migrations/20261104_academic_standards.sql` (course code, outcomes, syllabus, credit hours…) | Verified unapplied (`qh_courses.syllabus` missing) |
| 4 | `migrations/20261104b_quiz_integrity_public_reads.sql` (server quiz grading, answer keys, lesson objectives, certificate verification, public lesson counts) | Verified unapplied (`qh_grade_quiz`, `qh_quiz_keys`, `qh_verify_certificate` missing) |
| 5 | `supabase/migrations/20261116090000_enforce_course_publish_readiness.sql` (server-side publish checks) | **Cannot verify** from outside (private schema triggers). It was merged to `main` in PR #450; check Dashboard → Database → Triggers for `qh_courses_publish_readiness`, and apply it if missing. |
| 6 | `supabase/migrations/20261116130000_publish_requires_syllabus.sql` (new in this release: publishing also requires a syllabus once step 3 is applied) | Unapplied (new file). Apply after #5. |
| 7 | `supabase/migrations/20261117090000_owner_manage_all_courses.sql` (site owners can see, edit, publish, unpublish and delete every course, including instructors' courses; instructors still manage only their own) | Unapplied (new file). Apply after #6. Without it, Admin → Courses lists all courses for the owner but saving changes to another instructor's course fails. |
| 8 | `supabase/migrations/20261117100000_issue_certificate_server_side.sql` (**fixes certificates**: issues them on the server via `qh_issue_certificate` after checking enrollment, every lesson completed, every quiz passed and every assignment submitted; students can no longer write certificate rows) | Unapplied (new file). Apply after #7. Until it is applied, a student who finishes a course sees "Your completion is saved. Certificates are not switched on yet" and no certificate is created. |

Older files in `supabase/migrations/` (up to `20261108084500_speed_up_research_hadith_book_rows.sql`)
could not be individually verified from outside; compare with Dashboard → Database → Migrations.

Note on #6: when the academic columns exist, a course can be published only after an
administrator enters at least one learning outcome and a weekly schedule in
`/admin/syllabus-editor.html`. Courses that are already published are not affected.

## 4. Auth URLs (owner) — Authentication → URL Configuration
- ☐ Site URL: `https://quranhikma.com`
- ☐ Redirect URLs — add all of these:
  - `https://quranhikma.com/account.html*` (covers `?mode=login&confirmed=1`, `?mode=recovery` and `returnTo` links)
  - `https://quranhikma.com/account.html?mode=recovery` (password reset; listed explicitly in case wildcards are not accepted)
  - `https://quranhikma.com/instructor-welcome.html`
  - `https://quranhikma.com/student-welcome.html`
- Without the recovery URL, "Forgot password" emails fall back to the Site URL and the user
  never sees the "Choose a new password" form.

## 5. Email delivery (owner)
- ☐ **Custom SMTP**: Authentication → SMTP Settings (Project Settings → Authentication in some
  dashboards) → enable custom SMTP with QuranHikma's mail provider. Supabase's built-in
  sender allows only a few emails per hour, which causes "Saved, but the email was not
  sent" when enrolling students or inviting instructors.
- ☐ **Rate limits**: Authentication → Rate Limits → raise "emails sent per hour" after custom
  SMTP is on (the value is To be provided by QuranHikma, based on expected enrollments).
- ☐ **Templates**: Authentication → Emails (Email Templates). Paste the branded templates from
  `docs/EMAIL_TEMPLATES.md` / `supabase/email-templates/`:
  Invite user, Confirm signup, Magic Link. For Reset password, keep `{{ .ConfirmationURL }}`
  or use the token-hash link documented in `docs/EMAIL_TEMPLATES.md`; both open the
  "Choose a new password" form.
- ☐ **Link expiry (OTP)**: Authentication → Providers → Email → Email OTP Expiration. Default
  3600 seconds (1 hour); 86400 (24 hours) is recommended so invited instructors and
  students have time to open the email.

## 6. Smoke test after deploy
- ☐ Admin → Authorize an instructor (test address) → open the email right away → Accept
  invitation → Choose your password → Instructor Dashboard.
- ☐ Account page → Forgot password → open the email → "Choose a new password" appears →
  save → log in with the new password.
- ☐ Manage Courses → Create Course → Publish on an empty course shows the "Before publishing"
  checklist (no lessons). Add a lesson, publish, unpublish.
- ☐ Preview as student → lesson shows "Preview: progress is not saved"; quiz check shows
  your explanations; Next Lesson moves on.
- ☐ Student with a temporary password → asked to choose a new one; using the same password
  shows "must be different from the temporary password" and does not log out.

## 7. Clean up test data (owner)
- ☐ Delete the test course **"TEST - Instructor Walkthrough (delete me)"** (Manage Courses →
  Delete, signed in as that instructor, or Table Editor → `qh_courses`). Its lessons are deleted with it.
- ☐ Delete the test account **34tyrfjz@mail.grokbot.com**: Authentication → Users → delete,
  and remove its row from `qh_lms_accounts` if it remains.

## 8. Information only QuranHikma can supply
Accreditation status, faculty credentials, tuition, academic calendar dates, credit hours,
support contact and policy effective dates are shown as "To be provided by QuranHikma"
until real values are entered. Nothing has been invented for these.
