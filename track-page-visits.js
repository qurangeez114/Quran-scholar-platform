/**
 * Universal page-visit tracker → writes into the single 'qnav_hist' key.
 *
 * - If the page already defines window.qhistRecord (index.html, madhhab.html,
 *   research.html, themes.html, sira.html, and a few others have their own
 *   richer inline copy), we just call THAT — so this never double-tracks or
 *   fights with the existing dedupe/scroll-position logic on those pages.
 * - Everywhere else (Campaigns, Presentation, Theme Reader, etc. — pages
 *   that had no recorder at all before), this writes directly into
 *   qnav_hist using the exact same entry shape and dedupe rule, so entries
 *   from every page merge into one seamless list.
 *
 * No URL whitelist. No waiting for the title before saving. Icon is never
 * used to decide whether something gets recorded — only how it's labeled.
 */
(function () {
  'use strict';

  var KEY = 'qnav_hist';
  var MAX = 100;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  function getIcon() {
    if (window.QNAV_PAGE_ICON) return window.QNAV_PAGE_ICON;
    var p = location.pathname.toLowerCase();
    if (p.indexOf('campaign') !== -1) return '⚔️';
    if (p.indexOf('research') !== -1) return '📚';
    if (p.indexOf('presentation') !== -1) return '🎞';
    if (p.indexOf('theme') !== -1) return '🏛';
    if (p.indexOf('hadith') !== -1) return '📖';
    if (p.indexOf('sira') !== -1) return '🏰';
    if (p.indexOf('madhhab') !== -1 || p.indexOf('fiqh') !== -1) return '⚖️';
    if (p.indexOf('qiraat') !== -1) return '🎙';
    if (p.indexOf('lexicon') !== -1) return '📕';
    return '📄';
  }

  function getTitle() {
    var t = (document.title || '').trim();
    if (t) return t;
    var h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    return location.pathname;
  }

  function stateKey(entry) {
    try {
      var u = new URL(entry.url, location.href);
      return [u.pathname, u.search, entry.label || ''].join('|');
    } catch (e) {
      return entry.url || '';
    }
  }

  function fallbackRecord(label, url, icon, sub) {
    try {
      url = url || location.href;
      var entry = {
        label: label || document.title || 'Page',
        url: url,
        icon: icon || '📄',
        sub: sub || '',
        time: Date.now()
      };

      var raw = [];
      try { raw = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { raw = []; }
      if (!Array.isArray(raw)) raw = [];

      var now = Date.now();
      raw = raw.filter(function (x) { return (now - (x && x.time || 0)) < MAX_AGE_MS; });

      var key = stateKey(entry);
      raw = raw.filter(function (x) { return stateKey(x) !== key; });

      raw.unshift(entry);
      if (raw.length > MAX) raw = raw.slice(0, MAX);

      localStorage.setItem(KEY, JSON.stringify(raw));
    } catch (e) {}
  }

  function record() {
    var title = getTitle();
    var icon = getIcon();
    if (typeof window.qhistRecord === 'function') {
      window.qhistRecord(title, location.href, icon, '');
    } else {
      fallbackRecord(title, location.href, icon, '');
    }
  }

  function fire() {
    record();
    setTimeout(record, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fire);
  } else {
    fire();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) record();
  });

  var gate = document.createElement('script');
  gate.src = 'account-gate.js';
  document.head.appendChild(gate);
})();
