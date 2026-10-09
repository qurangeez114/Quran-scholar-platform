# Accounts phase 1 — staging only
Production release is blocked until all audio is completed AND verified.
This branch adds account.html and my-research.html for the existing static site.

## Enable on staging
1. Use a separate Supabase staging project (or branch). Inspect table/function names for conflicts.
2. Run supabase/accounts/001_accounts.sql. It is a one-time migration, not rerunnable.
3. Change accounts/client.js to the staging project URL and anon/public key. Never use a service-role key there.
4. Enable email authentication and Confirm email. Configure site URL and allow the exact preview-origin/account.html redirect. Configure reliable SMTP delivery before public launch.
5. Preview account.html. Create two test users and verify both emails. Test login, recovery email, new password, logout, saving research, export, and deletion using disposable users.
6. Run tests/accounts-privacy.mjs with SUPABASE_URL, SUPABASE_ANON_KEY, USER_A_EMAIL, USER_A_PASS, USER_B_EMAIL, USER_B_PASS. Node 18+; no dependencies.
7. Test on Android and desktop. Confirm both users cannot read, edit, delete or assign each other's rows.

## Implemented
Signup/login/email-recovery UI, logout, own-account deletion RPC; database RLS; private notes, bookmarks and presentation outlines; JSON export.
No analytics, payment or service-role key is bundled.
Rendering uses textContent and allows only HTTP(S) source links.

## Remaining
Edit research; synchronize existing device history/bookmarks/presentations with explicit import; profile/preferences; expired-session UX; real presentation builder integration; automated browser flows; account deletion and retention across future analytics/billing; dashboard/search/payments.
Presentation outlines are text, not the existing slide builder.
Keep visitor reading public. Do not merge this branch yet.
