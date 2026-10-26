/* Site-wide "Save to Research" + 📚 button.
   Injected on every HTML page by netlify/edge-functions/donate-inject.ts.
   - 📚 floating button opens the signed-in user's private research (my-research.html),
     or the login page when signed out.
   - Selecting text on any page shows "📚 Save to Research"; the selection is saved
     to qh_research (per-user, row-level security) with the page address as its source.
   Pages that already define their own #openResearchWorkspaceBtn keep that button;
   this script only adds the universal 📚 button where one does not exist. */
(function () {
  'use strict';
  if (window.__qhResearchFab) return;
  window.__qhResearchFab = true;
  if (location.pathname.toLowerCase().indexOf('my-research.html') !== -1) return;

  var clientPromise = null;
  function client() {
    if (!clientPromise) clientPromise = import('/accounts/client.js').catch(function () { return null; });
    return clientPromise;
  }

  var style = document.createElement('style');
  style.textContent = [
    '#qh-research-fab{position:fixed;right:14px;z-index:99998;width:52px;height:52px;border-radius:50%;',
    'border:none;background:linear-gradient(135deg,#d4af37,#fff2a8,#b8860b);color:#111;font-size:22px;',
    'box-shadow:0 2px 10px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'bottom:calc(var(--floating-base-bottom,70px) + var(--floating-gap,10px) + var(--nav-row,0px) + 52px + var(--floating-gap,10px) + 52px + var(--floating-gap,10px))}',
    'html.floating-ui-hidden #qh-research-fab{display:none}',
    '#qh-save-sel{position:absolute;z-index:99999;background:linear-gradient(135deg,#d4af37,#fff2a8,#b8860b);',
    'color:#111;border:none;border-radius:8px;padding:6px 12px;font:700 13px Georgia,serif;cursor:pointer;',
    'box-shadow:0 2px 10px rgba(0,0,0,.3)}',
    '#qh-save-toast{position:fixed;bottom:150px;left:50%;transform:translateX(-50%);z-index:100000;',
    'background:#d4af37;color:#111;padding:10px 16px;border-radius:10px;font-weight:700;font-size:13px}'
  ].join('');
  document.head.appendChild(style);

  function toast(text) {
    var t = document.createElement('div');
    t.id = 'qh-save-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2500);
  }

  async function session() {
    var mod = await client();
    if (!mod || !mod.db) return { db: null, user: null };
    var r = await mod.db.auth.getSession();
    return { db: mod.db, user: r && r.data && r.data.session ? r.data.session.user : null };
  }

  function openResearch() {
    session().then(function (s) {
      location.href = s.user ? '/my-research.html' : '/account.html';
    });
  }

  // 📚 floating button (skipped on pages that already have their own workspace button)
  if (!document.getElementById('openResearchWorkspaceBtn')) {
    var fab = document.createElement('button');
    fab.id = 'qh-research-fab';
    fab.type = 'button';
    fab.title = 'My Research';
    fab.setAttribute('aria-label', 'Open My Research');
    fab.textContent = '📚';
    fab.onclick = openResearch;
    document.body.appendChild(fab);
  }

  // Save selected text from any page
  var selBtn = null;
  function removeSelBtn() { if (selBtn) { selBtn.remove(); selBtn = null; } }

  function showSelBtn() {
    removeSelBtn();
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    var text = String(sel.toString() || '').trim();
    if (text.length < 3) return;
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;
    selBtn = document.createElement('button');
    selBtn.id = 'qh-save-sel';
    selBtn.type = 'button';
    selBtn.textContent = '📚 Save to Research';
    selBtn.style.left = (rect.left + window.scrollX) + 'px';
    selBtn.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    selBtn.onmousedown = function (e) { e.preventDefault(); };
    selBtn.onclick = function () { saveSelection(text); };
    document.body.appendChild(selBtn);
  }

  async function saveSelection(text) {
    removeSelBtn();
    var s = await session();
    if (!s.db) { toast('Research is unavailable right now.'); return; }
    if (!s.user) { toast('Log in to save to Research.'); setTimeout(function () { location.href = '/account.html'; }, 1200); return; }
    var title = (document.title || 'Saved passage').slice(0, 120);
    var res = await s.db.from('qh_research').insert({
      user_id: s.user.id,
      kind: 'note',
      title: title,
      body: text.slice(0, 5000),
      url: location.href.slice(0, 2000)
    });
    if (res.error) { toast('Could not save: ' + res.error.message); return; }
    toast('Saved to My Research');
  }

  document.addEventListener('mouseup', function (e) {
    if (e.target && e.target.closest && e.target.closest('#qh-save-sel,#qh-research-fab')) return;
    setTimeout(showSelBtn, 0);
  });
  document.addEventListener('touchend', function (e) {
    if (e.target && e.target.closest && e.target.closest('#qh-save-sel,#qh-research-fab')) return;
    setTimeout(showSelBtn, 300);
  });
  document.addEventListener('mousedown', function (e) {
    if (selBtn && !(e.target.closest && e.target.closest('#qh-save-sel'))) removeSelBtn();
  });
})();
