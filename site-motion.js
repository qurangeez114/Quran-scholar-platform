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
    if (!document.getElementById('qh-universal-lab-theme')) {
      var theme = document.createElement('link');
      theme.id = 'qh-universal-lab-theme';
      theme.rel = 'stylesheet';
      theme.href = '/qh-universal-lab-theme.css?v=20261105';
      document.head.appendChild(theme);
    }
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

  function addArchStrip() {
    if (document.querySelector('.qh-arch-strip')) return;
    var page = location.pathname.split('/').pop() || 'index.html';
    if (page !== 'index.html') return;
    var strip = document.createElement('div');
    strip.className = 'qh-arch-strip';
    strip.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(strip, document.body.firstChild);
  }

  function init() {
    injectCss();
    addArchStrip();
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


/* Homepage research-lab feature. Only touches the public 114-surah directory.
   Media is stored locally in /assets/, not loaded from a third-party CDN. */
(function () {
  'use strict';
  function initResearchLabHero() {
    var directory = document.getElementById('qh-home-directory');
    if (!directory || document.getElementById('qh-home-lab-media')) return;
    var hero = directory.querySelector('.qh-home-hero');
    var form = hero && hero.querySelector('#qh-home-research-form');
    if (!hero || !form) return;

    var css = document.createElement('style');
    css.id = 'qh-home-lab-style';
    css.textContent =
      '#qh-home-directory .qh-home-hero.qh-home-hero-lab{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,42%);grid-template-rows:auto auto 1fr;gap:8px 18px;align-items:start;padding:14px 20px;background:linear-gradient(115deg,#fff9e9,#f4ebd5);overflow:hidden}' +
      '.qh-home-hero-lab>h1{grid-column:1;grid-row:1}.qh-home-hero-lab>p{grid-column:1;grid-row:2;margin-bottom:4px}.qh-home-hero-lab>#qh-home-research-form{grid-column:1;grid-row:3;min-width:0}' +
      '#qh-home-lab-media{grid-column:2;grid-row:1 / span 3;min-width:0;position:relative;align-self:center;margin:0}' +
      '#qh-home-lab-media .qh-lab-frame{position:relative;background:#0c1d30;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(5,25,45,.22);border:1px solid #c8b78e}' +
      '#qh-home-lab-media video,#qh-home-lab-media img{display:block;width:100%;height:auto;aspect-ratio:508/333;object-fit:contain}' +
      '#qh-home-lab-media video[hidden],#qh-home-lab-media img[hidden],#qh-home-lab-media button[hidden]{display:none}' +
      '#qh-home-lab-media button{position:absolute;right:9px;bottom:9px;padding:8px 11px;border:1px solid rgba(255,255,255,.55);border-radius:9px;background:rgba(8,25,42,.87);color:#fff;font:700 12px system-ui,sans-serif;min-height:38px;cursor:pointer}' +
      '#qh-home-lab-media button:focus-visible{outline:3px solid #f4c84e;outline-offset:2px}' +
      '#qh-home-lab-media figcaption{font:500 12px/1.5 system-ui,sans-serif;color:#63573f;margin-top:7px;text-align:center}' +
      '@media(max-width:740px){#qh-home-directory .qh-home-hero.qh-home-hero-lab{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto auto;gap:9px;padding:12px 14px}' +
      '.qh-home-hero-lab>h1{grid-column:1;grid-row:1}.qh-home-hero-lab>p{grid-column:1;grid-row:2}.qh-home-hero-lab>#qh-home-research-form{grid-column:1;grid-row:4}' +
      '#qh-home-lab-media{grid-column:1;grid-row:3;width:100%;max-width:540px;margin:0 auto 4px}#qh-home-lab-media figcaption{font-size:11px}}';
    document.head.appendChild(css);
    // Homepage layout is a separate, cache-busted stylesheet; keep it scoped to this page.
    if (!document.getElementById('qh-home-mobile-20261105')) {
      var homeLayout = document.createElement('link');
      homeLayout.id = 'qh-home-mobile-20261105';
      homeLayout.rel = 'stylesheet';
      homeLayout.href = '/qh-home-mobile-20261105.css?v=20261106-single-brand';
      document.head.appendChild(homeLayout);
    }

    var figure = document.createElement('figure');
    figure.id = 'qh-home-lab-media';
    var frame = document.createElement('div');
    frame.className = 'qh-lab-frame';
    var video = document.createElement('video');
    video.src = '/assets/qh-research-lab-2026.webm';
    video.poster = '/assets/qh-research-lab-2026-poster.jpg';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-label', 'A multicultural international Qur’an Hikma research team examining manuscripts, historical records, earlier scriptures and textual comparisons.');
    video.playbackRate = 0.72;
    var poster = document.createElement('img');
    poster.src = '/assets/qh-research-lab-2026-poster.jpg';
    poster.alt = 'Researchers from varied backgrounds collaborating at a modern digital textual-research laboratory.';
    poster.hidden = true;
    var button = document.createElement('button');
    button.type = 'button';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var userPaused = !!reduce;
    button.textContent = reduce ? 'Play animation' : 'Pause animation';
    button.setAttribute('aria-label', button.textContent);
    function sync() {
      button.textContent = video.paused ? 'Play animation' : 'Pause animation';
      button.setAttribute('aria-label', button.textContent);
      button.setAttribute('aria-pressed', String(!video.paused));
    }
    function fallback() {
      video.hidden = true;
      poster.hidden = false;
      button.hidden = true;
    }
    if (!video.canPlayType || !video.canPlayType('video/webm; codecs="vp9"')) fallback();
    video.addEventListener('error', fallback);
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    button.addEventListener('click', function () {
      if (video.paused) {
        userPaused = false;
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(sync);
      } else {
        userPaused = true;
        video.pause();
      }
      sync();
    });
    frame.appendChild(video);
    frame.appendChild(poster);
    frame.appendChild(button);
    var caption = document.createElement('figcaption');
    caption.textContent = 'Research · Compare sources · Examine evidence · Explore history';
    figure.appendChild(frame);
    var secondFrame = document.createElement('div');
    secondFrame.className = 'qh-lab-frame qh-lab-second';
    var secondImage = document.createElement('img');
    secondImage.src = '/assets/banner.gif';
    secondImage.addEventListener('error', function () {
      // Temporary visual fallback until the exact uploaded GIF is deployed.
      if (secondImage.dataset.fallback) return;
      secondImage.dataset.fallback = 'true';
      secondImage.src = '/assets/qh-research-community-panel.svg';
    });
    secondImage.alt = 'Everyday people from different backgrounds investigating an open manuscript under the microscope, with an anxious traditional scholar looking on.';
    secondImage.loading = 'eager';
    secondImage.decoding = 'async';
    secondFrame.appendChild(secondImage);
    figure.appendChild(secondFrame);
    figure.appendChild(caption);
    hero.classList.add('qh-home-hero-lab');
    // The form belongs to .qh-hero-inner, not directly to .qh-home-hero.
    // Inserting through hero raised NotFoundError and prevented the media from appearing.
    form.parentElement.insertBefore(figure, form);

    // Keep the first Surah directory page fast when the lab media is off-screen.
    if ('IntersectionObserver' in window && !video.hidden) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting && !video.paused) video.pause();
          else if (entry.isIntersecting && !userPaused) {
            var attempt = video.play();
            if (attempt && attempt.catch) attempt.catch(sync);
          }
        });
      }, { threshold: 0.08 });
      observer.observe(figure);
    } else if (!userPaused && !video.hidden) {
      var attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(sync);
    }
    if (reduce) video.pause();
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initResearchLabHero, { once: true });
  else initResearchLabHero();
})();
