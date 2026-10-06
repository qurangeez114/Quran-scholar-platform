/**
 * Lets a signed-in user send selected site text, or the presentation basket,
 * into My pages.
 */
(function () {
  'use strict';
  if (location.pathname.toLowerCase().indexOf('my-pages.html') !== -1) return;
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';

  function chip(id, text, left) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('button');
      el.id = id;
      el.type = 'button';
      el.style.cssText = 'position:fixed;z-index:2147483002;bottom:12px;border:0;border-radius:999px;padding:8px 12px;background:#1d1914;color:#e2c98a;font:600 13px Georgia,serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)';
      document.body.appendChild(el);
    }
    el.style.left = left;
    el.textContent = text;
    return el;
  }

  function go(payload) {
    try { sessionStorage.setItem('qh_page_capture', JSON.stringify(payload)); } catch (e) {}
    location.href = '/my-pages.html';
  }

  document.addEventListener('mouseup', function () {
    setTimeout(function () {
      var text = String(window.getSelection ? window.getSelection() : '').trim();
      var btn = document.getElementById('qh-save-selection');
      if (text.length < 12) {
        if (btn) btn.remove();
        return;
      }
      btn = chip('qh-save-selection', 'Save selection to my page', '12px');
      btn.onclick = function () {
        go({ title: document.title || 'Saved selection', body: text, source: location.href });
      };
    }, 10);
  });

  function loadSdk() {
    return new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  loadSdk().then(async function () {
    if (!window.supabase) return;
    var sb = window.supabase.createClient(SB_URL, SB_ANON);
    var { data } = await sb.auth.getSession();
    if (!data.session) return;
    var mine = chip('qh-my-pages', 'My pages', '168px');
    mine.onclick = function () { location.href = '/my-pages.html'; };
    var basket = localStorage.getItem('presentationBasket') || localStorage.getItem('savedPresentations');
    if (basket) {
      var pres = chip('qh-save-presentation', 'Save presentation', '250px');
      pres.onclick = function () {
        go({ title: 'Presentation', body: basket, source: 'presentation.html' });
      };
    }
  });
})();
