/* Research button in the bottom menu (🗂️ Saved), on every page.
   - If the reader has selected text on the page, tapping the button saves that
     text to their private research (qh_research), with the page address as source.
   - If nothing is selected, tapping it opens My Research (or the login page
     when signed out).
   Injected on every HTML page by netlify/edge-functions/donate-inject.ts.
   The button itself is defined in site-chrome.js (bottom navigation). */
(function () {
  'use strict';
  if (window.__qhResearchNav) return;
  window.__qhResearchNav = true;
  if (location.pathname.toLowerCase().indexOf('my-research.html') !== -1) return;

  var clientPromise = null;
  function client() {
    if (!clientPromise) clientPromise = import('/accounts/client.js').catch(function () { return null; });
    return clientPromise;
  }

  async function session() {
    var mod = await client();
    if (!mod || !mod.db) return { db: null, user: null };
    var r = await mod.db.auth.getSession();
    return { db: mod.db, user: r && r.data && r.data.session ? r.data.session.user : null };
  }

  function toast(text) {
    var t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:100000;' +
      'background:#d4af37;color:#111;padding:10px 16px;border-radius:10px;font:700 13px Georgia,serif;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2500);
  }

  // Text selected when the reader touches the button (taps can clear the selection).
  var pending = '';
  function capture() {
    var sel = window.getSelection();
    pending = sel && !sel.isCollapsed ? String(sel.toString() || '').trim() : '';
  }

  async function saveSelection(text) {
    var s = await session();
    if (!s.db) { toast('Research is unavailable right now.'); return; }
    if (!s.user) { toast('Log in to save to Research.'); setTimeout(function () { location.href = '/account.html'; }, 1200); return; }
    var res = await s.db.from('qh_research').insert({
      user_id: s.user.id,
      kind: 'note',
      title: (document.title || 'Saved passage').slice(0, 120),
      body: text.slice(0, 5000),
      url: location.href.slice(0, 2000)
    });
    if (res.error) { toast('Could not save: ' + res.error.message); return; }
    toast('Saved to My Research');
  }

  function wire(link) {
    if (link.dataset.qhResearch) return;
    link.dataset.qhResearch = '1';
    link.addEventListener('mousedown', capture);
    link.addEventListener('touchstart', capture, { passive: true });
    link.addEventListener('click', function (e) {
      var text = pending;
      pending = '';
      if (text.length < 3) return; // no selection: normal navigation to My Research
      e.preventDefault();
      saveSelection(text);
    });
  }

  // site-chrome.js builds the bottom bar; wait for the link to exist.
  var tries = 0;
  (function look() {
    var link = document.querySelector('#bottom-nav a[href="/my-research.html"]');
    if (link) { wire(link); return; }
    if (++tries < 60) setTimeout(look, 100);
  })();
})();
