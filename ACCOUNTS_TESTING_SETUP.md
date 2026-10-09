# Accounts Testing Setup — Staging Configuration

**Status:** Staging schema applied, deletion function requires manual dashboard setup, ready for testing

---

## Test Accounts (Use These Exact Credentials)

**Test User A:**
```
Email: testuser.a.accounts@gmail.com
Password: QuranHikmaTest2024!
(15 chars, meets 12-char minimum)
```

**Test User B:**
```
Email: testuser.b.accounts@gmail.com
Password: StagingTest2024!z
(17 chars, meets 12-char minimum)
```

These must be real Gmail accounts (or accounts with real inboxes) to receive email verification links.

---

## Staging Project Details

| Setting | Value |
|---------|-------|
| **Project ID** | weegzqzxbqeeokkiifpt |
| **Region** | us-west-2 |
| **Project URL** | https://weegzqzxbqeeokkiifpt.supabase.co |
| **Anon Key** | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWd6cXp4YnFlZW9ra2lpZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTI1MDksImV4cCI6MjA4MTE2ODUwOX0.glav1HW9MEEjuae-2Ndq-V0uyyYKrLaJdGwbdxYFArA |

**Client Config Location:**
- `/accounts/client-staging.js` — Contains staging credentials

---

## Manual Setup Required in Supabase Dashboard

Before testing email flows, configure staging project:

**Link:** https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/providers

1. **Enable Email Provider**
   ```
   Authentication → Providers → Email
   - Toggle ON
   - Check "Confirm email"
   - Save
   ```

2. **Configure Site URL & Redirects**
   ```
   Authentication → URL Configuration
   
   Site URL: http://localhost:5000
   
   Redirect URLs:
   - http://localhost:5000/account.html
   - http://localhost:5000/account.html?token_hash=*&type=email_change
   - http://localhost:5000/account.html?token_hash=*&type=recovery
   ```

3. **Configure SMTP (Test Mode)**
   ```
   Authentication → Email Templates → SMTP Settings
   Use default test SMTP (no action needed for development)
   ```

---

## Testing Workflow

### Step 1: Start Local Server

```bash
cd /home/claude/qurangeez114/quran-scholar-platform
python3 -m http.server 5000
```

Then visit: **http://localhost:5000/account.html**

### Step 2: Switch to Staging Client

Edit `account.html` to use staging client:

**Current (production):**
```html
<script type="module" src="/accounts/account.js"></script>
```

The `account.js` imports from `client.js`. Create a wrapper or temporarily modify the import to use `client-staging.js`:

**Temporary for testing:**
Edit `/accounts/account.js` line 1:
```javascript
import {db,message,exportResearch} from './client-staging.js';
```

(Remember to revert to `client.js` after testing)

### Step 3: Test Authentication Flows

#### 3a. Sign Up (Test User A)

1. Open http://localhost:5000/account.html
2. Click "Create account"
3. Enter email: `testuser.a.accounts@gmail.com`
4. Enter password: `QuranHikmaTest2024!`
5. Click "Create account"
6. Check for status message: "Check your email for the next step."

**Expected:** Email sent to inbox (check spam folder)

#### 3b. Email Verification

1. Check email inbox for verification message
2. Copy the verification link from email
3. Paste link into browser address bar
4. Should redirect to account.html with recovery mode active
5. Confirmation message should appear

**Expected:** "Password updated." or similar confirmation

#### 3c. Log In

1. Return to http://localhost:5000/account.html
2. Click "Log in" (default tab)
3. Enter email: `testuser.a.accounts@gmail.com`
4. Enter password: `QuranHikmaTest2024!`
5. Click "Log in"

**Expected:** 
- Status: "Signed in."
- UI changes to show "Signed in" section
- Displays email address
- Shows "My Research" button
- Shows "Log out" and account settings

#### 3d. Password Recovery

1. Click "Forgot password"
2. Enter email: `testuser.a.accounts@gmail.com`
3. Click "Send recovery email"

**Expected:** Status: "Check your email for the next step."

1. Check email for recovery link
2. Click recovery link in email
3. Should show password reset form
4. Enter new password: `QuranHikmaTest2024!_recovered`
5. Click "Update password"

**Expected:** "Password updated." confirmation

#### 3e. Log Out

1. Click "Log out" button
2. Page should return to login form

**Expected:** Status: "Logged out." and UI returns to "Signed out" section

#### 3f. Repeat for Test User B

Repeat all steps 3a-3e with:
- Email: `testuser.b.accounts@gmail.com`
- Password: `StagingTest2024!z`

---

### Step 4: Test Research Management (Logged In)

With User A logged in:

1. Click "Open My Research" button
2. Should navigate to http://localhost:5000/my-research.html

