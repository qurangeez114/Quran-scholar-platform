/**
 * Guest trial, then an account wall.
 * Visitors may use the site for TRIAL_MS. After that the page is blocked
 * until they create an account and confirm the email, then sign in.
 */
(function () {
  'use strict';
  var TRIAL_MS = 10 * 60 * 1000;
  var USED_KEY = 'qh_trial_used_ms';
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmem9qcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0MjIyNzg0LCJleHAiOjIwNTk3OTg3ODR9.yk1pBzCdkadF11U5tj0XAiQMIPBLLo1SG6R-ydXHWn4';
  var path = location.pathname.toLowerCase();
  if (path.indexOf('login.html') !== -1 || path.indexOf('sessions.html') !== -1) return;

  var tickStart = Date.now();
  var sb = null;

  function used() {
    return parseInt(localStorage.getItem(USED_KEY) || '0', 10) || 0;
  }
  function saveUsed() {
    var next = used() + (Date.now() - tickStart);
    tickStart = Date.now();
    localStorage.setItem(USED_KEY, String(next));
    return next;
  }
  function loadLib(done) {
    if (window.supabase) { done(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = done;
    document.head.appendChild(s);
  }
  function client() {
    if (!sb) sb = window.supabase.createClient(SB_URL, SB_ANON);
    return sb;
  }
  function wall() {
    if (document.getElementById('qh-account-wall')) return;
    var el = document.createElement('div');
    el.id = 'qh-account-wall';
    el.innerHTML = '<div style="position:fixed;inset:0;z-index:99999;background:rgba(12,10,8,.92);display:grid;place-items:center;font-family:Georgia,serif;color:#f3ead8">' +
      '<form id="qh-wall-form" style="width:min(420px,calc(100% - 32px));background:#1d1914;border:1px solid #3d3428;border-radius:14px;padding:24px">' +
      '<h2 style="margin:0 0 8px">Create an account to continue</h2>' +
      '<p style="color:#cbbfa8">You can browse for 10 minutes without an account. To keep using Quran Hikma, create an account, open the confirmation email, then sign in.</p>' +
      '<label>Username<br><input id="qh-user" required style="width:100%;box-sizing:border-box;margin:6px 0 10px;padding:10px;background:#100e0c;color:#f3ead8;border:1px solid #5a4d3b;border-radius:8px"></label>' +
      '<label>Email<br><input id="qh-email" type="email" required style="width:100%;box-sizing:border-box;margin:6px 0 10px;padding:10px;background:#100e0c;color:#f3ead8;border:1px solid #5a4d3b;border-radius:8px"></label>' +
      '<label>Password<br><input id="qh-pass" type="password" minlength="8" required style="width:100%;box-sizing:border-box;margin:6px 0 10px;padding:10px;background:#100e0c;color:#f3ead8;border:1px solid #5a4d3b;border-radius:8px"></label>' +
      '<div style="display:flex;gap:8px"><button id="qh-signup" type="button" style="flex:1;padding:10px;border:0;border-radius:8px;background:#c4a46a;font-weight:700">Create account</button>' +
      '<button id="qh-signin" type="button" style="flex:1;padding:10px;border-radius:8px;background:transparent;color:#f3ead8;border:1px solid #5a4d3b">Sign in</button></div>' +
      '<p id="qh-msg" style="min-height:1.2em"></p></form></div>';
    document.body.appendChild(el);
    document.getElementById('qh-signup').onclick = signup;
    document.getElementById('qh-signin').onclick = signin;
  }
  function hide() {
    var el = document.getElementById('qh-account-wall');
    if (el) el.remove();
  }
  async function emailFor(nameOrEmail) {
    if (nameOrEmail.indexOf('@') !== -1) return nameOrEmail;
    var r = await fetch(SB_URL + '/rest/v1/profiles?username=eq.' + encodeURIComponent(nameOrEmail) + '&select=email&limit=1', {
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON }
    });
    if (!r.ok) return null;
    var rows = await r.json();
    return rows && rows[0] && rows[0].email;
  }
  async function signup() {
    var msg = document.getElementById('qh-msg');
    msg.textContent = 'Sending confirmation email…';
    var username = document.getElementById('qh-user').value.trim();
    var email = document.getElementById('qh-email').value.trim();
    var password = document.getElementById('qh-pass').value;
    var { error } = await client().auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: location.origin + '/login.html',
        data: { username: username }
      }
    });
    if (!error) {
      await fetch(SB_URL + '/rest/v1/profiles', {
        method: 'POST',
        headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ username: username, email: email })
      });
    }
    msg.textContent = error ? error.message : 'Check your email, open the confirmation link, then come back and sign in with your username and password.';
  }
  async function signin() {
    var msg = document.getElementById('qh-msg');
    msg.textContent = 'Signing in…';
    var name = document.getElementById('qh-user').value.trim();
    var typedEmail = document.getElementById('qh-email').value.trim();
    var password = document.getElementById('qh-pass').value;
    var email = typedEmail || await emailFor(name);
    if (!email) { msg.textContent = 'Enter the email you confirmed, or your username after the profiles table exists.'; return; }
    var { data, error } = await client().auth.signInWithPassword({ email: email, password: password });
    if (error) { msg.textContent = error.message; return; }
    localStorage.setItem('qh_signed_in', '1');
    if (window.QHikmaSession) window.QHikmaSession.attachUser(data.user);
    hide();
  }
  function arm() {
    loadLib(function () {
      client().auth.getSession().then(function (res) {
        if (res.data && res.data.session) {
          localStorage.setItem('qh_signed_in', '1');
          return;
        }
        if (saveUsed() >= TRIAL_MS) wall();
        else setInterval(function () {
          if (localStorage.getItem('qh_signed_in') === '1') return;
          if (saveUsed() >= TRIAL_MS) wall();
        }, 15000);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm);
  else arm();
  window.addEventListener('pagehide', saveUsed);
})();
