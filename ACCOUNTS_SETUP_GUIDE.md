# Accounts Implementation Setup & Testing Guide

**Branch:** `accounts-private-research`  
**Status:** Schema applied, code complete, ready for testing  
**Production Deployment:** BLOCKED until all audio is completed and verified

## What's Been Completed ✓

### Database Schema (Applied)
- ✓ Created `qh_profiles` table (user_id, display_name, created_at)
- ✓ Created `qh_research` table (id, user_id, kind, title, body, url, data, timestamps)
- ✓ Applied Row Level Security (RLS) policies:
  - `profiles_own`: Users can only read/write their own profile
  - `research_own`: Users can only read/write their own research
- ✓ Created index: `qh_research(user_id, kind, updated_at DESC)`
- ✓ Created trigger: `qh_touch_research()` for auto-updating `updated_at`
- ⚠ **Pending:** `qh_delete_account()` function (blocked by Supabase security review—requires manual approval or alternative approach)

### Frontend Implementation (Complete)
- ✓ **account.html** + **account.js**: Sign up, log in, password recovery, logout, account deletion, research export
- ✓ **my-research.html** + **research.js**: Save private notes/bookmarks/presentations, list, filter, delete
- ✓ **accounts/client.js**: Supabase client initialization with correct project credentials
- ✓ **accounts/account.css**: Styling for auth and research pages
- ✓ All HTML files use textContent (XSS safe) and allow only HTTP(S) source links

### Testing Infrastructure (Ready)
- ✓ **tests/accounts-privacy.mjs**: Two-user isolation test (Node 18+, no dependencies)
  - Tests that User A cannot read/modify/delete/assign User B's research
  - Verifies RLS enforcement at REST API level
  - Requires: SUPABASE_URL, SUPABASE_ANON_KEY, USER_A_EMAIL, USER_A_PASS, USER_B_EMAIL, USER_B_PASS

### Client Configuration
- ✓ Project: `ylosytbxpzxzwfzjpaej` (us-east-1)
- ✓ Database: PostgreSQL 17.6.1.104
- ✓ Anon Key: Already configured in `accounts/client.js` (NOT service-role)

---

## Setup Required (Manual Dashboard Configuration)

### 1. Enable Email Authentication

