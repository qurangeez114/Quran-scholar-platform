# Activity History v2 — Not Recording New Pages

## Problem Statement
- **What's broken:** Activity History modal records only old entries (2m+) ago. New page navigation is NOT recorded.
- **Platform:** Android Chrome mobile
- **How to reproduce:** 
  1. Open quranhikma.com
  2. Click through pages (Quran → Themes → Research → Campaigns)
  3. Tap 🕐 button
  4. Check History tab → only shows stale "2m ago" entries from before navigation

## Current Code Location
- **File:** `/home/claude/repo/activity-history-v2.js` (520 lines)
- **CSS:** `/home/claude/repo/activity-history-v2.js` (350 lines)
- **Implementation:** Injected into all 30+ HTML pages

## Code Flow (What Should Happen)

```
Page Load → init() → trackPageWhenReady() → wait for title → trackPage() → save to localStorage
     ↓
Modal Opens → trackPage() is called again (line 203) → adds to history
     ↓
User navigates to new page → Page reloads → init() and trackPageWhenReady() run again
     ↓
Fresh entry recorded in localStorage
```

## What's Actually Happening

✅ Works:
- Modal opens correctly
- Shows existing entries (from 2m+ ago)
- Tabs switch properly (History/Saved/Slides)

❌ Broken:
- New page navigation NOT recorded
- Opening modal shows same stale "Research Workspace 2m ago" entry
- No new entries appear even after navigating through multiple pages

## Suspected Issues

### Issue 1: `document.title` May Never Be Set
```javascript
// Lines 472-492
function trackPageWhenReady() {
  let attempts = 0;
  const checkTitle = setInterval(() => {
    attempts++;
    const title = document.title || '';
    
    if (title && title.length > 0 && title !== 'undefined') {
      // ✅ Track page
      trackPage();
    } else if (attempts >= maxAttempts) {
      // ⚠️ Timeout - tracks anyway, but title is empty?
      trackPage();
    }
  }, 100); // 100ms check
}
```

**Question:** Is `document.title` ever being set on your pages? If it's always empty, `trackPage()` records with title="Untitled".

### Issue 2: localStorage Not Persisting
```javascript
// Lines 46-54
function save(key, data) {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);  // ← Does this work on Android Chrome?
    console.log('[qhikma] Saved', key, ':', data.length, 'items');
  } catch (e) {
    console.error('[qhikma] Save failed:', key, e.message);
  }
}
```

**Question:** Is localStorage throwing an error on Android? (Check browser console)

### Issue 3: Navigation Doesn't Trigger Re-initialization
```javascript
// Lines 500-509
// This only runs ONCE on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', trackPageWhenReady);
} else {
  window.addEventListener('load', trackPageWhenReady);
  trackPageWhenReady();
}
```

When you click "Themes" link → page RELOADS → this code runs again on NEW page.

**Question:** Are page reloads triggering fresh init/trackPageWhenReady calls?

### Issue 4: Only Tracks When Modal Opens
```javascript
// Line 203 in openModal()
function openModal() {
  ...
  trackPage();  // ← Only tracks HERE
}
```

History only updates when you manually open the modal. Auto-tracking at page load may be failing.

## Test Steps to Debug

1. **Check browser console for `[qhikma]` messages:**
   - Open DevTools (F12)
   - Filter for `[qhikma]`
   - Navigate pages and screenshot the console output

2. **Check if localStorage is actually saving:**
   ```javascript
   // Run in console
   console.log(JSON.parse(localStorage.getItem('qhikma_activity_history')))
   ```
   - What does it show? Empty? Old entries?

3. **Check document.title on different pages:**
   ```javascript
   console.log('Title:', document.title)
   ```
   - Is it set? Or empty?

4. **Check if pages are re-running init():**
   - Look for `[qhikma] ✅ Initialization complete` messages after navigation
   - Should appear on each page load

## Questions for Second Opinion

1. **Why might `document.title` be empty or delayed?** Is there a better way to wait for page metadata?

2. **Is there a localStorage limitation on Android Chrome?** Should we use IndexedDB instead?

3. **Should tracking run on every page load, or do SPA navigation?** These pages are full reloads (links), not SPA, so tracking should re-run on each new HTML page.

4. **Is the title-waiting logic (line 478-492) the blocker?** Should we remove the 5-second timeout and just track immediately?

## Code to Try (Simplified)

Instead of waiting for title, try immediate tracking:
```javascript
// Replace trackPageWhenReady() with:
function trackPageImmediately() {
  console.log('[qhikma] Tracking page immediately');
  trackPage();
  
  // Log what was saved
  const saved = JSON.parse(localStorage.getItem('qhikma_activity_history'));
  console.log('[qhikma] History now:', saved);
}

// Then call it immediately:
trackPageImmediately();
```

This removes title-waiting and localStorage uncertainty.

---

**Status:** Handed off for second opinion on why localStorage tracking is failing across page navigations.
