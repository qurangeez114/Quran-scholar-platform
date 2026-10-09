# Accounts Testing Action Plan — Getting Actual Results

**Current State:** Staging project configured, code routing to staging client. **Need:** Working preview URL and actual test results.

---

## What's Ready

✅ **Staging Schema** — weegzqzxbqeeokkiifpt project has tables, RLS, indexes  
✅ **Code Routing** — account.js and research.js import client-staging.js  
✅ **Staging Credentials** — Embedded in client-staging.js  
✅ **Production Safe** — All development isolated to staging project  
✅ **Public Login Disabled** — No account feature visible on quranhikma.com yet  

---

## Blockers for Actual Test Results

### 1. Email Authentication (Staging Dashboard)
**Status:** Not configured. Required before signup/verification testing.

**Action:** Go to [Supabase Staging Dashboard](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/providers)
```
Authentication → Providers → Email
- Toggle Email ON
- Check "Confirm email"
- Save
```

### 2. Site URL & Redirect Configuration (Staging Dashboard)
**Status:** Not configured. Required for email verification links.

**Action:** Go to [Staging Auth Settings](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/settings/auth)
```
Authentication → URL Configuration

Site URL: http://localhost:5000 (for local) OR your preview domain

Redirect URLs:
- http://localhost:5000/account.html
- http://localhost:5000/account.html?token_hash=*&type=email_change
- http://localhost:5000/account.html?token_hash=*&type=recovery

(Replace http://localhost:5000 with actual preview domain once deployed)
```

### 3. Account Deletion Function (Staging SQL Editor)
**Status:** Blocked. Requires manual SQL execution.

**Action:** Go to [Staging SQL Editor](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/sql/new)

Run this SQL:
```sql
CREATE FUNCTION public.qh_delete_account() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.qh_research WHERE user_id = auth.uid();
  DELETE FROM public.qh_profiles WHERE user_id = auth.uid();
END $$;

GRANT EXECUTE ON FUNCTION public.qh_delete_account() TO authenticated;
```

Then verify:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'qh_delete_account' AND routine_schema = 'public'
) as function_exists;
```

**Expected:** `function_exists: true`

### 4. Preview Deployment URL (Required)
**Status:** Not deployed. Need actual URL for testing.

**Options:**

**A. Local Development (Immediate Testing)**
```bash
cd /home/claude/qurangeez114/quran-scholar-platform
python3 -m http.server 5000
```
- Visit: http://localhost:5000/account.html
- Email verification will work if Site URL in dashboard is http://localhost:5000
- Only works on your local machine

**B. Netlify Preview (Recommended for Testing)**
1. Push branch to GitHub
2. Netlify automatically creates preview from branch
3. Preview URL: `https://deploy-preview-[PR#]--quranhikma.netlify.app`
4. Set Site URL in Supabase to this domain
5. Shared preview URL for testing on any device

**C. Vercel Preview (Alternative)**
Similar to Netlify, creates automatic preview deploys

Once deployed, set Supabase Site URL to the actual preview domain.

---

## Testing Workflow (Once Above Setup Complete)

### Step 1: Verify Email Configuration Works

1. Go to staging Supabase dashboard
2. Check Authentication → Email Provider is enabled
3. Try sending a test email:
   ```bash
   # In browser console at preview URL:
   const { data, error } = await db.auth.signUp({
     email: 'testuser.a@gmail.com',
     password: 'QuranHikmaTest2024!',
     options: { emailRedirectTo: location.origin + '/account.html' }
   });
   console.log(data, error);
   ```
4. Check email inbox for verification message
5. **Result:** "Email sent successfully" or specific error

### Step 2: Run Authentication Test Flow

**Test: Signup → Email Verification → Login → Recovery → Logout**

```bash
# Start your preview (local or deployed)
# 1. Sign up new account
python3 -m http.server 5000
# Open http://localhost:5000/account.html
# Click "Create account"
# Email: testuser.a.accounts@gmail.com
# Password: QuranHikmaTest2024!
# Status should show: "Check your email for the next step."

# 2. Verify email
# Check email inbox
# Click verification link
# Should redirect to account.html with recovery form visible

# 3. Log in
# Email: testuser.a.accounts@gmail.com
# Password: QuranHikmaTest2024!
# Status should show: "Signed in."
# Page should show email, "My Research" button, "Log out" button

# 4. Test password recovery
# Click "Log out"
# Click "Forgot password"
# Enter email: testuser.a.accounts@gmail.com
# Status: "Check your email for the next step."
# Check recovery email
# Click recovery link
# Enter new password: QuranHikmaTest2024!_recovered
# Status: "Password updated."
# Try logging in with new password

# 5. Logout
# Click "Log out" button
# Status: "Logged out."
```

