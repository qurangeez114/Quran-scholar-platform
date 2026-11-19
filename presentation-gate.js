/* Presentation sign-in gate.
   Building presentations is for signed-in members. When a visitor taps any
   "Add to presentation" control anywhere on the site, this stops the add and
   shows a sign-in prompt instead. Signed-in members are not affected.
   The presentation page itself (presentation.html) has its own full gate, and
   cloud saves are protected by database rules, so this file is only the
   friendly front door, not the security boundary. */
(function () {
  'use strict';
  if (window.__qhPresentationGate) return;
  window.__qhPresentationGate = true;

  var AUTH_KEY = 'sb-ylosytbxpzxzwfzjpaej-auth-token';

  function signedIn() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      var sess = s && (s.currentSession || s);
      // An expired access token is refreshed by the Supabase client as long as a
      // refresh token is present, so the refresh token is what decides here.
      return !!(sess && (sess.refresh_token || sess.access_token) && sess.user);
    } catch (e) { return false; }
  }
  window.qhIsSignedIn = signedIn;

  var LABEL = /(add[^a-z]{0,3}(selection |this |verse |hadith |entry |theme )?to (the )?(presentation|deck)|added to presentation|in presentation)/i;
  var HANDLER = /\b(qhAddToPresentation|qhikmaAddToPresentation|addHadithToPresentation|add\w*ToPresentation)\s*\(/;

  function isAddControl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest && el.closest('#qh-pres-gate')) return false;
    if (el.classList && el.classList.contains('add-presentation-btn')) return true;
    if (el.hasAttribute('data-add-presentation')) return true;
    var onclick = el.getAttribute('onclick') || '';
    if (HANDLER.test(onclick)) return true;
    // Only small controls are judged by their words, so a whole result card
    // that happens to contain an add button is never blocked.
    var tag = el.tagName;
    if (tag !== 'BUTTON' && tag !== 'A' && el.getAttribute('role') !== 'button') return false;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > 60) text = '';
    var label = (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + text;
    return LABEL.test(label);
  }

  function returnTo() {
    return encodeURIComponent(location.pathname + location.search + location.hash);
  }

  function ensureStyle() {
    if (document.getElementById('qh-pres-gate-css')) return;
    var st = document.createElement('style');
    st.id = 'qh-pres-gate-css';
    st.textContent = [
      '#qh-pres-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,18,14,.55)}',
      '#qh-pres-gate[hidden]{display:none}',
      '#qh-pres-gate .qpg-card{box-sizing:border-box;width:100%;max-width:400px;background:#fffdf8;color:#1f1a12;border:1px solid #e3d7bd;border-radius:16px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.25);font:15px/1.5 Inter,system-ui,sans-serif}',
      '#qh-pres-gate h2{margin:0 0 6px;font:700 18px/1.3 Inter,system-ui,sans-serif}',
      '#qh-pres-gate p{margin:0 0 14px;color:#4b4335}',
      '#qh-pres-gate .qpg-actions{display:flex;flex-wrap:wrap;gap:8px}',
      '#qh-pres-gate a,#qh-pres-gate button{flex:1 1 120px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;font:700 14px Inter,system-ui,sans-serif;text-decoration:none;cursor:pointer;padding:8px 12px;box-sizing:border-box}',
      '#qh-pres-gate .qpg-primary{background:#245d4b;color:#fff;border:1px solid #245d4b}',
      '#qh-pres-gate .qpg-secondary{background:#fff;color:#245d4b;border:1px solid #245d4b}',
      '#qh-pres-gate .qpg-close{flex:1 1 100%;background:transparent;border:0;color:#6f6553;font-weight:600;min-height:40px}'
    ].join('');
    document.head.appendChild(st);
  }

  var lastFocus = null;
  function showPrompt() {
    ensureStyle();
    var box = document.getElementById('qh-pres-gate');
    if (!box) {
      box = document.createElement('div');
      box.id = 'qh-pres-gate';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'qh-pres-gate-title');
      box.innerHTML =
        '<div class="qpg-card">' +
        '<h2 id="qh-pres-gate-title">Sign in to build presentations</h2>' +
        '<p>Presentations, speaker notes and saved decks are for members. It is free, and your presentations stay private to your account.</p>' +
        '<div class="qpg-actions">' +
        '<a class="qpg-primary" data-qpg="login" href="#">Log in</a>' +
        '<a class="qpg-secondary" data-qpg="signup" href="#">Create free account</a>' +
        '<button type="button" class="qpg-close" data-qpg="close">Not now</button>' +
        '</div></div>';
      box.addEventListener('click', function (e) {
        if (e.target === box || (e.target.getAttribute && e.target.getAttribute('data-qpg') === 'close')) hidePrompt();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) hidePrompt(); });
      document.body.appendChild(box);
    }
    box.querySelector('[data-qpg="login"]').href = '/account.html?returnTo=' + returnTo();
    box.querySelector('[data-qpg="signup"]').href = '/account.html?mode=signup&returnTo=' + returnTo();
    lastFocus = document.activeElement;
    box.hidden = false;
    try { box.querySelector('[data-qpg="login"]').focus(); } catch (e) {}
  }
  function hidePrompt() {
    var box = document.getElementById('qh-pres-gate');
    if (box) box.hidden = true;
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }
  window.qhShowPresentationSignIn = showPrompt;

  function onActivate(e) {
    if (signedIn()) return;
    var t = e.target;
    var el = t && t.closest ? t.closest('button,a,[role="button"],[onclick]') : null;
    if (!isAddControl(el)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    showPrompt();
  }
  // Capture phase, so the visitor never reaches the page's own add handler.
  document.addEventListener('click', onActivate, true);
})();
