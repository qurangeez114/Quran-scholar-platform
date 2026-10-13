# Membership, guest access, and classes review

Date: 2026-10-13

## What the current implementation actually contains

The main branch contains account signup/login/recovery, private research pages, a course catalog, lesson viewer, student dashboard, course and lesson management, and a grading page. The account page was observed live before editing. This review checks code; it does not certify live database setup or email delivery.

The October 8 account report is older than the LMS code. The current LMS summary says all phases are complete but also lists some of the same features as unfinished. Its completion labels are not reliable evidence of working features.

Confirmed issues repaired:

- Learning pages imported `supabase` while the client exported only `db`, preventing module initialization.
- Guest membership script was a no-op, and the account page had no explicit guest option.
- Login initialization left required name inputs hidden. The login form applied the signup password-length restriction.
- Signup/profile creation referenced an address field absent from the baseline profile schema.
- New lesson creation discarded the selected type and content. The editor did not author quiz questions.
- Quiz grading compared raw correct-answer counts against a percentage threshold and accepted a browser-supplied score.
- Student quiz delivery included answer keys; the original schema did not provide the necessary quiz access policies.
- The lesson-read policy referenced a table outside its SQL scope.
- Quiz review queried nonexistent quiz title/profile fields and reused the question variable when looking up student answers.
- Discussion rendering recursively reloaded itself.

## Behavior in this change

Public reading remains free and does not require authentication. Visitors have clear login and account links. Five distinct local calendar days are counted in this browser; the reminder starts on a later visit day, can be dismissed for that day, and never blocks public browsing. Clearing browser data or using another device restarts the counter; this is a gentle reminder, not an enforceable trial limit.

Accounts link to private research, classes, and the learning dashboard. Name fields are optional; address collection is removed. Owner/admin class management appears only after the checked staff RPC confirms access.

Owners/admins can create classes and author multiple-choice quizzes, with question text, answer options, a correct answer, and a passing percentage. The repaired database functions verify enrollment, hide answer keys from students, compute percentage scores, and keep submissions private. A failed quiz does not mark its lesson complete. This provides automatic grading, not automatic generation of class content or AI questions.

## Database and release requirements

1. Confirm the existing account and LMS tables in staging. For a new LMS installation, use the repaired `002_create_lms_schema.sql`; the original lesson policy was invalid.
2. Apply `003_membership_quiz_repair.sql` in staging, then production after verification. Deploy its dependent frontend changes together. The migration was executed against isolated PostgreSQL, not production Supabase.
3. A trusted Supabase administrator must configure the intended owner's/admin's `app_metadata.role` as `owner` or `admin` (or the corresponding `app_metadata.roles` array). Never put authority in user-editable metadata. No actual user role was assigned by this change.
4. Verify signup, email confirmation, recovery redirects, existing private research, and student/instructor workflows with real authorized accounts. Email configuration and account deletion remain unverified.
5. Preserve the earlier account release gate requiring audio completion/verification until the owner changes it or its completion is independently established.

## Remaining limits in Claude's LMS

This is not a certification of the entire LMS. Assignment uploads/grading, certificates, course analytics, notification delivery, and cross-device end-to-end flows still need separate verification. Progress/enrollment fields remain client-writable in the earlier schema; certificates should not be treated as independently verified academic credentials. The existing certificate endpoint also lacks a certificate-insert policy in the baseline schema. Some remaining discussion/profile queries assume fields/relationships not present in that baseline. Quiz score confidentiality and integrity are covered by this repair; those broader LMS features are not all fixed here.

## Validation performed

- `node tests/membership-guest-days.mjs`: separate visit days, repeated same-day navigation, five full guest days, later reminder, dismissal, blocked/corrupt storage, local dates.
- `QH_TEST_DEPENDENCIES=/tmp/qh-validation/node_modules node tests/membership-account-ui.mjs`: DOM checks for guest navigation, optional names, signup deep link, login/signup/recovery switching, hidden staff navigation.
- `QH_TEST_DEPENDENCIES=/tmp/qh-validation/node_modules node tests/lms-repair-staging.mjs`: executes both LMS migrations in isolated PostgreSQL; checks staff restrictions, enrollment, answer-key exclusion, server grading at 67%/100%, denied forged scores, student privacy, and instructor results.
- JavaScript module/inline-script syntax and `git diff --check` passed.

Optional isolated test dependencies can be installed with `npm install --prefix /tmp/qh-validation @electric-sql/pglite linkedom --no-audit --no-fund`. Tests do not contact production or create real users.