#### 4a. Save Note
```
Type: Note
Title: Test Note
Notes: This is a test note for privacy verification
Click "Save privately"
```

**Expected:** Status message "Saved privately." and item appears in list

#### 4b. Save Bookmark
```
Type: Bookmark
Title: Quran Hikma
Source link: https://quranhikma.com
Notes: Great resource for Quranic scholarship
Click "Save privately"
```

**Expected:** Item appears in list with "Open source" link

#### 4c. Save Presentation Outline
```
Type: Presentation outline
Title: Hadith Methodology
Notes:
- Introduction to hadith
- Authentication criteria
- Classification systems
Click "Save privately"
```

**Expected:** Item appears in list

#### 4d. Filter Research
- Filter by "note" — should show only test note
- Filter by "bookmark" — should show only Quran Hikma
- Filter by "presentation" — should show only hadith outline
- Filter by "" (all) — should show all three

#### 4e. Export Research
- Click "Export research"
- Should download `quranhikma-research.json`
- Verify JSON contains all three saved items

**Expected JSON structure:**
```json
[
  {
    "id": "uuid",
    "user_id": "user_a_uuid",
    "kind": "note",
    "title": "Test Note",
    "body": "This is a test note for privacy verification",
    "url": null,
    "data": {},
    "created_at": "2026-10-08T...",
    "updated_at": "2026-10-08T..."
  },
  // ... more items
]
```

#### 4f. Delete Research
- Click "Delete" on test note
- Confirm deletion in dialog

**Expected:** Note removed from list, status: "Saved privately." (from next save if any)

---

### Step 5: Two-User Privacy Test

Create test file: `/home/claude/qurangeez114/quran-scholar-platform/tests/accounts-privacy-staging.mjs`

```javascript
// Run against staging with two verified test users
import assert from 'node:assert/strict';

const base = 'https://weegzqzxbqeeokkiifpt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWd6cXp4YnFlZW9ra2lpZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTI1MDksImV4cCI6MjA4MTE2ODUwOX0.glav1HW9MEEjuae-2Ndq-V0uyyYKrLaJdGwbdxYFArA';

const userA = {
  email: 'testuser.a.accounts@gmail.com',
  password: 'QuranHikmaTest2024!'
};

const userB = {
  email: 'testuser.b.accounts@gmail.com',
  password: 'StagingTest2024!z'
};

async function login(email, password) {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  const d = await r.json();
  if (!r.ok) {
    console.error('Login failed:', d);
    throw new Error(`Login failed for ${email}: ${d.error_description || d.message}`);
  }
  return d;
}

async function api(token, path, method = 'GET', body) {
  const r = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return {
    status: r.status,
    data: await r.json().catch(() => null)
  };
}

async function runTests() {
  console.log('Starting privacy tests...\n');
  
  // Login both users
  console.log('Logging in User A...');
  const a = await login(userA.email, userA.password);
  console.log(`✓ User A logged in (ID: ${a.user.id})\n`);
  
  console.log('Logging in User B...');
  const b = await login(userB.email, userB.password);
  console.log(`✓ User B logged in (ID: ${b.user.id})\n`);
  
  assert.notEqual(a.user.id, b.user.id, 'Users should have different IDs');
  console.log('✓ Users have different IDs\n');
  
  let researchId;
  
  try {
    // Test 1: User A creates research
    console.log('Test 1: User A creates research...');
    const created = await api(
      a.access_token,
      'qh_research',
      'POST',
      {
        user_id: a.user.id,
        kind: 'note',
        title: 'Privacy Test',
        body: 'Private marker'
      }
    );
    assert.equal(created.status, 201, `Expected 201, got ${created.status}`);
    researchId = created.data[0].id;
    console.log(`✓ User A created research (ID: ${researchId})\n`);
    
    // Test 2: User A can read own research
    console.log('Test 2: User A can read own research...');
    const ownRead = await api(a.access_token, `qh_research?id=eq.${researchId}`);
    assert.equal(ownRead.data.length, 1, 'User A should see own research');
    console.log('✓ User A can read own research\n');
    
    // Test 3: User B cannot read User A's research
    console.log('Test 3: User B cannot read User A\'s research...');
    const otherRead = await api(b.access_token, `qh_research?id=eq.${researchId}`);
    assert.equal(otherRead.data.length, 0, 'User B should NOT see User A research');
    console.log('✓ User B cannot read User A\'s research\n');
    
    // Test 4: Anon cannot read research
    console.log('Test 4: Anon user cannot read research...');
    const anonRead = await api(key, `qh_research?id=eq.${researchId}`);
    assert(anonRead.status >= 400 || anonRead.data.length === 0, 'Anon should not access');
    console.log('✓ Anon user cannot read research\n');
    
    // Test 5: User B cannot modify User A's research
    console.log('Test 5: User B cannot modify User A\'s research...');
    const modify = await api(
      b.access_token,
      `qh_research?id=eq.${researchId}`,
      'PATCH',
      { body: 'Changed' }
    );
    assert(modify.status >= 400 || modify.data.length === 0, 'User B should not modify');
    console.log('✓ User B cannot modify User A\'s research\n');
    
    // Test 6: User B cannot delete User A's research
    console.log('Test 6: User B cannot delete User A\'s research...');
    const deleteAttempt = await api(
      b.access_token,
      `qh_research?id=eq.${researchId}`,
      'DELETE'
    );
    assert(deleteAttempt.status >= 400 || deleteAttempt.data.length === 0, 'User B should not delete');
    console.log('✓ User B cannot delete User A\'s research\n');
    
    // Test 7: User B cannot spoof user_id
    console.log('Test 7: User B cannot create research with User A\'s user_id...');
    const spoof = await api(
      b.access_token,
      'qh_research',
      'POST',
      { user_id: a.user.id, kind: 'note', body: 'Spoof' }
    );
    assert(spoof.status >= 400, 'User B should not be able to spoof');
    console.log('✓ User B cannot spoof user_id\n');
    
    // Test 8: Verify data still intact
    console.log('Test 8: Verifying data integrity...');
    const intact = await api(a.access_token, `qh_research?id=eq.${researchId}`);
    assert.equal(intact.data[0].body, 'Private marker', 'Data should be unchanged');
    console.log('✓ Data remains intact and unchanged\n');
    
    console.log('═══════════════════════════════════════════');
    console.log('ALL PRIVACY TESTS PASSED ✓');
    console.log('═══════════════════════════════════════════\n');
    
  } finally {
    // Cleanup
    if (researchId) {
      console.log('Cleaning up test data...');
      await api(a.access_token, `qh_research?id=eq.${researchId}`, 'DELETE');
      console.log('✓ Test data deleted\n');
    }
  }
}

// Run tests
runTests().catch(err => {
  console.error('TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
```

