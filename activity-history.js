/* Activity History — shared module for all Quran Hikma pages.
   Tracks user navigation/reading across the entire site. Works
   in any page that calls initActivityHistory() + records actions
   via qhistRecord() or qhistUpdateVerseProgress(). */

(function(W) {
  'use strict';

  var MAX = 60;
  var HIST_VERSION = 2;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ago(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  function getHist() {
    try {
      var storedVersion = parseInt(localStorage.getItem('qnav_hist_version') || '0');
      if (storedVersion < HIST_VERSION) {
        localStorage.removeItem('qnav_hist');
        localStorage.setItem('qnav_hist_version', String(HIST_VERSION));
        return [];
      }
      var h = JSON.parse(localStorage.getItem('qnav_hist') || '[]');
      var now = Date.now();
      var fresh = h.filter(function(x) { return (now - (x.time || 0)) < MAX_AGE_MS; });
      if (fresh.length !== h.length) saveHist(fresh);
      return fresh;
    } catch (e) {
      return [];
    }
  }

  function saveHist(h) {
    try {
      localStorage.setItem('qnav_hist', JSON.stringify(h));
    } catch (e) {}
  }

  function stateKey(entry) {
    var u;
    try {
      u = new URL(entry.url, location.href);
    } catch (e) {
      return entry.url || '';
    }
    return [u.pathname, u.search, entry.label || ''].join('|');
  }

  /* Record a page visit. Dedup across the whole list so any earlier
     visit to the same place collapses into this one (most recent). */
  function record(label, url, icon, sub) {
    url = url || window.location.href;
    var entry = {
      label: label || document.title || 'Page',
      url: url,
      icon: icon || '📄',
      sub: sub || '',
      time: Date.now()
    };
    var key = stateKey(entry);
    var h = getHist().filter(function(x) { return stateKey(x) !== key; });
    h.unshift(entry);
    if (h.length > MAX) h = h.slice(0, MAX);
    saveHist(h);
    renderList();
    updateBadge();
  }

  /* For reading-progress tracking (e.g., Quran verses). Dedupes by
     label+url (ignoring aya param), so scrolling updates ONE row in place. */
  function stripAyaParam(u) {
    try {
      var uo = new URL(u, location.href);
      uo.searchParams.delete('aya');
      return uo.pathname + uo.search;
    } catch (e) {
      return u || '';
    }
  }

  function updateVerseProgress(label, url, icon, sub) {
    url = url || window.location.href;
    var entry = {
      label: label || document.title || 'Page',
      url: url,
      icon: icon || '📖',
      sub: sub || '',
      time: Date.now()
    };
    var baseKey = stripAyaParam(url) + '|' + (label || '');
    var h = getHist().filter(function(x) {
      return (stripAyaParam(x.url) + '|' + (x.label || '')) !== baseKey;
    });
    h.unshift(entry);
    if (h.length > MAX) h = h.slice(0, MAX);
    saveHist(h);
    renderList();
    updateBadge();
  }

  function renderList() {
    var el = document.getElementById('qhist-scroll');
    if (!el) return;
    var h = getHist();
    if (!h.length) {
      el.innerHTML = '<div class="qhist-empty">No history yet — start exploring!</div>';
      return;
    }
    el.innerHTML = h.map(function(item) {
      var safeUrl = esc(item.url);
      var goArg = JSON.stringify(item.url || '').replace(/'/g, '&#39;');
      return '<a class="qhist-item" href="' + safeUrl + '" onclick="event.preventDefault();qhistGo(' + goArg + ')">'
        + '<span class="qhist-ico">' + esc(item.icon || '📄') + '</span>'
        + '<span class="qhist-body">'
        + '<div class="qhist-lbl">' + esc(item.label) + '</div>'
        + '<div class="qhist-sub">' + esc(item.sub) + '</div>'
        + '</span>'
        + '<span class="qhist-ago">' + ago(item.time) + '</span>'
        + '</a>';
    }).join('');
  }

  function updateBadge() {
    var b = document.getElementById('qhist-badge');
    if (!b) return;
    var n = getHist().length;
    b.textContent = n;
    b.style.display = n ? 'flex' : 'none';
  }

  function toggleHist() {
    var d = document.getElementById('qhist-drawer');
    if (!d) return;
    d.classList.toggle('open');
    if (d.classList.contains('open')) renderList();
  }

  function clearHist() {
    saveHist([]);
    renderList();
    updateBadge();
  }

  function goToHist(url) {
    window.location.href = url;
  }

  function injectActivityHistory() {
    if (document.getElementById('qhist-drawer')) return; // already injected

    var btn = document.createElement('button');
    btn.className = 'qhist-btn';
    btn.id = 'qhist-btn';
    btn.title = 'Your browsing history';
    btn.setAttribute('onclick', 'qnavToggleHist()');
    btn.innerHTML = '🕐<span id="qhist-badge" class="qhist-badge"></span>';
    document.body.appendChild(btn);

    var drawer = document.createElement('div');
    drawer.id = 'qhist-drawer';
    drawer.innerHTML = '<div class="qhist-head"><span class="qhist-title">📖 Activity History</span><button class="qhist-clearall" onclick="qnavClearHist()">Clear all</button></div><div class="qhist-scroll" id="qhist-scroll"></div>';
    document.body.appendChild(drawer);

    document.addEventListener('click', function(e) {
      var d = document.getElementById('qhist-drawer');
      var b = document.getElementById('qhist-btn');
      if (d && d.classList.contains('open') && !d.contains(e.target) && b && !b.contains(e.target))
        d.classList.remove('open');
    });

    updateBadge();
  }

  function injectActivityHistoryStyles() {
    if (document.getElementById('activity-history-styles')) return; // already injected

    var style = document.createElement('style');
    style.id = 'activity-history-styles';
    style.textContent = `
      .qhist-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8B5E0A 0%, #B8902A 100%);
        color: #fff;
        border: none;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(139, 94, 10, 0.3);
        transition: all 0.3s ease;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      .qhist-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(139, 94, 10, 0.4);
      }
      .qhist-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #C0392B;
        color: #fff;
        border-radius: 50%;
        min-width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border: 2px solid #fff;
      }

      #qhist-drawer {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 350px;
        max-height: 500px;
        background: #FBF8F0;
        border: 2px solid #D4C9A8;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #qhist-drawer.open {
        display: flex;
      }

      .qhist-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #E8DCC0;
        background: linear-gradient(135deg, #FDF8EE 0%, #FBF0D0 100%);
        border-radius: 10px 10px 0 0;
      }

      .qhist-title {
        font-weight: 600;
        color: #8B5E0A;
        font-size: 14px;
      }

      .qhist-clearall {
        background: none;
        border: 1px solid #D4C9A8;
        color: #8B5E0A;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .qhist-clearall:hover {
        background: #FFF5E6;
        border-color: #B8902A;
      }

      .qhist-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }

      .qhist-empty {
        padding: 20px 16px;
        text-align: center;
        color: #999;
        font-size: 13px;
      }

      .qhist-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        margin: 2px 4px;
        background: #fff;
        border: 1px solid #EDE8D8;
        border-radius: 6px;
        text-decoration: none;
        color: #333;
        cursor: pointer;
        transition: all 0.2s;
      }

      .qhist-item:hover {
        background: #FFFBF0;
        border-color: #B8902A;
        box-shadow: 0 2px 6px rgba(184, 144, 42, 0.1);
      }

      .qhist-ico {
        font-size: 20px;
        min-width: 24px;
        text-align: center;
      }

      .qhist-body {
        flex: 1;
        overflow: hidden;
      }

      .qhist-lbl {
        font-weight: 500;
        font-size: 13px;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .qhist-sub {
        font-size: 11px;
        color: #999;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .qhist-ago {
        font-size: 11px;
        color: #BBB;
        min-width: 50px;
        text-align: right;
      }

      @media (max-width: 480px) {
        #qhist-drawer {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
          max-height: 60vh;
        }
        .qhist-btn {
          bottom: 80px;
        }
      }

      html[data-theme="dark"] #qhist-drawer {
        background: #242220;
        border-color: #3A3630;
      }

      html[data-theme="dark"] .qhist-head {
        background: #2A2620;
        border-bottom-color: #3A3630;
      }

      html[data-theme="dark"] .qhist-item {
        background: #1A1917;
        border-color: #2A2620;
        color: #E0D5C7;
      }

      html[data-theme="dark"] .qhist-item:hover {
        background: #2A2620;
        border-color: #B8902A;
      }

      html[data-theme="dark"] .qhist-lbl {
        color: #E0D5C7;
      }

      html[data-theme="dark"] .qhist-sub {
        color: #888;
      }
    `;
    document.head.appendChild(style);
  }

  // Expose to global scope
  W.qhistRecord = record;
  W.qhistUpdateVerseProgress = updateVerseProgress;
  W.qnavToggleHist = toggleHist;
  W.qnavClearHist = clearHist;
  W.qhistGo = goToHist;
  W.initActivityHistory = function() {
    injectActivityHistoryStyles();
    injectActivityHistory();
  };

})(window);
