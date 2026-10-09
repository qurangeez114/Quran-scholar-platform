# Staging Test — Preview URL & Remaining Blockers

**Updated:** 2026-10-08  
**Branch:** accounts-private-research (pushed to remote)

---

## ✅ Preview URL Ready

**Netlify Preview:** https://accounts-private-research--fascinating-sunburst-516df8.netlify.app

Visit this URL to access:
- http://accounts-private-research--fascinating-sunburst-516df8.netlify.app/account.html (signup/login)
- http://accounts-private-research--fascinating-sunburst-516df8.netlify.app/my-research.html (research management)

**Note:** Netlify auto-creates branch previews. If URL returns 404 initially, wait 2-3 minutes for build to complete, then refresh.

---

## ✅ Test Credentials Fixed

**Environment Variables (no hardcoded passwords):**
```bash
USER_A_EMAIL="your.email.one@example.com"
USER_A_PASS="YourPassword123!"
USER_B_EMAIL="your.email.two@example.com"
USER_B_PASS="YourPassword456!"
```

**Setup for testing:**
```bash
# Create tests/.env with your actual email addresses and passwords
source tests/.env
node tests/accounts-privacy-staging.mjs
```

Template file: `tests/.env.example` — copy and fill with your test accounts

---

## ⏳ Remaining Blockers

### 1. Email Authentication Configuration (Dashboard Step)

**Status:** Awaiting manual Supabase dashboard configuration

**Action:** https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/providers

```
Authentication → Providers → Email
- Toggle Email ON
- Check "Confirm email"
- Save
```

**Time:** 2 minutes

---

### 2. Site URL & Redirect Configuration (Dashboard Step)

**Status:** Awaiting manual Supabase dashboard configuration

**Action:** https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/settings/auth

```
Authentication → URL Configuration

Site URL: https://accounts-private-research--fascinating-sunburst-516df8.netlify.app

Redirect URLs (all three required):
- https://accounts-private-research--fascinating-sunburst-516df8.netlify.app/account.html
- https://accounts-private-research--fascinating-sunburst-516df8.netlify.app/account.html?token_hash=*&type=email_change
- https://accounts-private-research--fascinating-sunburst-516df8.netlify.app/account.html?token_hash=*&type=recovery

Save
```

**Time:** 2 minutes

---

### 3. Account Deletion Function (Security Blocker)

**Status:** Blocked by Supabase security. Function creation requires dashboard approval.

**SQL to execute manually (Dashboard → SQL Editor):**

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

**Workaround for Testing:** Delete test accounts manually via dashboard after testing:
1. Go to https://supabase.com/dashboard/project/weegzqzxbqeeokkiifpt/auth/users
2. Click test user
3. Click "Delete user"

RLS cascade will remove research/profile data automatically.

---

## Testing Workflow (Once Blockers Resolved)

### Step 1: Configure Dashboard (4 minutes)
1. Enable email auth (2 min)
2. Set Site URL & redirects (2 min)

### Step 2: Create Test Accounts (5 minutes)
1. Visit preview URL above
2. Click "Create account"
3. Use your own email addresses (set in .env)
4. Verify both emails

### Step 3: Run Tests

**Authentication Flow:**
```bash
# Manual testing via preview URL
- Signup → verification email → login → password recovery → logout
# See README_TESTING_STAGING.md for exact steps
```

**Privacy Test:**
```bash
source tests/.env
node tests/accounts-privacy-staging.mjs
```

Expected: `ALL PRIVACY TESTS PASSED ✓`

---

## Files Updated

| File | Change |
|------|--------|
| `tests/accounts-privacy-staging.mjs` | Now reads USER_A_EMAIL, USER_A_PASS, USER_B_EMAIL, USER_B_PASS from env |
| `tests/.env.example` | Template for test credentials |
| `STAGING_BLOCKERS_AND_URL.md` | This file |

---

## Summary

**Ready:**
- ✅ Preview URL: https://accounts-private-research--fascinating-sunburst-516df8.netlify.app
- ✅ Code routing to staging (client-staging.js)
- ✅ Privacy test script (environment-variable based, no hardcoded passwords)
- ✅ Test credential template

**Blocked (manual dashboard steps required):**
- ⏳ Email auth configuration (2 min)
- ⏳ Site URL/redirect configuration (2 min)
- ⏳ Account deletion function (requires security approval from Supabase)

**Next:** Configure email auth and redirects in dashboard, then run full test workflow.
