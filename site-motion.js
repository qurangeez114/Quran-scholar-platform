/* Site-wide motion layer (idempotent). Loaded directly from every page's <head>.
   - page fade-in, staggered entrances for cards and verse/hadith blocks
   - scroll reveals for page sections (with a safety fallback so content never stays hidden)
   - count-up for numeric stat values
   - heading entrance
   Everything is skipped under prefers-reduced-motion (CSS + the JS check below). */
(function () {
  'use strict';
  if (window.__qhMotion) return;
  window.__qhMotion = true;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CARD = '.card, .verse-card, .hadith-card, .book-card, .stat-card, .xref-card, .ref-card, .src-card, .rw-card';
  var REVEAL = 'main section, main .section, .page-section, .panel, .hero, .intro, .content > section, .container > section';
  var HEAD = 'h1, .page-title, .hero h1';
  var MAX_STAGGER = 10;

  function injectCss() {
    if (document.querySelector('link[href="site-motion.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'site-motion.css';
    document.head.appendChild(l);
  }

  function staggerTag(nodes, selector) {
    nodes.forEach(function (el) {
      if (el.classList.contains('qh-in') || el.closest('.no-motion')) return;
      var parent = el.parentElement, idx = 0;
      if (parent) {
        for (var i = 0; i < parent.children.length; i++) {
          var s = parent.children[i];
          if (s === el) break;
          if (s.matches && s.matches(selector)) idx++;
        }
      }
      el.style.setProperty('--qh-i', Math.min(idx, MAX_STAGGER));
      el.classList.add('qh-in');
    });
  }

  function collect(root, selector) {
    var out = [];
    if (root.matches && root.matches(selector)) out.push(root);
    if (root.querySelectorAll) out = out.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
    return out;
  }

  function tagCards(root) { staggerTag(collect(root, CARD), CARD); }

  /* Scroll reveal: sections start hidden only while JS is running, and reveal on enter. */
  var io = null;
  function setupReveal(root) {
    if (!('IntersectionObserver' in window)) return;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('qh-visible');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    collect(root, REVEAL).forEach(function (el) {
      if (el.dataset.qhObs) return;
      el.dataset.qhObs = '1';
      el.classList.add('qh-reveal');
      io.observe(el);
    });
  }

  /* Count-up for numeric stat values (leaves non-numeric text alone). */
  function countUp(root) {
    if (reduce) return;
    collect(root, '.stat-value, .stat-number, .stat-card .value, .stat-card .num').forEach(function (el) {
      if (el.dataset.qhCounted) return;
      var raw = (el.textContent || '').trim();
      var m = raw.match(/^([\d,]+)(\D*)$/);
      if (!m) return;
      var target = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isFinite(target) || target < 2) return;
      el.dataset.qhCounted = '1';
      var suffix = m[2], start = null, dur = 900;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = '0' + suffix;
      requestAnimationFrame(step);
    });
  }

  function markHeads(root) {
    collect(root, HEAD).forEach(function (el) {
      if (el.classList.contains('qh-head')) return;
      el.classList.add('qh-head');
      if (el.tagName === 'H1') el.classList.add('qh-sheen');
    });
  }

  function refresh(root) {
    tagCards(root);
    setupReveal(root);
    countUp(root);
    markHeads(root);
  }

  var pending = null;
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = null; refresh(document.body); });
  }

  function init() {
    injectCss();
    document.documentElement.classList.add('qh-js');
    document.body.classList.add('qh-motion');
    refresh(document.body);
    // Safety net: never leave content hidden if the observer misbehaves.
    setTimeout(function () {
      document.querySelectorAll('.qh-reveal:not(.qh-visible)').forEach(function (el) { el.classList.add('qh-visible'); });
    }, 3000);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { schedule(); return; }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
