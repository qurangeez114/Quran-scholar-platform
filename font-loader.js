/* Perf: load the large script-specific web fonts only when the page actually
   shows that script. Ethiopic (Tigrinya/Amharic, ~200 KB) and Amiri (Arabic,
   ~100 KB) were previously render-blocking on every visit. Idempotent. */
(function () {
  'use strict';
  if (window.qhLoadFont) return;
  var G = 'https://fonts.googleapis.com/css2?';
  var FONTS = {
    ethiopic: { re: /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/, href: G + 'family=Noto+Sans+Ethiopic:wght@400;600;700&display=swap' },
    amiri: { re: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/, href: G + 'family=Amiri:wght@400;700&display=swap' }
  };
  var done = {}, left = Object.keys(FONTS).length, obs = null;
  function load(k) {
    if (!FONTS[k] || done[k]) return;
    done[k] = true; left--;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONTS[k].href;
    document.head.appendChild(l);
    if (!left && obs) obs.disconnect();
  }
  function scan(text) {
    if (!text) return;
    for (var k in FONTS) if (!done[k] && FONTS[k].re.test(text)) load(k);
  }
  window.qhLoadFont = load;
  function start() {
    scan(document.body ? document.body.textContent : '');
    if (!left || !window.MutationObserver) return;
    obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length && left; i++) {
        var m = muts[i];
        if (m.type === 'characterData') scan(m.target.data);
        for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j].textContent);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
