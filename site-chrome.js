/* Shared page chrome: adds the bottom menu and the 🕐 History button to any
   page that doesn't already have them, and loads the History modal if the
   page didn't. Safe to include on every page (idempotent). */
(function () {
  'use strict';
  var NAV = [
    ['index.html','📖','Quran'],['campaigns.html','⚔️','Campaigns'],['research.html','🔬','Research'],
    ['themes.html','🗂️','Themes'],['madhhab.html','⚖️','Madhhab'],['sira.html','🕌','Sīra'],
    ['stories.html','📚','Stories'],['books.html','📕','Books'],['narrations.html','🧵','Narrations'],
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

  function addNav() {
    if (document.getElementById('bottom-nav')) return;
    var st = document.createElement('style');
    st.textContent =
      '#bottom-nav{position:fixed;bottom:0;left:0;right:0;height:54px;background:#FDFAF4;border-top:1.5px solid #E8DDC0;display:flex;z-index:9999;box-shadow:0 -2px 8px rgba(0,0,0,.1);overflow-x:auto;scrollbar-width:none}' +
      '#bottom-nav::-webkit-scrollbar{display:none}' +
      '.bnav-btn{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:none;border:none;border-right:1px solid #F0EAE0;cursor:pointer;padding:4px 1px;color:#AAA;font-size:8.5px;font-weight:700;text-transform:uppercase;min-width:62px;white-space:nowrap;font-family:inherit}' +
      '.bnav-btn.active{color:#B8902A;background:#FDF8EE}.bnav-btn .bni{font-size:14px;line-height:1}' +
      'body{padding-bottom:80px}';
    document.head.appendChild(st);
    var nav = document.createElement('nav'); nav.id = 'bottom-nav';
    var cur = file();
    nav.innerHTML = NAV.map(function (n) {
      return '<button class="bnav-btn' + (n[0] === cur ? ' active' : '') + '" onclick="location.href=\'' + n[0] + '\'"><span class="bni">' + n[1] + '</span><span>' + n[2] + '</span></button>';
    }).join('');
    document.body.appendChild(nav);
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

  function init() { loadModal(); addNav(); setTimeout(addClock, 400); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
