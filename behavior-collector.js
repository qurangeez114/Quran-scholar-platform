/**
 * QuranHikma site-wide, privacy-conscious first-party visitor metrics.
 * A visit is a browser tab/session, not a known individual.
 * Location comes from approximate Netlify edge geo metadata (if available).
 * Signed-in identity is derived from the verified Supabase session on the server.
 * All browser writes go through a restricted RPC, never through the service role.
 */
(function () {
  'use strict';
  const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  const KEY = 'qh_visit_tab_v2';
  const MAX_IDLE_MS = 30 * 60 * 1000;
  const geo = window.QHikmaVisitorGeo || {};
  let id, authToken = null, lastCount = Date.now(), warningShown = false;
  let pageStart = Date.now(), wallSeen = false;

  // Honor site-level opt-out and browsers that explicitly request no tracking.
  try {
    if (localStorage.getItem('qh_analytics_optout') === '1' ||
        navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  } catch (_) {}

  function visitKey() {
    if (id) return id;
    const now = Date.now();
    try {
      const stored = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (stored && /^[0-9a-f-]{36}$/i.test(stored.id) && now - stored.seen < MAX_IDLE_MS)
        id = stored.id;
      if (!id) id = crypto.randomUUID();
      sessionStorage.setItem(KEY, JSON.stringify({ id, seen: now }));
    } catch (_) { id = crypto.randomUUID(); }
    return id;
  }
  function rememberActivity() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ id: visitKey(), seen: Date.now() })); } catch (_) {}
  }
  function device() {
    const w = window.innerWidth || 0;
    return w < 700 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
  }
  function elapsed() {
    const now = Date.now();
    const seconds = Math.min(120, Math.max(0, Math.round((now - lastCount) / 1000)));
    lastCount = now;
    return seconds;
  }
  function fetchVisit(type, label, seconds, token) {
    const payload = {
      p_session_key: visitKey(),
      p_event_type: type,
      p_path: location.pathname,
      p_label: (label || '').slice(0, 180),
      p_seconds: seconds,
      p_country: geo.country || null,
      p_region: geo.region || null,
      p_city: geo.city || null,
      p_device: device(),
      p_referrer: document.referrer || null
    };
    rememberActivity();
    return fetch(SB_URL + '/rest/v1/rpc/qh_behavior_ingest', {
      method: 'POST', keepalive: true,
      headers: {
        apikey: SB_ANON,
        Authorization: 'Bearer ' + (token || authToken || SB_ANON),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(async response => {
      if (!response.ok) throw Error('Visitor recording failed (' + response.status + ')');
    }).catch(err => {
      if (!warningShown) {
        console.warn('QuranHikma visitor analytics:', err.message);
        warningShown = true;
      }
    });
  }
  function record(type, label, countTime = true) {
    return fetchVisit(type, label, countTime ? elapsed() : 0);
  }
  function moneyLabel(element) {
    const href = element.getAttribute?.('href') || '';
    const text = (element.textContent || '').trim().slice(0, 80);
    if (/donate/i.test(href + text)) return 'donate';
    if (/advertis|sponsor/i.test(href + text)) return 'advertise';
    if (/subscri|premium|pricing/i.test(href + text)) return 'premium';
    return '';
  }
  async function identify() {
    try {
      const { db } = await import('/accounts/client.js');
      const { data } = await db.auth.getSession();
      if (data?.session?.access_token) {
        authToken = data.session.access_token;
        await fetchVisit('identify', null, 0, authToken);
      }
      db.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          authToken = session?.access_token || null;
          if (authToken) fetchVisit('identify', null, 0, authToken);
        } else if (event === 'SIGNED_OUT') authToken = null;
      });
    } catch (_) {
      // Failed auth module loading must never prevent anonymous visitor counts.
    }
  }
  document.addEventListener('click', event => {
    const element = event.target?.closest?.('a,button');
    if (!element) return;
    const label = moneyLabel(element);
    if (label) record('monetization_click', label);
  }, true);
  window.QHikmaBehavior = {
    track: (type, label) => {
      if (['monetization_click','signup_wall','page_view'].includes(type)) record(type, label);
    },
    // Identity comes from a real authenticated JWT, not a caller-supplied user id.
    attachUser: () => identify()
  };
  visitKey();
  record('page_view', document.title || location.pathname, false);
  identify();
  setInterval(() => {
    if (document.visibilityState !== 'visible') {
      lastCount = Date.now();
      return;
    }
    record('heartbeat');
  }, 30000);
  setInterval(() => {
    if (!wallSeen && document.getElementById('qh-account-wall')) {
      wallSeen = true;
      record('signup_wall', 'trial_expired');
    }
  }, 4000);
  window.addEventListener('pagehide', () => {
    record('page_leave', location.pathname);
  });
})();
