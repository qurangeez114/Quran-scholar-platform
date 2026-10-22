/* Shared page chrome: adds the bottom menu and the 🕐 History button to any
   page that doesn't already have them, and loads the History modal if the
   page didn't. Safe to include on every page (idempotent). */
(function () {
  'use strict';
  // Site-wide motion layer (site-motion.js). Idempotent; respects reduced motion.
  if (!document.querySelector('script[src="site-motion.js"]') && !window.__qhMotion) {
    var __m = document.createElement('script'); __m.src = 'site-motion.js'; __m.defer = true;
    document.head.appendChild(__m);
  }
  var NAV = [
    ['index.html','📖','Quran'],['campaigns.html','⚔️','Campaigns'],['research.html','🔬','Research'],
    ['themes.html','🗂️','Themes'],['madhhab.html','⚖️','Madhhab'],['sira.html','🕌','Sīra'],
    ['stories.html','📚','Stories'],['books.html','📕','Books'],['fatwas.html','⚖️','Fatwa'],['narrations.html','🧵','Narrations'],
    ['marketplace.html','🛒','Market'],['muhammad.html','☪️','Muhammad'],['contradiction.html','⚡','Tensions'],
    ['knowledge-graph.html','🕸️','Graph']
  ];
  function file() { var f = location.pathname.split('/').pop(); return f || 'index.html'; }

  function loadModal() {
    if (typeof window.qhikmaOpenModal === 'function' || document.getElementById('qh-modal-js')) return;
    var s = document.createElement('script'); s.id = 'qh-modal-js'; s.src = 'activity-history.js'; document.head.appendChild(s);
    if (!document.querySelector('link[href="activity-history.css"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'activity-history.css'; document.head.appendChild(l);
    }
  }

  var PARENT = {'campaign-detail.html':'campaigns.html','verse-detail.html':'index.html','narration.html':'narrations.html','theme-reader.html':'themes.html','theme-analysis.html':'themes.html','study_page.html':'index.html','qiraat-comparison.html':'index.html','quran-crossref.html':'index.html'};
  function navHtml() {
    var cur = PARENT[file()] || file();
    return NAV.map(function (n) {
      return '<button class="bnav-btn' + (n[0] === cur ? ' active' : '') + '" onclick="location.href=\'' + n[0] + '\'"><span class="bni">' + n[1] + '</span><span>' + n[2] + '</span></button>';
    }).join('');
  }

  function addNav() {
    // Centralized, consistent navigation: overrides legacy page-specific nav markup
    // without allowing multiple bars to overlap.
    var st = document.getElementById('qh-unified-nav-style');
    if (!st) {
      st = document.createElement('style'); st.id = 'qh-unified-nav-style';
      st.textContent =
        '#bottom-nav{position:fixed!important;bottom:0!important;left:0!important;right:0!important;top:auto!important;width:100%!important;height:64px!important;min-height:64px!important;background:#FDFAF4!important;border-top:1px solid #D4C7AA!important;display:flex!important;flex-direction:row!important;z-index:2147483000!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;box-shadow:0 -2px 9px rgba(0,0,0,.12)!important;padding:0!important;margin:0!important;white-space:nowrap!important;}' +
        '#bottom-nav::-webkit-scrollbar{display:none!important}' +
        '#bottom-nav .bnav-btn{box-sizing:border-box!important;flex:0 0 76px!important;min-width:76px!important;max-width:76px!important;width:76px!important;height:64px!important;min-height:64px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;padding:5px 2px!important;margin:0!important;background:transparent!important;border:0!important;border-right:1px solid #EEE5D7!important;border-radius:0!important;color:#524a3b!important;font:600 10px/1.2 Arial,sans-serif!important;letter-spacing:0!important;text-transform:none!important;text-decoration:none!important;text-align:center!important;overflow:hidden!important;white-space:nowrap!important;cursor:pointer!important;}' +
        '#bottom-nav .bnav-btn .bni{font-size:20px!important;line-height:24px!important;display:block!important;margin:0!important}' +
        '#bottom-nav .bnav-btn.active{background:#F3E8CF!important;color:#754e0c!important;box-shadow:inset 0 3px #B8902A!important}' +
        '#bottom-nav .bnav-btn:focus-visible{outline:2px solid #9c742a!important;outline-offset:-3px!important}' +
        'body{padding-bottom:max(76px,env(safe-area-inset-bottom))!important}' +
        '#bnav,.fatwa-bottom-nav{display:none!important}' +
        '@media(min-width:900px){#bottom-nav .bnav-btn{flex-basis:80px!important;min-width:80px!important;max-width:80px!important;width:80px!important}}';
      document.head.appendChild(st);
    }
    var existing = document.getElementById('bottom-nav');
    if (!existing) { existing=document.createElement('nav');existing.id='bottom-nav';document.body.appendChild(existing); }
    existing.setAttribute('aria-label','QuranHikma site navigation');
    existing.innerHTML=navHtml();
    // Make the newly active item visible on narrow screens.
    var active=existing.querySelector('.active');
    if (active && active.offsetLeft > existing.clientWidth-90) {
      existing.scrollLeft=Math.max(0,active.offsetLeft-existing.clientWidth/2+40);
    }
  }

  function addClock() {
    if (document.querySelector('[onclick*="qhikmaOpenModal"], #qhist-badge, #qh-clock-btn')) return;
    var b = document.createElement('button');
    b.id = 'qh-clock-btn'; b.type = 'button'; b.title = 'Activity History'; b.textContent = '🕐';
    b.setAttribute('aria-label', 'Activity History');
    b.style.cssText = 'background:none;border:1px solid #E8C97B;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:18px;color:#C9A84C;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    b.onclick = function () { if (window.qhikmaOpenModal) window.qhikmaOpenModal(); };
    var h = document.querySelector('header');
    if (h) { h.appendChild(b); }
    else { b.style.cssText += 'position:fixed;top:10px;right:10px;z-index:9998;background:#FDFAF4;'; document.body.appendChild(b); }
  }

  function addAccount() {
    if (document.getElementById('qh-account-btn')) return;
    var a = document.createElement('a');
    a.id = 'qh-account-btn'; a.href = '/account.html'; a.title = 'Log in / My account';
    a.textContent = '👤'; a.setAttribute('aria-label', 'Log in or open your account');
    a.style.cssText = 'text-decoration:none;border:1px solid #E8C97B;border-radius:50%;width:36px;height:36px;font-size:18px;color:#C9A84C;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:none;';
    var h = document.querySelector('header');
    if (h) { h.appendChild(a); }
    else { a.style.cssText += 'position:fixed;top:10px;right:56px;z-index:9998;background:#FDFAF4;'; document.body.appendChild(a); }
  }

  function init() { loadModal(); addNav(); setTimeout(addClock, 400); setTimeout(addAccount, 400); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
