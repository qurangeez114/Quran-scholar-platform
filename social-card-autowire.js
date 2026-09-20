/* ============================================================================
 * social-card-autowire.js
 * ----------------------------------------------------------------------------
 * Adds the verse tools to every verse on the site, without editing each
 * page's markup. Where verse-toolbar.js is loaded it injects the full toolbar
 * (audio, language, bookmark, highlight, note, copy, share, presentation,
 * social card, Words); otherwise it adds the social-card button alone.
 *
 * Pages render verses differently — some use data-sura/data-aya, some
 * data-surah/data-ayah, some an id of the form vc-{sura}-{aya}, some a
 * .verse-num element reading "36:55". This scans for all of those, works out
 * the reference, and injects a button that calls openSocialCard().
 *
 * Safe by design:
 *   - does nothing if social-card.js is not loaded
 *   - never adds a second button to the same verse
 *   - only acts on elements where a sura AND aya can actually be resolved
 *   - watches for verses rendered later (most pages fetch asynchronously)
 *
 * Include AFTER social-card.js:
 *   <script src="social-card.js" defer></script>
 *   <script src="social-card-autowire.js" defer></script>
 * ========================================================================== */

(function () {
  'use strict';

  var SEL = [
    '[data-sura][data-aya]',
    '[data-surah][data-ayah]',
    '[id^="vc-"]',
    '.verse-card'
  ].join(',');

  var MARK = 'data-sc-wired';

  function intOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = parseInt(String(v), 10);
    return isNaN(n) ? null : n;
  }

  /* Resolve a verse reference from whichever convention the page uses. */
  function refFor(el) {
    var s = intOrNull(el.getAttribute('data-sura')) ||
            intOrNull(el.getAttribute('data-surah'));
    var a = intOrNull(el.getAttribute('data-aya')) ||
            intOrNull(el.getAttribute('data-ayah'));
    if (s && a) return { sura: s, aya: a };

    // id="vc-36-55"  (theme pages)
    var m = /^vc-(\d{1,3})-(\d{1,3})$/.exec(el.id || '');
    if (m) return { sura: +m[1], aya: +m[2] };

    // a child showing "36:55"
    var num = el.querySelector('.verse-num, .verse-number, .comparison-col-header');
    if (num) {
      var t = /(\d{1,3})\s*:\s*(\d{1,3})/.exec(num.textContent || '');
      if (t) return { sura: +t[1], aya: +t[2] };
    }
    return null;
  }

  function makeButton(ref) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sc-share-btn';
    b.title = 'Create social media card';
    b.textContent = '\uD83D\uDCF1';
    b.setAttribute('aria-label', 'Create social media card for ' + ref.sura + ':' + ref.aya);
    b.setAttribute('style',
      'background:#FDF8EE;border:1px solid #E8C97B;border-radius:6px;width:32px;height:30px;' +
      'font-size:14px;cursor:pointer;padding:0;flex-shrink:0;display:inline-flex;' +
      'align-items:center;justify-content:center;margin-left:4px;');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof window.openSocialCard === 'function') {
        window.openSocialCard(ref.sura, ref.aya);
      }
    });
    return b;
  }

  /* True if this verse already offers a social-card control, whether it came
     from us, from the page's own toolbar (onclick=openSocialCard/…Main), or
     from any other 📱 button. Checking only our own class produced duplicates
     on pages that render their own button. */
  function hasShareControl(el) {
    if (el.querySelector('.sc-share-btn')) return true;
    var nodes = el.querySelectorAll('button, a, [onclick]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var oc = n.getAttribute('onclick') || '';
      if (/openSocialCard/.test(oc)) return true;
      if ((n.textContent || '').indexOf('\uD83D\uDCF1') !== -1) return true;
    }
    return false;
  }

  function wire(el) {
    if (!el || el.getAttribute(MARK)) return;
    if (hasShareControl(el)) { el.setAttribute(MARK, '1'); return; }

    var ref = refFor(el);
    if (!ref || ref.sura < 1 || ref.sura > 114) return;

    // Selectors can match both a card and something inside it; wire the outer
    // one only, or the same verse gets two bars.
    if (el.parentElement && el.parentElement.closest &&
        el.parentElement.closest('[' + MARK + ']')) { el.setAttribute(MARK, '1'); return; }

    el.setAttribute(MARK, '1');

    // The page already renders its own toolbar: only the social card is missing.
    var host = el.querySelector('.verse-actions');
    if (host) { host.appendChild(makeButton(ref)); return; }

    // No toolbar here. Inject the full set if verse-toolbar.js is loaded,
    // so these pages get the same tools as the Quran and theme readers.
    if (typeof window.buildVerseToolbar === 'function') {
      var wrap = document.createElement('div');
      wrap.innerHTML = window.buildVerseToolbar(ref.sura, ref.aya);
      var bar = wrap.firstElementChild;
      if (bar) {
        // Give the toolbar the ids/attributes its handlers look the verse up by.
        if (!el.id) el.id = 'vc-' + ref.sura + '-' + ref.aya;
        el.setAttribute('data-sura', ref.sura);
        el.setAttribute('data-aya', ref.aya);
        el.insertBefore(bar, el.firstChild);
        /* The shared toolbar already contains one social-card button. Rewire
           that existing control to the shared designer—never append another. */
        var existing = bar.querySelector('button[onclick*="openSocialCardMain"]');
        if (existing) {
          existing.setAttribute('onclick', 'event.stopPropagation();openSocialCard(' + ref.sura + ',' + ref.aya + ')');
          existing.setAttribute('title', 'Create social media card');
          existing.setAttribute('aria-label', 'Create social media card for ' + ref.sura + ':' + ref.aya);
        } else if (!hasShareControl(bar)) {
          bar.appendChild(makeButton(ref));
        }
        return;
      }
    }

    // Fallback: social card only.
    var row = document.createElement('div');
    row.setAttribute('style', 'display:flex;justify-content:flex-end;margin-top:6px;');
    row.appendChild(makeButton(ref));
    el.appendChild(row);
  }

  function scan(root) {
    if (typeof window.openSocialCard !== 'function') return; // module absent
    var scope = root && root.querySelectorAll ? root : document;
    try { Array.prototype.forEach.call(scope.querySelectorAll(SEL), wire); }
    catch (e) { /* never break the host page */ }
  }

  function start() {
    scan(document);
    // Verses usually arrive after an async fetch, so keep watching.
    if (window.MutationObserver) {
      var pending = null;
      new MutationObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(function () { scan(document); }, 150);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.socialCardAutowire = scan; // manual re-scan if a page needs it
})();
