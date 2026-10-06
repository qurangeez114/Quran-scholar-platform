/**
 * Lets a signed-in user send selected site text, or the presentation basket,
 * into My pages. Buttons stay in the top bar so they do not cover the
 * bottom navigation icons.
 */
(function () {
  'use strict';
  if (location.pathname.toLowerCase().indexOf('my-pages.html') !== -1) return;
  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';

  var style = document.createElement('style');
  style.textContent = '#qh-trial-badge{top:62px!important;right:12px!important;bottom:auto!important;left:auto!important}#qh-account-tools{position:fixed;z-index:2147483002;top:62px;left:12px;display:flex;gap:6px;flex-wrap:wrap;max-width:70vw}#qh-account-tools button{border:0;border-radius:999px;padding:8px 12px;background:#1d1914;color:#e2c98a;font:600 13px Georgia,serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}';
  document.head.appendChild(style);

  function bar() {
    var el = document.getElementById('qh-account-tools');
    if (!el) {
      el = document.createElement('div');
      el.id = 'qh-account-tools';
      document.body.appendChild(el);
    }
    return el;
  }
  function chip(id, text) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('button');
      el.id = id;
      el.type = 'button';
      bar().appendChild(el);
    }
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
      btn = chip('qh-save-selection', 'Save selection');
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
    chip('qh-my-pages', 'My pages').onclick = function () { location.href = '/my-pages.html'; };
    var basket = localStorage.getItem('presentationBasket') || localStorage.getItem('savedPresentations');
    if (basket) {
      chip('qh-save-presentation', 'Save presentation').onclick = function () {
        go({ title: 'Presentation', body: basket, source: 'presentation.html' });
      };
    }
  });
})();
