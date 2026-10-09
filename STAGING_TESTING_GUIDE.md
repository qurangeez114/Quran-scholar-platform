# Staging Testing Guide

**Purpose:** Complete end-to-end testing of the accounts feature on staging before production public launch.

**Estimated Time:** 45 minutes total  
**Requirements:** Node.js 18+, npm, Supabase dashboard access, email account

---

## Step 1: Configure Staging Email Authentication (5 minutes)

This must be done manually in the Supabase dashboard. Email will not send without this.

### Manual Dashboard Steps

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt
   - Select **Authentication** → **Providers**

2. **Enable Email Provider:**
   - Find "Email" in the provider list
   - Toggle **ON**
   - Check the box: "Confirm email"
   - Click **Save**

3. **Configure SMTP (Optional for testing):**
   - If you want real emails sent (not just simulated):
   - Go to **Authentication** → **Email Templates** → **SMTP Settings**
   - Configure with your SMTP provider
   - Or use Supabase's built-in email (limited to 100/month)

**Expected Result:** Email provider enabled in Auth section

---

## Step 2: Create Test Users (10 minutes)

Test accounts need to be verified before privacy tests can run.

### Option A: Manual Signup (Recommended)

1. **Open account page:**
   - https://staging.quranhikma.com/account.html
   - Or http://localhost:5000/account.html (if running locally)

2. **Create User A:**
   - Click "Create account"
   - Email: `testuser.a.accounts@gmail.com`
   - Password: `QuranHikmaTest2024!` (min 12 chars)
   - First Name: `Test`
   - Last Name: `User A`
   - Address: `Staging`
   - Click "Create account"

3. **Verify email:**
   - Check email inbox for verification link
   - Click link to verify email
   - You should be redirected back to account page

4. **Create User B:**
   - Repeat with:
     - Email: `testuser.b.accounts@gmail.com`
     - Password: `StagingTest2024!z`
     - First Name: `Test`
     - Last Name: `User B`

### Option B: API Signup (If email is not working)

```bash
# User A signup
curl -X POST https://weegzqzxbqeeokkiifpt.supabase.co/auth/v1/signup \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWd6cXp4YnFlZW9ra2lpZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTI1MDksImV4cCI6MjA4MTE2ODUwOX0.glav1HW9MEEjuae-2Ndq-V0uyyYKrLaJdGwbdxYFArA" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser.a.accounts@gmail.com",
    "password": "QuranHikmaTest2024!"
  }'
```

---

## Step 3: Run Privacy Tests (15 minutes)

This verifies that Row-Level Security (RLS) policies are working correctly.

### Setup

1. **Install dependencies:**
   ```bash
   cd tests
   npm install
   # or if already installed, skip this
   ```

2. **Export test user credentials:**
   ```bash
   # On macOS/Linux:
   export USER_A_EMAIL="testuser.a.accounts@gmail.com"
   export USER_A_PASS="QuranHikmaTest2024!"
   export USER_B_EMAIL="testuser.b.accounts@gmail.com"
   export USER_B_PASS="StagingTest2024!z"

   # On Windows (PowerShell):
   $env:USER_A_EMAIL="testuser.a.accounts@gmail.com"
   $env:USER_A_PASS="QuranHikmaTest2024!"
   $env:USER_B_EMAIL="testuser.b.accounts@gmail.com"
   $env:USER_B_PASS="StagingTest2024!z"
   ```

3. **Run the privacy test:**
   ```bash
   node accounts-privacy-staging.mjs
   ```

### Expected Output

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
```

### What Each Test Means

| Test | Purpose | Security Implication |
|------|---------|---------------------|
| 1. Create research | User A can save data | Users can create records |
| 2. Read own | User A sees own data | RLS allows owner access |
| 3. Read other | User B blocked from A's data | RLS prevents unauthorized read |
| 4. Anon read | Unauthenticated access denied | RLS prevents public access |
| 5. Modify other | User B cannot edit A's data | RLS prevents unauthorized write |
| 6. Delete other | User B cannot remove A's data | RLS prevents unauthorized delete |
| 7. Spoof user_id | User B cannot claim A's identity | Supabase prevents spoofing |
| 8. Data integrity | Original data unchanged | No data corruption |

---

## Step 4: Test Manual Features (10 minutes)

### Account Page Tests

**On Staging:** https://staging.quranhikma.com/account.html

- ✅ Signup with all fields (name, address)
- ✅ Email verification flow
- ✅ Login after verification
- ✅ View account status
- ✅ Logout
- ✅ Password recovery flow
- ✅ Export research

### Research Page Tests

**On Staging:** https://staging.quranhikma.com/my-research.html

After logging in, test:

1. **Save research:**
   - Click "Save privately"
   - Fill type, title, notes
   - Click save → should show in list

2. **Filter research:**
   - Create entries of different types
   - Use "Show" dropdown to filter
   - Verify only selected types appear

3. **Delete research:**
   - Click delete on an entry
   - Verify it's removed

4. **Export research:**
   - Click "Export research" button
   - Verify JSON file downloads with all entries

### Activity History Tests

1. **On any page, click 🕐 button in header**
2. **History tab:**
   - Should show visited pages
   - Times should be formatted correctly
   - Clicking entry should navigate there

3. **Saved tab:**
   - Should be empty (or contain prior saves)
   - Save items from history
   - Verify they appear here

4. **Slides tab:**
   - Add items to presentations
   - Verify they appear

---

## Troubleshooting

### Email Not Sending
- **Check:** SMTP provider is configured correctly
- **Check:** Email templates are enabled in Auth settings
- **Workaround:** Create users directly via API (Option B above)

### Login Fails with 401
- **Check:** Test user was verified via email
- **Check:** Password is exactly as created (case-sensitive)
- **Check:** Email exists in Supabase auth

### Privacy Tests Fail
- **Check:** Both test users are verified
- **Check:** Environment variables are set correctly
- **Check:** Staging database has schema applied (qh_research, qh_profiles tables)

### Missing Records in My Research
- **Check:** Logged in as correct user
- **Check:** Filtering is not hiding them (try "Show: All")

---

## Success Criteria

✅ All privacy tests pass  
✅ Users can signup and verify email  
✅ Users can create and manage research  
✅ Users cannot access other users' data  
✅ Activity history tracks page visits  
✅ Export functionality works  

---

## Next Steps After Testing

1. If all tests pass → Ready for production deployment
2. If tests fail → Debug RLS policies in Supabase dashboard
3. Once audio verification complete → Enable public login
4. Create additional profile fields as needed

---

**Test Environment:**
- Staging URL: https://staging.quranhikma.com
- Local dev URL: http://localhost:5000
- Supabase project: `weegzqzxbqeeokkiifpt`
- Database: PostgreSQL on us-west-2

**Test Users:**
- User A: testuser.a.accounts@gmail.com
- User B: testuser.b.accounts@gmail.com
