/**
 * Site behavior collector for monetization study.
 * Records pages, active time, signup-wall hits, and donate/advertise clicks.
 * Country/city only. No raw IP, no passwords.
 */
(function () {
  'use strict';
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  var KEY = 'qh_behavior_session';
  var started = Date.now();
  var pageStarted = Date.now();
  var views = 0;
  var place = {};
  var rowReady = false;

  function sessionKey() {
    try {
      var id = localStorage.getItem(KEY);
      if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
        localStorage.setItem(KEY, id);
      }
      return id;
    } catch (e) {
      return String(Date.now());
    }
  }

  function headers() {
    return {
      apikey: SB_ANON,
      Authorization: 'Bearer ' + SB_ANON,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    };
  }

  function device() {
    var w = window.innerWidth || 0;
    if (w && w < 700) return 'phone';
    if (w && w < 1100) return 'tablet';
    return 'desktop';
  }

  function duration() {
    return Math.max(0, Math.round((Date.now() - started) / 1000));
  }

  async function locate() {
    try {
      var r = await fetch('https://ipapi.co/json/');
      if (!r.ok) return;
      var j = await r.json();
      place = { country: j.country_name || null, region: j.region || null, city: j.city || null, timezone: j.timezone || null };
    } catch (e) {}
  }

  async function upsertSession(extra) {
    var body = Object.assign({
      session_key: sessionKey(),
      last_seen_at: new Date().toISOString(),
      duration_seconds: duration(),
      page_views: views,
      referrer: (document.referrer || '').slice(0, 300),
      landing_path: location.pathname,
      device: device()
    }, place, extra || {});
    try {
      await fetch(SB_URL + '/rest/v1/behavior_sessions?on_conflict=session_key', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        keepalive: true
      });
      rowReady = true;
    } catch (e) {}
  }

  async function event(type, label, seconds) {
    var body = {
      session_key: sessionKey(),
      event_type: type,
      path: location.pathname,
      label: (label || '').slice(0, 180),
      seconds_on_page: seconds == null ? null : seconds,
      country: place.country || null
    };
    try {
      await fetch(SB_URL + '/rest/v1/behavior_events', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        keepalive: true
      });
    } catch (e) {}
  }

  function moneyLabel(el) {
    var href = (el.getAttribute && el.getAttribute('href')) || '';
    var text = (el.textContent || '').trim().slice(0, 80);
    if (/donate/i.test(href + text)) return 'donate';
    if (/advertis|sponsor/i.test(href + text)) return 'advertise';
    if (/subscri|premium|pricing/i.test(href + text)) return 'premium';
    return '';
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a,button') : null;
    if (!el) return;
    var label = moneyLabel(el);
    if (label) event('monetization_click', label, Math.round((Date.now() - pageStarted) / 1000));
  }, true);

  var wallSeen = false;
  setInterval(function () {
    if (!wallSeen && document.getElementById('qh-account-wall')) {
      wallSeen = true;
      event('signup_wall', 'trial_expired', duration());
    }
  }, 4000);

  window.QHikmaBehavior = {
    track: event,
    attachUser: function (user) {
      if (!user) return;
      upsertSession({
        user_id: user.id || null,
        email: user.email || null,
        username: (user.user_metadata && user.user_metadata.username) || null,
        signed_in: true
      });
      event('signed_in', user.email || '', duration());
    }
  };

  async function boot() {
    await locate();
    views = 1;
    await upsertSession();
    await event('page_view', document.title || location.pathname, 0);
    setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      upsertSession();
      event('heartbeat', location.pathname, Math.round((Date.now() - pageStarted) / 1000));
    }, 30000);
    window.addEventListener('pagehide', function () {
      event('page_leave', location.pathname, Math.round((Date.now() - pageStarted) / 1000));
      upsertSession();
    });
  }
  boot();
})();
