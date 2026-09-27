/* Activity History — Smart Auto-Positioning Drawer
   Works on ALL pages dynamically. Detects existing controls,
   calculates safe space, and positions drawer automatically.
   Zero manual per-page integration needed. */

(function(W) {
  'use strict';

  var MAX = 60;
  var HIST_VERSION = 3;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  var DRAWER_WIDTH = 300;
  var DRAWER_HEIGHT_MIN = 300;
  var SAFE_MARGIN = 60; // px margin from edges + controls

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

  /* Detect all interactive elements on page */
  function getInteractiveRects() {
    var rects = [];
    var selectors = [
      'button', 'a[href]', '[role="button"]', 'input[type="button"]',
      '[onclick]', '.btn', '.button', 'nav', '[role="navigation"]'
    ];
    selectors.forEach(function(sel) {
      var els = document.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        // Skip our own button
        if (el.id === 'qhist-btn') continue;
        var rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          rects.push({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom });
        }
      }
    });
    return rects;
  }

  function hasCollision(x, y, w, h, interactives) {
    var rect = { left: x, right: x + w, top: y, bottom: y + h };
    for (var i = 0; i < interactives.length; i++) {
      var iRect = interactives[i];
      if (!(rect.right < iRect.left || rect.left > iRect.right ||
            rect.bottom < iRect.top || rect.top > iRect.bottom)) {
        return true;
      }
    }
    return false;
  }

  /* Position toggle button to avoid existing controls */
  function calculateButtonPosition() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var interactives = getInteractiveRects();
    var btnSize = 48;
    var margin = 16;

    var positions = [
      { top: margin, right: margin, name: 'tr' },
      { top: margin, left: margin, name: 'tl' },
      { bottom: margin, right: margin, name: 'br' },
      { bottom: margin, left: margin, name: 'bl' }
    ];

    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var x = p.left !== undefined ? p.left : vw - btnSize - p.right;
      var y = p.top !== undefined ? p.top : vh - btnSize - p.bottom;

      if (!hasCollision(x, y, btnSize, btnSize, interactives)) {
        return { x: x, y: y, name: p.name };
      }
    }

    // Fallback: top-left
    return { x: margin, y: margin, name: 'tl' };
  }

  /* Calculate best position for drawer: tries bottom-right, bottom-left, top-right, top-left */
  function calculateOptimalPosition() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var interactives = getInteractiveRects();

    var positions = [
      { x: vw - DRAWER_WIDTH - SAFE_MARGIN, y: vh - DRAWER_HEIGHT_MIN - SAFE_MARGIN, name: 'br' },
      { x: SAFE_MARGIN, y: vh - DRAWER_HEIGHT_MIN - SAFE_MARGIN, name: 'bl' },
      { x: vw - DRAWER_WIDTH - SAFE_MARGIN, y: SAFE_MARGIN, name: 'tr' },
      { x: SAFE_MARGIN, y: SAFE_MARGIN, name: 'tl' }
    ];

    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      if (!hasCollision(p.x, p.y, DRAWER_WIDTH, DRAWER_HEIGHT_MIN, interactives)) {
        return p;
      }
    }

    // Fallback: bottom-right
    return positions[0];
  }

  function injectActivityHistory() {
    if (document.getElementById('qhist-drawer')) return;

    var btnPos = calculateButtonPosition();
    var drawerPos = calculateOptimalPosition();

    // Toggle button
    var btn = document.createElement('button');
    btn.className = 'qhist-btn';
    btn.id = 'qhist-btn';
    btn.title = 'Toggle Activity History';
    btn.setAttribute('onclick', 'qnavToggleHist()');
    btn.innerHTML = '🕐<span id="qhist-badge" class="qhist-badge"></span>';
    btn.style.position = 'fixed';
    btn.style.left = btnPos.x + 'px';
    btn.style.top = btnPos.y + 'px';
    btn.style.right = 'auto';
    document.body.appendChild(btn);

    // Drawer
    var drawer = document.createElement('div');
    drawer.id = 'qhist-drawer';
    drawer.setAttribute('data-position', drawerPos.name);
    drawer.innerHTML = '<div class="qhist-head"><span class="qhist-title">📖 Activity</span><div><button class="qhist-clearall" onclick="qnavClearHist()">Clear</button><button class="qhist-close" onclick="qnavToggleHist()" title="Close">✕</button></div></div><div class="qhist-scroll" id="qhist-scroll"></div>';
    document.body.appendChild(drawer);

    // Click outside to close
    document.addEventListener('click', function(e) {
      var d = document.getElementById('qhist-drawer');
      var b = document.getElementById('qhist-btn');
      if (d && d.classList.contains('open') && !d.contains(e.target) && b && !b.contains(e.target)) {
        d.classList.remove('open');
      }
    });

    // Reposition on resize
    window.addEventListener('resize', function() {
      var newBtnPos = calculateButtonPosition();
      var newDrawerPos = calculateOptimalPosition();
      btn.style.left = newBtnPos.x + 'px';
      btn.style.top = newBtnPos.y + 'px';
      drawer.setAttribute('data-position', newDrawerPos.name);
      updateDrawerPosition(drawer, newDrawerPos);
    });

    updateDrawerPosition(drawer, drawerPos);
    updateBadge();
  }

  function updateDrawerPosition(drawer, pos) {
    drawer.style.left = pos.x + 'px';
    drawer.style.top = pos.y + 'px';
  }

  function injectActivityHistoryStyles() {
    if (document.getElementById('activity-history-styles')) return;

    var style = document.createElement('style');
    style.id = 'activity-history-styles';
    style.textContent = `
      .qhist-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8B5E0A 0%, #B8902A 100%);
        color: #fff;
        border: 2px solid #fff;
        cursor: pointer;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(139, 94, 10, 0.3);
        transition: all 0.3s ease;
        z-index: 997;
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
        top: -6px;
        right: -6px;
        background: #C0392B;
        color: #fff;
        border-radius: 50%;
        min-width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        border: 2px solid #fff;
      }

      #qhist-drawer {
        position: fixed;
        width: 300px;
        max-height: 70vh;
        background: #FBF8F0;
        border: 2px solid #D4C9A8;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        z-index: 998;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
        opacity: 0;
        pointer-events: none;
        transform: scale(0.95);
      }

      #qhist-drawer.open {
        opacity: 1;
        pointer-events: auto;
        transform: scale(1);
      }

      .qhist-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #E8DCC0;
        background: linear-gradient(135deg, #FDF8EE 0%, #FBF0D0 100%);
        flex-shrink: 0;
        gap: 8px;
        border-radius: 10px 10px 0 0;
      }

      .qhist-title {
        font-weight: 600;
        color: #8B5E0A;
        font-size: 13px;
      }

      .qhist-clearall, .qhist-close {
        background: none;
        border: 1px solid #D4C9A8;
        color: #8B5E0A;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .qhist-clearall:hover, .qhist-close:hover {
        background: #FFF5E6;
        border-color: #B8902A;
      }

      .qhist-close {
        border: none;
        padding: 0 4px;
        font-size: 16px;
      }

      .qhist-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }

      .qhist-empty {
        padding: 16px 12px;
        text-align: center;
        color: #999;
        font-size: 12px;
      }

      .qhist-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
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
        font-size: 18px;
        min-width: 20px;
        text-align: center;
      }

      .qhist-body {
        flex: 1;
        overflow: hidden;
      }

      .qhist-lbl {
        font-weight: 500;
        font-size: 12px;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .qhist-sub {
        font-size: 10px;
        color: #999;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .qhist-ago {
        font-size: 10px;
        color: #BBB;
        min-width: 45px;
        text-align: right;
      }

      @media (max-width: 480px) {
        .qhist-btn {
          width: 44px;
          height: 44px;
          font-size: 18px;
        }
        #qhist-drawer {
          width: calc(100vw - 24px);
          max-width: 280px;
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
    `;
    document.head.appendChild(style);
  }

  // Global API
  W.qhistRecord = record;
  W.qhistUpdateVerseProgress = updateVerseProgress;
  W.qnavToggleHist = toggleHist;
  W.qnavClearHist = clearHist;
  W.qhistGo = goToHist;
  W.initActivityHistory = function() {
    injectActivityHistoryStyles();
    injectActivityHistory();
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      W.initActivityHistory();
    });
  } else {
    W.initActivityHistory();
  }

})(window);
