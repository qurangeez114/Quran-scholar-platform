/**
 * Free trial, then a sign-up wall.
 * Visitors can use the site for FREE_MS of active time. After that the page
 * is blocked until they create an account (username, email, password),
 * open the confirmation email, and sign in.
 */
(function () {
  'use strict';

  var FREE_MS = 10 * 60 * 1000;
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmem9qcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0MjIyNzg0LCJleHAiOjIwNTk3OTg3ODR9.yk1pBzCdkadF11U5tj0XAiQMIPBLLo1SG6R-ydXHWn4';
  var USED_KEY = 'qh_trial_used_ms';
  var path = location.pathname.toLowerCase();
  if (path.indexOf('login.html') !== -1 || path.indexOf('sessions.html') !== -1) return;

  var sb = null;
  var tickTimer = null;
  var lastTick = Date.now();

  function used() {
    return parseInt(localStorage.getItem(USED_KEY) || '0', 10) || 0;
  }
  function addUsed(ms) {
    localStorage.setItem(USED_KEY, String(used() + ms));
  }
  function confirmed(user) {
    return !!(user && (user.email_confirmed_at || user.confirmed_at));
  }

  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () { resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function client() {
    if (!sb) {
      sb = window.supabase.createClient(SB_URL, SB_ANON, {
        auth: { persistSession: true, detectSessionInUrl: true }
      });
    }
    return sb;
  }

  function badge(text) {
    var el = document.getElementById('qh-trial-badge');
    if (!el) {
      el = document.createElement('button');
      el.id = 'qh-trial-badge';
      el.type = 'button';
      el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483000;border:0;border-radius:999px;padding:8px 12px;background:#1d1914;color:#e2c98a;font:600 13px Georgia,serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)';
      el.onclick = function () { showWall(false); };
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  function showWall(required) {
    var wall = document.getElementById('qh-account-wall');
    if (!wall) {
      wall = document.createElement('div');
      wall.id = 'qh-account-wall';
      wall.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(12,10,8,.82);display:grid;place-items:center;padding:16px';
      wall.innerHTML = '<form id="qh-auth-form" style="width:min(420px,100%);background:#1d1914;color:#f3ead8;border:1px solid #3d3428;border-radius:14px;padding:22px;font-family:Georgia,serif">' +
        '<h2 style="margin:0 0 8px;font-size:1.35rem">Create an account to continue</h2>' +
        '<p id="qh-auth-lead" style="color:#cbbfa8;line-height:1.45"></p>' +
        '<label>Username<br><input id="qh-user" required minlength="3" autocomplete="username" style="width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border-radius:8px;border:1px solid #5a4d3b;background:#100e0c;color:#f3ead8"></label>' +
        '<label style="display:block;margin-top:10px">Email<br><input id="qh-email" type="email" required autocomplete="email" style="width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border-radius:8px;border:1px solid #5a4d3b;background:#100e0c;color:#f3ead8"></label>' +
        '<label style="display:block;margin-top:10px">Password<br><input id="qh-pass" type="password" required minlength="8" autocomplete="new-password" style="width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border-radius:8px;border:1px solid #5a4d3b;background:#100e0c;color:#f3ead8"></label>' +
        '<div style="display:flex;gap:8px;margin-top:14px">' +
        '<button id="qh-signup" type="button" style="flex:1;padding:11px;border:0;border-radius:8px;background:#c4a46a;color:#1a140c;font-weight:700;cursor:pointer">Create account</button>' +
        '<button id="qh-signin" type="button" style="flex:1;padding:11px;border-radius:8px;border:1px solid #5a4d3b;background:transparent;color:#f3ead8;cursor:pointer">Sign in</button>' +
        '</div><p id="qh-auth-msg" style="min-height:1.2em"></p>' +
        '<button id="qh-auth-close" type="button" style="display:none;background:none;border:0;color:#e2c98a;cursor:pointer">Keep browsing</button>' +
        '</form>';
      document.body.appendChild(wall);
      document.getElementById('qh-signup').onclick = signup;
      document.getElementById('qh-signin').onclick = signin;
      document.getElementById('qh-auth-close').onclick = function () { wall.style.display = 'none'; };
    }
    document.getElementById('qh-auth-lead').textContent = required
      ? 'Your free time is used. Choose a username and password, confirm the email we send, then sign in. The site stays locked until that confirmation is done.'
      : 'You can keep browsing for now, or create an account early. Confirmation is by email.';
    document.getElementById('qh-auth-close').style.display = required ? 'none' : 'inline';
    wall.style.display = 'grid';
    if (required) wall.dataset.required = '1';
  }

  function msg(text) {
    var el = document.getElementById('qh-auth-msg');
    if (el) el.textContent = text;
  }

  function fields() {
    return {
      username: document.getElementById('qh-user').value.trim(),
      email: document.getElementById('qh-email').value.trim(),
      password: document.getElementById('qh-pass').value
    };
  }

  async function signup() {
    var f = fields();
    if (f.username.length < 3) { msg('Username must be at least 3 characters.'); return; }
    msg('Sending confirmation email\u2026');
    var { data, error } = await client().auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        emailRedirectTo: location.origin + '/',
        data: { username: f.username }
      }
    });
    if (error) { msg(error.message); return; }
    if (data.session && confirmed(data.user)) { unlock(); return; }
    msg('Check your email and open the confirmation link. Then come back and press Sign in.');
  }

  async function signin() {
    var f = fields();
    msg('Signing in\u2026');
    var { data, error } = await client().auth.signInWithPassword({ email: f.email, password: f.password });
    if (error) { msg(error.message); return; }
    if (!confirmed(data.user)) { msg('Email is not confirmed yet. Open the link we sent, then sign in.'); return; }
    unlock();
  }

  function unlock() {
    var wall = document.getElementById('qh-account-wall');
    if (wall) wall.remove();
    var b = document.getElementById('qh-trial-badge');
    if (b) b.remove();
    if (tickTimer) clearInterval(tickTimer);
  }

  function trialLeft() {
    return Math.max(0, FREE_MS - used());
  }

  function onTick() {
    var now = Date.now();
    var delta = now - lastTick;
    lastTick = now;
    if (document.visibilityState === 'visible') addUsed(delta);
    var left = trialLeft();
    if (left <= 0) {
      showWall(true);
      badge('Sign in required');
      return;
    }
    var mins = Math.ceil(left / 60000);
    badge(mins + ' min free \u00b7 Sign in');
  }

  async function start() {
    try { await loadSdk(); } catch (e) { return; }
    var { data } = await client().auth.getSession();
    if (data.session && confirmed(data.session.user)) return;
    if (trialLeft() <= 0) showWall(true);
    onTick();
    tickTimer = setInterval(onTick, 5000);
    document.addEventListener('visibilitychange', function () { lastTick = Date.now(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
