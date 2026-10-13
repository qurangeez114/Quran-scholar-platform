/* Site-wide motion layer (idempotent). Adds a soft page fade-in and staggered
   entrances for cards and verse/hadith blocks, including ones rendered later
   by the page's own scripts. Loaded from site-chrome.js on every page.
   Respects prefers-reduced-motion (the CSS disables everything). */
(function () {
  'use strict';
  if (window.__qhMotion) return;
  window.__qhMotion = true;

  var SELECTOR = '.card, .verse-card, .hadith-card, .book-card, .stat-card, .xref-card, .ref-card, .src-card';
  var MAX_STAGGER = 10;

  function injectCss() {
    if (document.querySelector('link[href="site-motion.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'site-motion.css';
    document.head.appendChild(l);
  }

  function tag(root) {
    var nodes = (root.matches && root.matches(SELECTOR)) ? [root] : [];
    if (root.querySelectorAll) nodes = nodes.concat(Array.prototype.slice.call(root.querySelectorAll(SELECTOR)));
    nodes.forEach(function (el) {
      if (el.classList.contains('qh-in') || el.closest('.no-motion')) return;
      // stagger by position among siblings that match the same selector
      var siblings = el.parentElement ? el.parentElement.children : [];
      var idx = 0;
      for (var i = 0; i < siblings.length; i++) {
        if (siblings[i] === el) break;
        if (siblings[i].matches && siblings[i].matches(SELECTOR)) idx++;
      }
      el.style.setProperty('--qh-i', Math.min(idx, MAX_STAGGER));
      el.classList.add('qh-in');
    });
  }

  var pending = null;
  function schedule(root) {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = null;
      tag(root || document.body);
    });
  }

  function init() {
    injectCss();
    document.body.classList.add('qh-motion');
    tag(document.body);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { schedule(document.body); return; }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
