/**
 * Coarse visit tracking for Quran Hikma.
 * Stores country/region/city (IP lookup, not GPS) and how long the tab stays open.
 * Requires the site_sessions table and insert/update policies from sql/site_sessions.sql.
 */
(function () {
  'use strict';
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmem9qcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0MjIyNzg0LCJleHAiOjIwNTk3OTg3ODR9.yk1pBzCdkadF11U5tj0XAiQMIPBLLo1SG6R-ydXHWn4';
  var KEY = 'qh_session_id';
  var started = Date.now();
  var rowId = null;
  var userEmail = null;
  var userId = null;

  function headers(extra) {
    return Object.assign({
      apikey: SB_ANON,
      Authorization: 'Bearer ' + SB_ANON,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  function sessionKey() {
    try {
      var existing = sessionStorage.getItem(KEY);
      if (existing) return existing;
      var id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
      sessionStorage.setItem(KEY, id);
      return id;
    } catch (e) {
      return String(Date.now());
    }
  }

  function duration() {
    return Math.max(0, Math.round((Date.now() - started) / 1000));
  }

  async function place() {
    try {
      var r = await fetch('https://ipapi.co/json/');
      if (!r.ok) return {};
      var j = await r.json();
      return { country: j.country_name || null, region: j.region || null, city: j.city || null, timezone: j.timezone || null };
    } catch (e) {
      return {};
    }
  }

  async function start() {
    var loc = await place();
    var body = Object.assign({
      session_key: sessionKey(),
      path: location.pathname,
      user_agent: navigator.userAgent.slice(0, 300),
      email: userEmail,
      user_id: userId
    }, loc);
    try {
      var r = await fetch(SB_URL + '/rest/v1/site_sessions', {
        method: 'POST',
        headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify(body)
      });
      if (!r.ok) return;
      var rows = await r.json();
      if (rows && rows[0]) rowId = rows[0].id;
    } catch (e) {}
  }

  async function beat(ending) {
    if (!rowId) return;
    var patch = {
      last_seen_at: new Date().toISOString(),
      duration_seconds: duration(),
      path: location.pathname
    };
    if (ending) patch.ended_at = new Date().toISOString();
    if (userEmail) patch.email = userEmail;
    if (userId) patch.user_id = userId;
    try {
      await fetch(SB_URL + '/rest/v1/site_sessions?id=eq.' + encodeURIComponent(rowId), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(patch),
        keepalive: true
      });
    } catch (e) {}
  }

  window.QHikmaSession = {
    attachUser: function (user) {
      if (!user) return;
      userEmail = user.email || null;
      userId = user.id || null;
      beat(false);
    }
  };

  start();
  setInterval(function () { beat(false); }, 30000);
  window.addEventListener('pagehide', function () { beat(true); });
})();
