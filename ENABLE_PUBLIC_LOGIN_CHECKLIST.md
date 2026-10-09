# Enable Public Login Checklist

**For:** QuranHikma Production  
**When:** After audio verification is approved  
**Time Required:** 10 minutes  
**Approval Required:** Audio verification team signoff

---

## Pre-Flight Checklist

Before enabling public login, verify:

- [ ] Audio verification is complete and approved
- [ ] All privacy tests passed on staging
- [ ] Account feature tested with real users on production
- [ ] No bugs reported on accounts feature
- [ ] Email authentication is working (test reset password flow)

---

## Step 1: Disable Login Gate (Immediate)

**Current State:** account-gate.js exists but is empty  
**Action:** Update or remove the gate logic

### Option A: Remove Gate Entirely

```bash
# Edit account-gate.js
rm accounts/account-gate.js

# Or just make it a no-op (current state is fine):
# File: accounts/account-gate.js
# (stays empty - it's already disabled)
```

**Current code already supports this.** The gate file loads but doesn't actually block anything.

---

## Step 2: Update Homepage Links

**Location:** index.html (main page navigation)

Find the header/navigation section and uncomment the account link:

```html
<!-- BEFORE (hidden login) -->
<!-- <a href="/account.html">Your account</a> -->

<!-- AFTER (public login) -->
<a href="/account.html">Your account</a>
```

Also add call-to-action button on homepage:

```html
<section id="cta">
  <h2>Save your research in the cloud</h2>
  <p>Create an account to sync across devices and export your work.</p>
  <a href="/account.html" class="button">Create account</a>
</section>
```

---

## Step 3: Update Navigation Components

**Files to check:**
- `site-chrome.js` - Check for any hidden navigation items
- `header.html` or header component - Uncomment account links
- Navigation dropdowns - Add "Sign In" option if present

---

## Step 4: Prepare Email Configuration

**Status:** Check if SMTP is fully configured

### Verify Email Settings

```bash
# Check Supabase email configuration
# Go to Dashboard: Auth → Email Templates
# Verify sender email is configured
# Verify email templates are in place (welcome, verify, reset)
```

**Expected email flows:**
1. Signup → verification email
2. Forgot password → reset email
3. Email confirmation → welcome message

---

## Step 5: Deploy Changes

### Git Commit

```bash
cd /path/to/Quran-scholar-platform

# Stage changes
git add index.html site-chrome.js [any other files changed]

# Commit
git commit -m "Enable public login for accounts feature (audio verification approved)"

# Push to main
git push origin main
```

### Verify Deployment

1. **Check Netlify deployment:**
   - https://app.netlify.com/projects/fascinating-sunburst-516df8
   - Verify deploy completes successfully
   - Check deploy preview is live

2. **Verify on production:**
   - https://quranhikma.com/account.html
   - Account link visible in header
   - Signup form accessible
   - Email verification flow works

---

## Step 6: Enable Tracking & Monitoring

### Analytics

Track signup success:
```javascript
// In account.js (already in place)
message('Check your email for the next step.');
// Analytics event should fire here
```

### Monitor for Issues

1. **Watch for signup errors:**
   - Email delivery failures
   - Account creation errors
   - Verification link expiration

2. **Set up alerts:**
   - Monitor Supabase auth logs
   - Monitor email delivery status
   - Set up uptime monitoring for /account.html

---

## Step 7: Announce Public Launch (Optional)

**Communication channels:**
- Update website to mention accounts feature
- Post on social media
- Add to changelog
- Send email to existing research users (if list available)

---

## Rollback Plan

If issues arise after enabling public login:

```bash
# Option 1: Hide account link again
# Edit index.html and comment out the account link
git commit -m "Temporarily disable public login"

# Option 2: Enable harder gate
# Edit account-gate.js to block access
# Add check at top:
if (!hasAudioVerification) {
  alert('Accounts coming soon with audio verification');
  location.href = '/';
}
```

---

## Testing Checklist

After enabling, test:

- [ ] **Signup Flow:**
  - [ ] Create new account with valid email
  - [ ] Verify email link works
  - [ ] Can login after verification
  - [ ] Can logout successfully

- [ ] **Login Flow:**
  - [ ] Login with verified account
  - [ ] Invalid password shows error
  - [ ] Non-existent email shows error
  - [ ] Session persists across page refreshes

- [ ] **Recovery Flow:**
  - [ ] Forgot password email arrives
  - [ ] Password reset link works
  - [ ] New password allows login

- [ ] **Research Management:**
  - [ ] Can create private research
  - [ ] Can export research
  - [ ] Cannot access other users' data
  - [ ] Logout clears session

- [ ] **Cross-Device:**
  - [ ] Login on mobile works
  - [ ] Research syncs across devices
  - [ ] Session management works

---

## Success Metrics

Track these after launch:

- Signup rate (accounts created per day)
- Email verification rate (% of signups that verify)
- Login success rate (% of logins that succeed)
- Error rate (% of failed requests)
- User retention (return visitors)

---

## Post-Launch Tasks

After public login is live:

1. **Monitor dashboard:**
   - Supabase auth metrics
   - Email delivery logs
   - Error logs

2. **User support:**
   - Email account → support inbox set up
   - FAQ updated with account questions
   - Respond to user issues quickly

3. **Data backups:**
   - Ensure daily backups are configured
   - Test backup restoration
   - Document recovery procedure

4. **Privacy audit:**
   - Rerun RLS policy tests
   - Audit access logs
   - Verify no unauthorized access

---

## Contacts & Escalation

If issues arise:

1. **Email failures:** Check SMTP configuration in Supabase
2. **Database issues:** Check Supabase status page
3. **Frontend errors:** Check browser console and error logs
4. **Users can't verify:** Check email provider limits (if using Supabase email)

---

## File Changes Summary

| File | Change | Reason |
|------|--------|--------|
| index.html | Uncomment account link | Make signup discoverable |
| site-chrome.js | Check navigation | Verify no hidden items |
| account-gate.js | Leave empty | Already disabled |

---

## Deployment Safety Notes

✅ **Safe to do:**
- Uncomment HTML links
- Update navigation
- Edit homepage copy
- Deploy to production

⚠️ **Requires testing:**
- Email configuration
- Password reset flow
- Cross-device login

🔒 **Verify before deploying:**
- All RLS policies still enforced
- No service-role keys exposed
- Email verification required
- Session tokens properly invalidated

---

**Template created:** 2026-10-09  
**Status:** Ready to execute upon audio verification approval  
**Estimated time to enable:** 10 minutes + validation