**Record Results:** Paste actual status messages and any errors

### Step 3: Run Privacy Test Script

**File:** `/home/claude/qurangeez114/quran-scholar-platform/tests/accounts-privacy-staging.mjs`

Prerequisite: Two verified test accounts created via step 2 above

```bash
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

**If test fails:** Paste exact error message and we'll debug

### Step 4: Test Research Management

With User A logged in at preview URL:

```
1. Click "Open My Research"
2. Save three items:
   - Note: "Test note"
   - Bookmark to https://quranhikma.com
   - Presentation outline
3. Filter by each kind
4. Export as JSON (verify all items in file)
5. Delete one item
6. Verify count matches
```

**Record:** Number of items saved/deleted, export file size

### Step 5: Multi-Device Testing

With preview URL deployed:

**Android:**
- Open account.html on mobile
- Sign up, verify email
- Save research item
- Export JSON
- Delete account
- **Record:** Any UI issues, email timing

**Desktop:**
- Repeat all flows
- Open browser DevTools → Network
- **Record:** No errors, all requests to weegzqzxbqeeokkiifpt.supabase.co

---

## Deletion Function Workaround

If deletion function creation is blocked in Supabase, use this workaround:

**Option 1: Manual Dashboard Deletion**
- After testing, go to [Supabase Auth](https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/users)
- Click test user
- Click "Delete user"
- This deletes auth.users row; RLS cascades to qh_profiles/qh_research

**Option 2: Alternative Function** (if SQL blocked)
```javascript
// In account.js, instead of calling RPC:
const {error} = await db.auth.admin.deleteUser(userId);
// But this requires service role key (not exposed in frontend)
```

For now, use Option 1 (manual deletion via dashboard).

---

## Success Criteria

Mark accounts as **verified** when all of these pass:

- [ ] Email configuration enabled in staging
- [ ] Signup creates verification email (received in inbox)
- [ ] Email verification link works (redirects to account.html)
- [ ] Login with verified credentials works
- [ ] "Forgot password" sends recovery email
- [ ] Recovery link resets password
- [ ] Logout clears session
- [ ] Research save (all three kinds) works
- [ ] Research export produces valid JSON with all items
- [ ] Research delete removes item
- [ ] Privacy test passes (User B isolation verified)
- [ ] No console errors on desktop or Android
- [ ] Account deletion works (via function or manual workaround)

---

## Production Release Gates

Once all testing passes:
1. ✓ Accounts fully tested in staging
2. ✓ No blocking issues found
3. ✓ Deletion function works
4. ✗ **Still waiting:** Audio verification complete (separate blocker)

Then:
1. Enable public login on quranhikma.com
2. Merge PR #7 to main
3. Deploy to production with ylosytbxpzxzwfzjpaej project
4. Implement search, owner dashboard, payments

---

## Current Status

| Component | Status | Blocker |
|-----------|--------|---------|
| Staging schema | ✓ Ready | None |
| Code routing to staging | ✓ Ready | None |
| Email auth | ⏳ Blocked | Manual dashboard config |
| Site URL/redirects | ⏳ Blocked | Manual dashboard config |
| Deletion function | ⏳ Blocked | Manual SQL or workaround |
| Preview URL | ⏳ Blocked | Deploy to Netlify/Vercel |
| Auth test results | ⏳ Blocked | Email auth + preview |
| Privacy test results | ⏳ Blocked | Test accounts + function |
| Multi-device testing | ⏳ Blocked | Preview URL + auth working |
| Production release | ⏳ Blocked | Audio verification |

---

## Next Action

1. **You:** Configure email auth + Site URL in staging dashboard (15 min)
2. **You:** Create/execute deletion function SQL (5 min)
3. **You:** Deploy to Netlify or run local http-server
4. **You:** Create test accounts via signup flow
5. **Me:** Run privacy test and provide output
6. **Together:** Test on Android/desktop, report results

Once all above complete: **Accounts marked as verified. Unmerged PR ready for production (after audio verification).**
