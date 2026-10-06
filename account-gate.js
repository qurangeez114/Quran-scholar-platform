/**
 * Free trial, then a sign-up wall.
 * Email is the username. First name, last name, city, and country are required.
 */
(function () {
  'use strict';
  var FREE_MS = 20 * 60 * 1000;
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  var USED_KEY = 'qh_trial_used_ms';
  var path = location.pathname.toLowerCase();
  if (path.indexOf('login.html') !== -1 || path.indexOf('sessions.html') !== -1 || path.indexOf('my-pages.html') !== -1) return;
  var sb = null, tickTimer = null, lastTick = Date.now();
  function used() { return parseInt(localStorage.getItem(USED_KEY) || '0', 10) || 0; }
  function addUsed(ms) { localStorage.setItem(USED_KEY, String(used() + ms)); }
  function confirmed(user) { return !!(user && (user.email_confirmed_at || user.confirmed_at)); }
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
    if (!sb) sb = window.supabase.createClient(SB_URL, SB_ANON, { auth: { persistSession: true, detectSessionInUrl: true } });
    return sb;
  }
  function badge(text) {
    var el = document.getElementById('qh-trial-badge');
    if (!el) {
      el = document.createElement('button');
      el.id = 'qh-trial-badge';
      el.type = 'button';
      el.style.cssText = 'position:fixed;top:62px;right:12px;z-index:2147483000;border:0;border-radius:999px;padding:8px 12px;background:#1d1914;color:#e2c98a;font:600 13px Georgia,serif;cursor:pointer';
      el.onclick = function () { showWall(false); };
      document.body.appendChild(el);
    }
    el.textContent = text;
  }
  function field(id, label, type) {
    return '<label style="display:block;margin-top:10px">' + label + '<br><input id="' + id + '" type="' + (type || 'text') + '" required style="width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border-radius:8px;border:1px solid #5a4d3b;background:#100e0c;color:#f3ead8"></label>';
  }
  function showWall(required) {
    var wall = document.getElementById('qh-account-wall');
    if (!wall) {
      wall = document.createElement('div');
      wall.id = 'qh-account-wall';
      wall.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(12,10,8,.82);display:grid;place-items:center;padding:16px;overflow:auto';
      wall.innerHTML = '<form style="width:min(460px,100%);background:#1d1914;color:#f3ead8;border:1px solid #3d3428;border-radius:14px;padding:22px;font-family:Georgia,serif">' +
        '<h2 style="margin:0 0 8px;font-size:1.3rem">Create an account to continue</h2>' +
        '<p id="qh-auth-lead" style="color:#cbbfa8"></p>' +
        field('qh-email', 'Email, used as the username', 'email') +
        field('qh-first', 'First name') +
        field('qh-last', 'Last name') +
        field('qh-city', 'City') +
        field('qh-country', 'Country') +
        field('qh-pass', 'Password', 'password') +
        '<div style="display:flex;gap:8px;margin-top:14px"><button id="qh-signup" type="button" style="flex:1;padding:11px;border:0;border-radius:8px;background:#c4a46a;color:#1a140c;font-weight:700">Create account</button><button id="qh-signin" type="button" style="flex:1;padding:11px;border-radius:8px;border:1px solid #5a4d3b;background:transparent;color:#f3ead8">Sign in</button></div><p id="qh-auth-msg"></p><button id="qh-auth-close" type="button" style="display:none;background:none;border:0;color:#e2c98a">Keep browsing</button></form>';
      document.body.appendChild(wall);
      document.getElementById('qh-signup').onclick = signup;
      document.getElementById('qh-signin').onclick = signin;
      document.getElementById('qh-auth-close').onclick = function () { wall.style.display = 'none'; };
    }
    document.getElementById('qh-auth-lead').textContent = required
      ? 'Your free time is used. Email is the username. Name, city, and country are required for a later donation form.'
      : 'You can keep browsing, or create an account now. Email is the username.';
    document.getElementById('qh-auth-close').style.display = required ? 'none' : 'inline';
    wall.style.display = 'grid';
  }
  function msg(text) { var el = document.getElementById('qh-auth-msg'); if (el) el.textContent = text; }
  function profile() {
    return {
      username: document.getElementById('qh-email').value.trim(),
      first_name: document.getElementById('qh-first').value.trim(),
      last_name: document.getElementById('qh-last').value.trim(),
      city: document.getElementById('qh-city').value.trim(),
      country: document.getElementById('qh-country').value.trim(),
      password: document.getElementById('qh-pass').value
    };
  }
  async function signup() {
    var f = profile();
    if (!f.username || !f.first_name || !f.last_name || !f.city || !f.country || f.password.length < 8) {
      msg('Email, first name, last name, city, country, and a password of at least 8 characters are required.');
      return;
    }
    msg('Sending confirmation email…');
    var data = { username: f.username, first_name: f.first_name, last_name: f.last_name, city: f.city, country: f.country };
    var { data: res, error } = await client().auth.signUp({ email: f.username, password: f.password, options: { emailRedirectTo: location.origin + '/', data: data } });
    if (error) { msg(error.message); return; }
    localStorage.setItem('qh_donor_profile', JSON.stringify(data));
    if (res.session && confirmed(res.user)) { unlock(); return; }
    msg('Check your email and open the confirmation link. Then sign in.');
  }
  async function signin() {
    var f = profile();
    msg('Signing in…');
    var { data, error } = await client().auth.signInWithPassword({ email: f.username, password: f.password });
    if (error) { msg(error.message); return; }
    if (!confirmed(data.user)) { msg('Email is not confirmed yet. Open the link we sent, then sign in.'); return; }
    unlock();
  }
  function unlock() {
    var wall = document.getElementById('qh-account-wall'); if (wall) wall.remove();
    var b = document.getElementById('qh-trial-badge'); if (b) b.remove();
    if (tickTimer) clearInterval(tickTimer);
  }
  function trialLeft() { return Math.max(0, FREE_MS - used()); }
  function onTick() {
    var now = Date.now(), delta = now - lastTick; lastTick = now;
    if (document.visibilityState === 'visible') addUsed(delta);
    var left = trialLeft();
    if (left <= 0) { showWall(true); badge('Sign in required'); return; }
    badge(Math.ceil(left / 60000) + ' min free · Sign in');
  }
  async function start() {
    try { await loadSdk(); } catch (e) { return; }
    var { data } = await client().auth.getSession();
    if (data.session && confirmed(data.session.user)) return;
    if (trialLeft() <= 0) showWall(true);
    onTick();
    tickTimer = setInterval(onTick, 5000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
