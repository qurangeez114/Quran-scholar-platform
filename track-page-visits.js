/**
 * Track Page Visits v3 - Hooks into existing qhistRecord system
 * 
 * Replaces activity-history-v2.js - simpler, uses proven storage
 * 
 * Stores in: qnav_hist (localStorage)
 * Records: every page load, with title fallback
 */

(function() {
  'use strict';

  function trackCurrentPage() {
    try {
      // Title: document.title → h1 text → pathname
      var title = (document.title || '').trim();
      if (!title) {
        var h1 = document.querySelector('h1');
        title = (h1 && h1.textContent.trim()) || location.pathname;
      }

      // Icon: from page meta or guess from path
      var icon = window.QNAV_PAGE_ICON || '📄';
      if (location.pathname.includes('research')) icon = '📚';
      else if (location.pathname.includes('presentation')) icon = '🎞';
      else if (location.pathname.includes('theme')) icon = '🏛';
      else if (location.pathname.includes('campaign')) icon = '⚔️';
      else if (location.pathname.includes('hadith')) icon = '📖';
      else if (location.pathname.includes('sira')) icon = '🏰';

      // Record via existing system
      if (window.qhistRecord) {
        console.log('[track] Recording:', title);
        qhistRecord(title, location.href, icon, '');
      } else {
        console.warn('[track] qhistRecord not available yet');
      }
    } catch (e) {
      console.error('[track] Error:', e.message);
    }
  }

  // Track on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackCurrentPage);
  } else {
    trackCurrentPage();
  }

  // Also track after brief delay (title may be set async)
  setTimeout(trackCurrentPage, 300);

  // Android back-forward cache
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      console.log('[track] pageshow persisted - re-tracking');
      trackCurrentPage();
    }
  });
})();
