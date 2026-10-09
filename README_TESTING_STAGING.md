# QuranHikma Accounts — Staging Testing Ready

**Date:** 2026-10-08  
**Branch:** accounts-private-research (commit daed493)  
**Status:** ✅ Code complete · ✅ Preview server running · ⏳ Email auth pending  

---

## What's Ready Right Now

✅ **Staging Database**
- Project: `weegzqzxbqeeokkiifpt` (isolated from production)
- Schema: qh_profiles and qh_research tables with RLS policies
- Credentials: Only anon key in frontend (no service-role key exposed)

✅ **Frontend Code**
- account.js → routes to staging project via client-staging.js
- research.js → routes to staging project via client-staging.js
- Commit daed493: Both files correctly import client-staging.js

✅ **Local Preview Server**
- Running on http://localhost:5000
- account.html and my-research.html accessible
- All static files served correctly

✅ **Privacy Test Script**
- `tests/accounts-privacy-staging.mjs` ready to run
- Embedded staging credentials and test account details
- Tests RLS isolation: User B cannot read/modify/delete User A's research

✅ **Test Account Credentials**
```
User A: testuser.a.accounts@gmail.com / QuranHikmaTest2024! (15 chars)
User B: testuser.b.accounts@gmail.com / StagingTest2024!z (17 chars)
```

---

## Your Next Steps (Do These Now)

### Step 1: Enable Email Authentication (2 minutes)

Go to: https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/providers

```
Authentication → Providers → Email
- Toggle Email ON
- Check "Confirm email"
- Click Save
```

### Step 2: Configure Site URL & Redirect URLs (2 minutes)

Go to: https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/settings/auth

```
Authentication → URL Configuration

Site URL:
http://localhost:5000

Redirect URLs (all three required):
http://localhost:5000/account.html
http://localhost:5000/account.html?token_hash=*&type=email_change
http://localhost:5000/account.html?token_hash=*&type=recovery

Click Save
```

---

## Then: Create Test Accounts (5 minutes)

### Create User A Account

1. Go to http://localhost:5000/account.html
2. Click "Create account"
3. Email: `testuser.a.accounts@gmail.com`
4. Password: `QuranHikmaTest2024!`
5. Click "Create account"
6. **Expected:** "Check your email for the next step."
7. **Check your email inbox** (including spam folder)
8. Click the verification link in the email
9. **Expected:** Redirects to account.html, password reset form appears
10. Verify complete ✓

### Create User B Account

Repeat the above with:
- Email: `testuser.b.accounts@gmail.com`
- Password: `StagingTest2024!z`

---

## Then: Run the Full Test Workflow

### Test 1: Authentication Flows (5 minutes)

Visit http://localhost:5000/account.html

**Signup:**
```
1. Click "Create account"
2. Email: testuser.a.accounts@gmail.com
3. Password: QuranHikmaTest2024!
4. Click "Create account"
5. Status: "Check your email for the next step."
6. Check email, click verification link
7. Expected: Redirect to account.html + password reset form
```

**Login:**
```
1. After verification, email shows verified ✓
2. Click "Log in" tab
3. Email: testuser.a.accounts@gmail.com
4. Password: QuranHikmaTest2024!
5. Click "Log in"
6. Expected: "Signed in." + page shows email + "Open My Research" button visible
```

**Password Recovery:**
```
1. Click "Log out" → "Logged out."
2. Click "Forgot password"
3. Email: testuser.a.accounts@gmail.com
4. Click "Send recovery email"
5. Expected: "Check your email for the next step."
6. Check email for recovery link
7. Click recovery link
8. Expected: Password reset form appears
9. New password: QuranHikmaTest2024!_recovered
10. Click "Update password"
11. Expected: "Password updated."
12. Log in with new password: QuranHikmaTest2024!_recovered
13. Expected: "Signed in."
```

**Logout:**
```
1. Click "Log out"
2. Expected: "Logged out." + page returns to login form
```

### Test 2: Research Management (5 minutes)

With User A logged in:

```
1. Click "Open My Research"
2. Should navigate to http://localhost:5000/my-research.html

3. Save a Note:
   - Kind: Note
   - Title: Test Note
   - Body: This is a test note
   - Click "Save privately"
   - Expected: "Saved privately." + item appears in list

4. Save a Bookmark:
   - Kind: Bookmark
   - Title: Quran Hikma
   - URL: https://quranhikma.com
   - Body: Great resource
   - Click "Save privately"
   - Expected: Item appears with "Open source" link

5. Save a Presentation:
   - Kind: Presentation outline
   - Title: Hadith Methodology
   - Body: Introduction / Authentication / Classification
   - Click "Save privately"
   - Expected: Item appears in list

6. Test Filter:
   - Filter by "Note" → only note shows
   - Filter by "Bookmark" → only bookmark shows
   - Filter by "Presentation outline" → only presentation shows
   - Filter by "" (all) → all three show

7. Export Research:
   - Click "Export research"
   - Expected: quranhikma-research.json downloads
   - Open JSON file and verify all three items are there

8. Delete an Item:
   - Click "Delete" on one item
   - Confirm dialog
   - Expected: Item removed from list
```