**Run the test:**
```bash
cd /home/claude/qurangeez114/quran-scholar-platform
node tests/accounts-privacy-staging.mjs
```

---

## Known Limitations (Current Phase)

1. **Account Deletion Function** - Requires manual dashboard SQL execution
   - SQL needed: See ACCOUNTS_TESTING_SETUP.md "Manual Dashboard Setup" section
   - Workaround: Delete test accounts via dashboard after testing
   - Full deletion includes: profile, research, auth user

2. **Email Configuration** - Manual dashboard setup required
   - See "Manual Setup Required" section above
   - Test SMTP mode is sufficient for development

3. **Public Login** - Remains disabled
   - account.html accessible only via direct link
   - Not advertised on main site

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Please log in to continue" | User not authenticated | Visit account.html and sign in |
| Email verification link broken | Site URL not configured | Set Site URL in dashboard |
| Research won't save | Form validation error | Check title/body length limits |
| Privacy test fails | RLS policy issue | Verify research_own policy exists |
| Deletion fails | Function not created | Create qh_delete_account() in dashboard |

---

## Files Ready for Testing

- `account.html` — Auth UI
- `accounts/account.js` — Auth logic (modify import to use client-staging.js)
- `my-research.html` — Research management
- `accounts/research.js` — Research logic
- `accounts/client-staging.js` — Staging Supabase credentials
- `tests/accounts-privacy-staging.mjs` — Two-user privacy test (create from template above)

---

## Success Criteria

All of the following must pass before marking accounts as verified:

- [ ] Sign up with email verification
- [ ] Email verification link works
- [ ] Login with verified credentials
- [ ] Password recovery email flow
- [ ] Password reset from recovery link
- [ ] Logout clears session
- [ ] Research save (note, bookmark, presentation)
- [ ] Research list and filter by kind
- [ ] Research export as JSON
- [ ] Research delete removes item
- [ ] User B cannot read User A's research
- [ ] User B cannot modify User A's research
- [ ] User B cannot delete User A's research
- [ ] RLS enforcement verified at API level
- [ ] Account deletion function works (once manually created)
- [ ] Tests on Android and desktop show no issues
- [ ] Audio playback and verse matching verified

---

## Production Blockers

- [ ] All above tests PASS
- [ ] Account deletion function implemented and tested
- [ ] Email auth fully configured in dashboard
- [ ] All audio verification COMPLETE (separate blocker)
- [ ] No security issues found during audit

**Once all pass:** Enable public login, then proceed to search, owner dashboard, and payments.
