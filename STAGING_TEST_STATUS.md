# Staging Test Status — Ready for Configuration

**Updated:** 2026-10-08  
**Preview Server:** http://localhost:5000 (running locally)  
**Status:** ✅ Code ready · ✅ Privacy test ready · ⏳ Email auth pending

---

## What's Ready Now

### ✅ Backend
- **Staging Project:** `weegzqzxbqeeokkiifpt` (us-west-2)
- **Schema Applied:** qh_profiles and qh_research tables with RLS policies
- **Isolation:** Separate from production (ylosytbxpzxzwfzjpaej)
- **No Service-Role Keys:** Only anon key in frontend code

### ✅ Frontend Code
- **account.js** → imports `client-staging.js` (routes to weegzqzxbqeeokkiifpt)
- **research.js** → imports `client-staging.js` (routes to weegzqzxbqeeokkiifpt)
- **Commit:** daed493 fixed routing to use staging project
- **HTML Files:** account.html and my-research.html ready
- **No Public Advertising:** Login disabled, not linked from main site

### ✅ Local Preview Server
```bash
# Running on port 5000
python3 -m http.server 5000
```
Visit: **http://localhost:5000/account.html**

### ✅ Privacy Test Script
File: `tests/accounts-privacy-staging.mjs`  
Embedded credentials: ✓ Staging URL and anon key included  
Test accounts: 
- testuser.a.accounts@gmail.com / QuranHikmaTest2024!
- testuser.b.accounts@gmail.com / StagingTest2024!z

Ready to run once test accounts are created.

---

## What's Blocking Actual Tests

### 1. Email Authentication Configuration (Manual Dashboard Step)

**Status:** Not enabled. Signup, email verification, and password recovery won't work until this is done.

**Action:** Go to [Staging Dashboard](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/providers)

```
Authentication → Providers → Email
- Toggle Email ON
- Check "Confirm email"
- Save
```

**Time:** ~2 minutes

---

### 2. Site URL & Redirect Configuration (Manual Dashboard Step)

**Status:** Not configured. Email verification links will be invalid.

**Action:** Go to [Staging Auth Settings](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/settings/auth)

```
Authentication → URL Configuration

Site URL: http://localhost:5000

Redirect URLs (all three required):
- http://localhost:5000/account.html
- http://localhost:5000/account.html?token_hash=*&type=email_change
- http://localhost:5000/account.html?token_hash=*&type=recovery
```

**Time:** ~2 minutes

**Note:** Once deployed to preview domain (Netlify/Vercel), replace `http://localhost:5000` with actual domain.

---

### 3. Test Email Account Creation

**Status:** Manual flow required. Must use real Gmail inbox to receive verification emails.

**Accounts to Create via Signup Flow:**

1. **User A:**
   - Email: testuser.a.accounts@gmail.com
   - Password: QuranHikmaTest2024!
   - Check inbox for verification email

2. **User B:**
   - Email: testuser.b.accounts@gmail.com
   - Password: StagingTest2024!z
   - Check inbox for verification email

**Steps:**
1. Visit http://localhost:5000/account.html
2. Click "Create account"
3. Enter email and password
4. Check email inbox (spam folder if needed)
5. Click verification link in email
6. Verify email redirects to account.html

**Time:** ~5 minutes per account

---

### 4. Account Deletion Function (Optional, Workaround Available)

**Status:** Blocked by Supabase security review. 

**Option A — Manual Deletion (Tested Workaround):**
- Go to [Staging Users](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/users)
- Click test user
- Click "Delete user"
- Auth user deleted; RLS cascades to profiles/research

**Option B — Execute SQL (Requires Dashboard)**
- Go to [SQL Editor](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/sql/new)
- Execute provided function creation SQL
- Function creates successfully or requires security approval

**For Testing:** Option A (manual deletion) is sufficient; deletion tests will use workaround.

---

## Testing Workflow Once Above Ready

### Phase 1: Verify Email Works (5 min)