### Test 3: Two-User Privacy Verification (2 minutes)

Open a terminal and run:

```bash
cd /home/claude/qurangeez114/quran-scholar-platform
node tests/accounts-privacy-staging.mjs
```

**Expected output:**
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

**If test fails:** Paste error message for debugging.

---

## Success Checklist

Mark these off as you complete them:

**Preparation:**
- [ ] Enable email auth in staging dashboard (2 min)
- [ ] Configure Site URL & redirects in staging dashboard (2 min)

**Test Accounts:**
- [ ] Create User A (testuser.a.accounts@gmail.com)
- [ ] Verify User A email
- [ ] Create User B (testuser.b.accounts@gmail.com)
- [ ] Verify User B email

**Authentication Testing:**
- [ ] Signup with email verification works
- [ ] Email verification link redirects correctly
- [ ] Login with verified credentials works
- [ ] Password recovery email sends
- [ ] Password recovery link resets password
- [ ] Login with new password works
- [ ] Logout clears session

**Research Management:**
- [ ] Save Note works
- [ ] Save Bookmark works
- [ ] Save Presentation Outline works
- [ ] Research list displays items
- [ ] Filter by kind works (all three types)
- [ ] Export produces valid JSON
- [ ] Delete removes item

**Privacy Verification:**
- [ ] Privacy test runs successfully
- [ ] All 8 privacy checks pass
- [ ] User B cannot read User A's research
- [ ] User B cannot modify User A's research
- [ ] User B cannot delete User A's research
- [ ] User B cannot spoof user_id
- [ ] RLS enforcement verified

**Summary:**
- [ ] All tests pass
- [ ] No console errors
- [ ] Actual results documented
- [ ] Ready to report to team

---

## Reference Files

| File | Purpose |
|------|---------|
| `account.html` | Signup, login, recovery, logout UI |
| `my-research.html` | Research save/list/filter/delete UI |
| `accounts/account.js` | Auth logic (imports client-staging.js) |
| `accounts/research.js` | Research logic (imports client-staging.js) |
| `accounts/client-staging.js` | Staging project config (weegzqzxbqeeokkiifpt) |
| `accounts/client.js` | Production config (unchanged) |
| `accounts/account.css` | Styling |
| `tests/accounts-privacy-staging.mjs` | Two-user RLS isolation test |
| `STAGING_TEST_STATUS.md` | Detailed status and blocker breakdown |
| `ACCOUNTS_TESTING_ACTION_PLAN.md` | Comprehensive action plan |
| `README_TESTING_STAGING.md` | This file |

---

## Preview Server Commands

**Start server (if not already running):**
```bash
cd /home/claude/qurangeez114/quran-scholar-platform
python3 -m http.server 5000
```

**Visit preview:**
- Account page: http://localhost:5000/account.html
- Research page: http://localhost:5000/my-research.html

**Check server status:**
```bash
ps aux | grep "http.server"
```

**Stop server:**
```bash
pkill -f "http.server"
```

---

## Once All Tests Pass

1. Report results (status messages, privacy test output)
2. Confirm no console errors
3. Document any issues or unexpected behavior
4. I will audit results and mark as "verified"
5. Once audio verification complete, PR #7 ready for production

---

## Known Limitations (Phase 1)

**Account deletion:**
- RPC function blocked by Supabase security
- Workaround: Delete via dashboard (Auth → Users → click user → Delete)
- Full function implementation pending security approval

**Public login:**
- Remains disabled (no link from main site)
- Will enable after audio verification complete

**Audio verification:**
- Separate ongoing blocker for production release
- Accounts unverified until all tests pass AND audio complete

---

## Questions?

- **Email not received?** Check spam folder
- **Verification link broken?** Ensure Site URL configured in dashboard
- **Privacy test fails?** Run with -v flag for verbose output, paste error
- **Local server not accessible?** Check port 5000 isn't in use, restart server
- **Password requirements?** Minimum 12 characters required

---

**Status:** Ready for your manual configuration steps. Once email auth and Site URL are set, testing is straightforward. Report results when complete.
