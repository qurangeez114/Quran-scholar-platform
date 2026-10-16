# Instructor management and owner dashboard

## Behavior

- My Account links the owner to Admin Page and authorized instructors to Instructor Dashboard.
- The owner authorizes instructors by email, with a temporary password for newly created accounts. Existing accounts retain their password.
- Instructors create their own courses through Manage Classes, enroll students by email, and inspect only those courses' students, attempts, submitted-work counts, and progress.
- New managed accounts must change their temporary password before accessing teaching or course content. The current temporary password is verified, the new password must differ and be at least 12 characters, and the server clears the gate only after the password update succeeds.
- The owner filters instructors by country/city and name, drills into their classes, and suspends or restores instructor access.
- No invitation email is sent. The administrator shares the temporary password privately. New accounts are administratively email-confirmed to allow temporary-password sign-in; this is not proof that the recipient owns the mailbox.
- Saved passing quiz attempts restore lesson completion; subsequent failed practice does not erase a pass. Attempts remain intact.

## Deployment status

Production migration was rejected by automatic approval review because it combines security changes and existing-data reconciliation. It has NOT been applied. The function has NOT been deployed. Do not merge the frontend changes before the backend is installed and verified.

## Reviewable release steps (owner approval required for production migration)

1. Back up `qh_student_progress` and `qh_enrollments`; review the migration's reconciliation against the currently saved attempts.
2. Apply `supabase/migrations/20261016182333_lms_instructor_management.sql` to the existing project. It creates one managed-account table, a private helper schema, scoped policies, and a quiz-completion trigger; adds grants gated by RLS; reconciles progress from saved passing attempts and enrollment percentages. Existing owner staff records are unchanged. No users are created by this migration.
3. Deploy the `lms-admin` Edge Function with `verify_jwt=true`, using its committed TypeScript and deno.json. The Supabase service-role key is read only from built-in server environment variables. Never add it to frontend files or repository secrets files.
4. Merge frontend files; verify the real deployed URLs and sign-in flows before announcing completion.
5. Test owner → provision test instructor → sign in with temporary password → change password → create course → enroll test student → submit quiz → reload result. Test instructor B cannot access instructor A's course or students. Confirm owner country/city filters and suspension.

## Validation

`cd tests/lms && npm ci && npm test`

The database test runs the migration in an isolated PGlite PostgreSQL instance with the LMS foundation and existing staff/progress policies. It checks cross-instructor isolation, inability to self-promote, pending-password restrictions, enrollment reads, student result privacy, owner reads, suspension, and passing-score preservation.

Endpoint tests use a stubbed Supabase client to verify authentication and authorization branches. DOM tests use a simulated browser DOM for navigation, filtering, score display, enrollment forms, and password screens. These are not a substitute for a real signed-in production smoke test.

## Reversal

Keep main on the previous frontend commit until backend installation succeeds. If rollback is necessary after release, restore the previous frontend, remove the deployed function, remove only the new `lms_*` policies/trigger/functions and managed-account table after preserving managed accounts, then restore progress/enrollment snapshots if data reconciliation must be undone. Removing instructor access should not delete auth users or their content. Existing `qh_staff_manage` and `progress_*_own` policies must remain.

## Known limits

The dashboard currently fetches the existing PostgREST page limit per table and is intended for the current small course population. Add cursor pagination before scaling beyond the configured API row limit. Grading logic remains the existing client-side workflow; this release does not claim server-verified grading. Assignment editing/grading and course material storage continue through the existing pages and require separate live verification.