1. Email auth enabled (Step 1 above)
2. Site URL configured (Step 2 above)
3. Go to http://localhost:5000/account.html
4. Click "Create account"
5. Enter testuser.a.accounts@gmail.com / QuranHikmaTest2024!
6. Click "Create account"
7. **Expected:** Status message "Check your email for the next step."
8. Check email inbox
9. **Expected:** Verification email received

### Phase 2: Full Authentication Flow (10 min)

```bash
# 1. Sign up with User A
# Go to http://localhost:5000/account.html
# Click "Create account"
# Email: testuser.a.accounts@gmail.com
# Password: QuranHikmaTest2024!
# Status: "Check your email for the next step."

# 2. Verify email
# Check inbox for verification link
# Click link → redirects to account.html
# Status: "Password updated." (recovery flow auto-triggered)

# 3. Log in with User A
# Email: testuser.a.accounts@gmail.com
# Password: QuranHikmaTest2024!
# Status: "Signed in."
# Page shows email, "My Research" button, "Log out" button

# 4. Test password recovery
# Click "Log out" → Status: "Logged out."
# Click "Forgot password"
# Email: testuser.a.accounts@gmail.com
# Click "Send recovery email"
# Status: "Check your email for the next step."
# Check email for recovery link
# Click recovery link → Password reset form appears
# New password: QuranHikmaTest2024!_recovered
# Click "Update password"
# Status: "Password updated."

# 5. Log in with recovered password
# Email: testuser.a.accounts@gmail.com
# Password: QuranHikmaTest2024!_recovered
# Status: "Signed in."

# 6. Logout
# Click "Log out"
# Status: "Logged out."
```

**Record:** All status messages

### Phase 3: Research Management (5 min)

With User A logged in:

```bash
# 1. Click "Open My Research"
# Navigate to http://localhost:5000/my-research.html

# 2. Save Note
# Kind: Note
# Title: Test Note
# Body: This is a test note for privacy verification
# Click "Save privately"
# Status: "Saved privately."
# Item appears in list

# 3. Save Bookmark
# Kind: Bookmark
# Title: Quran Hikma
# URL: https://quranhikma.com
# Body: Great resource for Quranic scholarship
# Click "Save privately"
# Status: "Saved privately."

# 4. Save Presentation Outline
# Kind: Presentation outline
# Title: Hadith Methodology
# Body: Introduction to hadith / Authentication criteria / Classification systems
# Click "Save privately"

# 5. Filter by kind
# Filter: "note" → only test note shows
# Filter: "bookmark" → only Quran Hikma shows
# Filter: "presentation" → only hadith outline shows
# Filter: "" (all) → all three show

# 6. Export research
# Click "Export research"
# Download quranhikma-research.json
# Verify JSON contains all three items

# 7. Delete one item
# Click "Delete" on test note
# Confirm dialog
# Item removed from list
```

**Record:** Number of items saved/exported, export file size, deletion confirmed

### Phase 4: Two-User Privacy Test (5 min)

Prerequisites:
- Both User A and User B created via signup flow (Phase 1)
- Both emails verified
- Both accounts logged in and can access research

```bash
# Ensure both test users are verified and can log in
# Then run privacy test:

node tests/accounts-privacy-staging.mjs
```

**Expected Output:**
```
Starting privacy tests...

Logging in User A...
✓ User A logged in (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

Logging in User B...
✓ User B logged in (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

✓ Users have different IDs

Test 1: User A creates research...
✓ User A created research (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

Test 2: User A can read own research...
✓ User A can read own research

Test 3: User B cannot read User A's research...
✓ User B cannot read User A's research

Test 4: Anon user cannot read research...
✓ Anon user cannot read research

Test 5: User B cannot modify User A's research...
✓ User B cannot modify User A's research

Test 6: User B cannot delete User A's research...
✓ User B cannot delete User A's research

Test 7: User B cannot create research with User A's user_id...
✓ User B cannot spoof user_id

Test 8: Verifying data integrity...
✓ Data remains intact and unchanged

═══════════════════════════════════════════
ALL PRIVACY TESTS PASSED ✓
═══════════════════════════════════════════

Cleaning up test data...
✓ Test data deleted
```