1. Go to [Supabase Dashboard → ylosytbxpzxzwfzjpaej](https://supabase.com/dashboard/project/ylosytbxpzxzwfzjpaej/auth/providers)
2. Click **Authentication → Providers → Email**
3. Toggle **Email** provider to **ON**
4. Check the box: **Confirm email** (users must verify email before signing in)
5. Save

### 2. Configure Site URL & Redirect URLs

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to one of:
   - **Local testing:** `http://localhost:5000` (adjust port to your dev server)
   - **Preview/Staging:** Your deployment URL (e.g., Netlify, Vercel preview domain)
   - **Production:** `https://quranhikma.com` (confirm your actual domain)

3. Add **Redirect URLs** (all required for email flows):
   - `http://localhost:5000/account.html`
   - `http://localhost:5000/account.html?token_hash=*&type=email_change`
   - `http://localhost:5000/account.html?token_hash=*&type=recovery`
   - (Replace `localhost:5000` with your actual domain/port above)

### 3. Configure SMTP (Email Delivery)

Choose one approach:

#### Option A: Supabase Test SMTP (Development)
- No additional configuration needed
- Emails only work for addresses already in your `auth.users` table
- Use for local testing only

#### Option B: Real SMTP (Production)
1. Go to **Authentication → Email Templates**
2. Under SMTP Settings:
   - **SMTP Host:** (e.g., `smtp.sendgrid.net`, `smtp.mailgun.org`, or your own)
   - **SMTP Port:** Usually 587 (TLS) or 465 (SSL)
   - **Username:** SMTP username
   - **Password:** SMTP password
   - **From Email:** `noreply@quranhikma.com` (or your domain)
3. Save

**Recommended providers for production:**
- SendGrid (free tier available)
- Mailgun
- AWS SES
- Your own mail server

### 4. (Optional) Customize Email Templates

Go to **Authentication → Email Templates** and customize:
- **Confirm signup** – Subject and body of verification email
- **Reset password** – Subject and body of recovery email
- Ensure links point to your Site URL with the `token_hash` parameter

---

## Testing Workflow

### Phase 1: Local Testing (Before Dashboard Config)

```bash
# Start a local dev server to serve the HTML files
# Example: Simple HTTP server or your build tool
python3 -m http.server 5000

# Or with Node:
npx http-server -p 5000
```

Visit `http://localhost:5000/account.html` in your browser.

### Phase 2: After Dashboard Configuration

#### 2a. Create Test Users (Manual)

1. Open `http://localhost:5000/account.html` (or your preview domain)
2. Click "Create account"
3. Sign up as **User A** with email `testa@example.com`, password `testpassword123`
4. Check email inbox for verification link
5. Click the verification link (redirects to account.html)
6. Log in as User A
7. Repeat for **User B** with `testb@example.com`

#### 2b. Test Authentication Flows

From `account.html`:
- [ ] Sign up (email verification required)
- [ ] Email verification link works
- [ ] Log in with verified email
- [ ] Forgot password → email recovery link
- [ ] Set new password via recovery link
- [ ] Log out

#### 2c. Test Research Saving

From `my-research.html` (while logged in):
- [ ] Save a note with title and body
- [ ] Save a bookmark with URL
- [ ] Save a presentation outline
- [ ] View all saved items (list displays correctly)
- [ ] Filter by kind (note, bookmark, presentation)
- [ ] Edit a saved item
- [ ] Delete a saved item
- [ ] Export research as JSON (should download `quranhikma-research.json`)

#### 2d. Test Account Management

From `account.html` (while logged in):
- [ ] View logged-in section with email address
- [ ] Open "My Research" button
- [ ] Export research
- [ ] Click "Delete account permanently"
- [ ] Type "DELETE" to confirm
- [ ] Account deleted (user logged out, cannot log back in with same email)

### Phase 3: Privacy & Security Test

Run the Node.js privacy test (requires two verified test users created above):

```bash
# Set environment variables for test users
export SUPABASE_URL="https://ylosytbxpzxzwfzjpaej.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs"
export USER_A_EMAIL="testa@example.com"
export USER_A_PASS="testpassword123"
export USER_B_EMAIL="testb@example.com"
export USER_B_PASS="testpassword123"

# Run the test (Node 18+)
node tests/accounts-privacy.mjs
```

Expected output:
```
ALL PRIVACY TESTS PASSED
```

This test verifies:
- ✓ User A can create and read their own research
- ✓ User B cannot read User A's research
- ✓ User B cannot modify User A's research (PATCH rejected)
- ✓ User B cannot delete User A's research (DELETE rejected)
- ✓ User B cannot transfer User A's research to themselves
- ✓ Anon key (unauthenticated) cannot read any research
- ✓ Anon key cannot create research with someone else's user_id

---

## Known Limitations (Phase 1)

1. **Account Deletion Function** – `qh_delete_account()` RPC pending security review
   - Workaround: Use Supabase dashboard → Auth → Users to manually delete test accounts
   - Alternate: Implement deletion through standard Supabase Auth deletion API once approved

2. **Research Editing** – Currently only save & delete implemented
   - Add PATCH support in `research.js` if needed

3. **Device History Sync** – Not yet implemented
   - Requires import UI to sync existing browser history/bookmarks with account

4. **Profiles & Preferences** – Not yet implemented
   - `qh_profiles` table exists but no UI for editing display_name

5. **Presentation Builder** – Currently text outlines only
   - Outlines stored as plain text in `qh_research` with `kind='presentation'`
   - Real slide builder integration pending

---

## Preview Deployment URL

Once you have a preview/staging URL (e.g., Netlify, Vercel, or your own server):

1. Update **Authentication → URL Configuration** in Supabase dashboard:
   - Change Site URL to: `https://your-preview-domain.com`
   - Update Redirect URLs to use your preview domain

2. No code changes needed—`accounts/client.js` already points to the production Supabase project

---

## Troubleshooting

### "Please log in to continue" error
- User is not authenticated. Visit `account.html` to sign up or log in.

### Email verification link doesn't work
- Check that Redirect URLs in Supabase dashboard include your current domain
- Verify Site URL is set correctly
- Check email spam folder
- Test with SMTP configuration (test mode may not send real emails)

### "Test login failed"
- User email is not verified, or
- Password is incorrect, or
- SUPABASE_URL or SUPABASE_ANON_KEY environment variable is wrong

### Research won't save
- User not logged in (check account.html)
- Form validation error (title required, max 500 chars; body max 100,000 chars)
- Check browser console for API errors

### Delete account returns error
- `qh_delete_account()` function not yet approved—use manual deletion for testing
- Ensure user is logged in and has at least one research item

---

## Next Steps Before Production

1. ✓ Apply database schema to production project
2. ⚠ Fix/approve `qh_delete_account()` RPC function
3. ⏳ Configure Supabase email auth (dashboard)
4. ⏳ Create preview deployment URL
5. ⏳ Run full testing workflow (signup, email, login, research, delete)
6. ⏳ Run privacy test with two users
7. ⏳ Fix any failures and re-test
8. ✓ Code is ready to commit to `accounts-private-research` branch
9. ⏳ Merge to main once all audio is completed and verified

---

## Files in This Implementation

| File | Purpose | Status |
|------|---------|--------|
| `supabase/accounts/001_accounts.sql` | Database schema & RLS | ✓ Applied |
| `accounts/client.js` | Supabase client config | ✓ Complete |
| `account.html` | Auth UI (signup, login, recovery, logout, delete) | ✓ Complete |
| `accounts/account.js` | Auth logic | ✓ Complete |
| `accounts/account.css` | Auth styling | ✓ Complete |
| `my-research.html` | Research list/save UI | ✓ Complete |
| `accounts/research.js` | Research CRUD logic | ✓ Complete |
| `tests/accounts-privacy.mjs` | RLS isolation test | ✓ Ready |
| `supabase/accounts/README.md` | Original implementation notes | ✓ Reference |

---

## Contact & Support

For questions on RLS isolation, research API, or authentication flow, see:
- Supabase docs: https://supabase.com/docs/guides/auth
- Row-Level Security: https://supabase.com/docs/guides/auth/row-level-security
