# Recoverable account deletion and sample classroom

## Release status
Frontend changes are safe to deploy before database activation: when the lifecycle RPC is missing, the destructive button stays disabled. The old permanent-delete RPC is not called by the new UI. Database migration is required to enable recovery and the archive. Existing stored copies of the old client remain unsafe until the migration replaces the legacy RPC.

## Activate
1. Review and run `supabase/accounts/002_account_recovery.sql` using an authorized Supabase SQL connection. It assumes the accounts schema exists. It is transactional and can be reapplied. It adds restrictive policies to tables that already have RLS, without enabling RLS on the public research corpus. Private tables must already have correct ownership RLS. Confirm any additional custom tables and SECURITY DEFINER RPCs are subject to the same lifecycle rules before release; RLS does not constrain definer RPCs, service-role requests, or previously issued signed/public file URLs.
2. Grant recovery authority to a verified owner account through SQL, not signup metadata. Replace the email below with the actual verified owner email. Class teachers are not automatically recovery administrators.

```sql
insert into public.qh_account_recovery_admins(user_id)
select id from auth.users where lower(email)=lower('VERIFIED_OWNER_EMAIL') and email_confirmed_at is not null
on conflict do nothing;
```

3. In a disposable account verify delete -> confirmation -> signed out -> sign in -> restore. Verify data survives. Repeat with the server deadline moved into the past on a test account: only admin recovery must remain available. No scheduler is necessary; archival status is derived from server time at the 72-hour deadline.
4. Visit `/admin/deleted-accounts.html` as the authorized owner. Search by email, display name, exact account ID, or deletion date. Restore only after independently verifying the requester's identity. Search returns 50 results per page and no private content.
5. Permanent removal requires typing `PERMANENTLY DELETE`. It deletes the auth user and relies on the schema's verified cascading foreign keys. Objects owned in Supabase Storage intentionally block this action: remove files via the Storage API first, never by deleting storage metadata. Other RESTRICT references also abort the transaction. Inspect all account-owned data and FK behavior before using purge on a real account. Audit events survive purge and contain identifiers, timestamps and actions, not research content.

No account is automatically purged after 72 hours. The email remains reserved while its login is retained. Browser-local guest material is not erased by cloud account deletion.

## Sample course
`/sample-course.html` is independent of the backend and real accounts. It demonstrates enrollment, a short research-methods lesson, source capture into a titled page, an editable slideshow, a five-question quiz, percentage scoring at a 70% pass mark, retry history and a teacher gradebook. All sample data stays in the browser. Quiz answers and grades in this practice app are intentionally client-side; do not use them as real course results.

## Local validation
Install `@electric-sql/pglite` and `jsdom` outside the checkout, then run:

```sh
PGLITE_MODULE=/tmp/qh-recovery-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/account-recovery-db.mjs
JSDOM_MODULE=/tmp/qh-recovery-tests/node_modules/jsdom/lib/api.js node tests/sample-course-dom.mjs
```

Tests use a disposable local PostgreSQL-compatible database and browser DOM. They do not alter production. Production signed-in verification remains a separate release check.