**If test fails:** Paste exact error message for debugging.

---

## Next Steps for User

1. **Enable Email Auth** (2 min)
   - Go to staging dashboard → Authentication → Providers → Email
   - Toggle ON, check "Confirm email", Save

2. **Configure Site URL & Redirects** (2 min)
   - Go to staging dashboard → Authentication → URL Configuration
   - Set Site URL to http://localhost:5000
   - Add three redirect URLs (see above)

3. **Create Test Accounts** (5 min)
   - Visit http://localhost:5000/account.html
   - Sign up with User A email/password
   - Check email, click verification link
   - Repeat for User B

4. **Run Tests** (15 min total)
   - Phase 1: Verify email works (signup, verification)
   - Phase 2: Full auth flow (login, recovery, logout)
   - Phase 3: Research management (save, list, filter, delete, export)
   - Phase 4: Privacy test (node tests/accounts-privacy-staging.mjs)

5. **Report Results**
   - Paste actual status messages from each phase
   - Paste privacy test output
   - Report any errors or failures

---

## Success Criteria

All of these must pass:

- [ ] Email signup sends verification email
- [ ] Email verification link works and redirects to account.html
- [ ] Login with verified credentials works
- [ ] "Forgot password" sends recovery email
- [ ] Recovery link resets password correctly
- [ ] Logout clears session
- [ ] Research save (note, bookmark, presentation) works
- [ ] Research list shows all items
- [ ] Research filter by kind works
- [ ] Research export produces valid JSON
- [ ] Research delete removes item
- [ ] Privacy test passes (User B isolation verified)
- [ ] No console errors on browser DevTools

---

## Known Limitations

1. **Account deletion function** — Blocked by Supabase security
   - Workaround: Manual deletion via dashboard Users interface
   - Test will demonstrate workaround

2. **Public login** — Remains disabled
   - account.html accessible only via direct URL
   - Not advertised on main site
   - Will enable after audio verification complete

3. **Audio verification** — Separate ongoing blocker for production release

---

## Preview URL for Deployment

Once local testing passes, deploy to preview:

**Option A — Netlify (Recommended)**
1. Push branch to GitHub
2. Netlify creates preview: https://deploy-preview-[PR#]--quranhikma.netlify.app
3. Update Supabase Site URL to this domain
4. All email verification links use preview domain

**Option B — Vercel**
1. Similar auto-preview deployment
2. Set Site URL to Vercel preview domain

**Option C — Local (Current)**
- Keep http://localhost:5000 in Site URL
- Testing only on your machine

---

## Files Reference

- `account.html` — Auth UI (signup, login, recovery, logout)
- `my-research.html` — Research management UI
- `accounts/account.js` — Auth logic (imports client-staging.js)
- `accounts/research.js` — Research logic (imports client-staging.js)
- `accounts/client-staging.js` — Staging Supabase config (weegzqzxbqeeokkiifpt)
- `tests/accounts-privacy-staging.mjs` — Two-user RLS isolation test
- `ACCOUNTS_TESTING_ACTION_PLAN.md` — Detailed action plan with all steps
- `STAGING_TEST_STATUS.md` — This file

---

## Current Status Summary

| Component | Status | Blocker |
|-----------|--------|---------|
| Staging project | ✅ Ready | None |
| Schema applied | ✅ Ready | None |
| Code routing to staging | ✅ Ready | None |
| Local preview server | ✅ Running | None |
| Email auth config | ⏳ Pending | Manual dashboard step |
| Site URL/redirects | ⏳ Pending | Manual dashboard step |
| Test accounts | ⏳ Pending | Email auth + signup flow |
| Auth flow testing | ⏳ Pending | Email auth + test accounts |
| Privacy test | ✅ Ready | Test accounts created |
| Account deletion workaround | ✅ Ready | None |
| Production release | ⏳ Blocked | Audio verification |

**Next action:** Configure email auth in dashboard → create test accounts → run full test workflow
