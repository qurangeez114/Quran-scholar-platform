// Madhhab Panel — loads as separate script, no conflicts
(function() {
  'use strict';

  var SB = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var AK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  var _topics = [], _rulings = {}, _loaded = false, _cat = 'all', _q = '';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function injectStyles() {
    if (document.getElementById('mp-styles')) return;
    var style = document.createElement('style');
    style.id = 'mp-styles';
    style.textContent = [
      '#mp-panel{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99990;display:flex;flex-direction:column;background:#FDFAF4;transform:translateY(100%);transition:transform 0.3s ease;pointer-events:none;}',
      '#mp-panel.mp-open{transform:translateY(0);pointer-events:auto;}',
      '#mp-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#FDF5DE;border-bottom:1.5px solid #E8DDC0;flex-shrink:0;}',
      '#mp-head h2{margin:0;font-size:17px;color:#B8902A;font-family:serif;flex:1;}',
      '#mp-search-wrap{padding:8px 12px;background:#fff;border-bottom:1px solid #E8E4DC;flex-shrink:0;}',
      '#mp-search-inp{width:100%;padding:8px 12px;border:1.5px solid #D4C9A8;border-radius:20px;font-size:14px;background:#FDFAF4;outline:none;box-sizing:border-box;}',
      '#mp-cats{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;flex-shrink:0;background:#FDFAF4;border-bottom:1px solid #E8E4DC;}',
      '.mp-cat{padding:4px 12px;border-radius:16px;border:1.5px solid #D4C9A8;background:#fff;font-size:11px;font-weight:700;color:#666;white-space:nowrap;cursor:pointer;flex-shrink:0;}',
      '.mp-cat.mp-active{background:#B8902A;color:#fff;border-color:#B8902A;}',
      '#mp-body{flex:1;overflow-y:auto;padding:12px;}',
      '.mp-card{background:#fff;border:1px solid #E8E4DC;border-radius:10px;margin-bottom:10px;overflow:hidden;}',
      '.mp-card-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;gap:8px;}',
      '.mp-card-title{font-size:14px;font-weight:700;color:#333;flex:1;}',
      '.mp-card-cat{font-size:10px;color:#B8902A;font-weight:600;margin-top:2px;}',
      '.mp-arr{font-size:16px;color:#B8902A;transition:transform 0.2s;flex-shrink:0;}',
      '.mp-arr.mp-open{transform:rotate(180deg);}',
      '.mp-card-body{display:none;padding:0 14px 14px;}',
      '.mp-card-body.mp-open{display:block;}',
      '.mp-school{margin-bottom:8px;padding:8px 10px;background:#FDFAF4;border-radius:8px;border-left:3px solid #D4A830;}',
      '.mp-school-name{font-size:11px;font-weight:700;color:#B8902A;margin-bottom:3px;text-transform:uppercase;}',
      '.mp-school-text{font-size:13px;color:#333;line-height:1.6;}',
      '.mp-empty{text-align:center;padding:40px;color:#aaa;font-size:14px;}'
    ].join('');
    document.head.appendChild(style);
  }

  function injectPanel() {
    if (document.getElementById('mp-panel')) return;
    var div = document.createElement('div');
    div.id = 'mp-panel';
    div.innerHTML = [
      '<div id="mp-head">',
      '  <span style="font-size:20px">⚖️</span>',
      '  <h2>Madhhab Scholar</h2>',
      '  <button id="mp-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999">✕</button>',
      '  <a href="madhhab.html" style="background:#B8902A;color:#fff;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:700;text-decoration:none">Full Page ↗</a>',
      '</div>',
      '<div id="mp-search-wrap"><input id="mp-search-inp" placeholder="🔍 Search topics..."></div>',
      '<div id="mp-cats"><div class="mp-cat mp-active" data-cat="all">All</div></div>',
      '<div id="mp-body"><div class="mp-empty">Loading topics...</div></div>'
    ].join('');
    document.body.appendChild(div);

    document.getElementById('mp-close').addEventListener('click', closePanel);
    document.getElementById('mp-search-inp').addEventListener('input', function() {
      _q = this.value;
      render();
    });
    document.getElementById('mp-cats').addEventListener('click', function(e) {
      var chip = e.target.closest('.mp-cat');
      if (!chip) return;
      _cat = chip.dataset.cat;
      document.querySelectorAll('.mp-cat').forEach(function(c) { c.classList.remove('mp-active'); });
      chip.classList.add('mp-active');
      render();
    });
  }

  function openPanel(topicId) {
    injectStyles();
    injectPanel();
    document.getElementById('mp-panel').classList.add('mp-open');
    document.body.style.overflow = 'hidden';
    if (!_loaded) {
      loadTopics().then(function() {
        if (topicId) scrollToTopic(topicId);
      });
    } else if (topicId) {
      scrollToTopic(topicId);
    }
  }

  function closePanel() {
    var panel = document.getElementById('mp-panel');
    if (panel) panel.classList.remove('mp-open');
    document.body.style.overflow = '';
  }

  function loadTopics() {
    return fetch(SB + '/rest/v1/madhhab_topics?select=id,topic,category&order=category,topic&limit=2000', {
      headers: { 'apikey': AK, 'Authorization': 'Bearer ' + AK }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _topics = data;
      _loaded = true;
      buildCats();
      render();
    })
    .catch(function(e) {
      document.getElementById('mp-body').innerHTML = '<div class="mp-empty">Error loading: ' + e.message + '</div>';
    });
  }

  function buildCats() {
    var seen = {}, cats = [];
    _topics.forEach(function(t) {
      if (!seen[t.category]) { seen[t.category] = 1; cats.push(t.category); }
    });
    cats.sort();
    var bar = document.getElementById('mp-cats');
    cats.forEach(function(cat) {
      var c = document.createElement('div');
      c.className = 'mp-cat';
      c.dataset.cat = cat;
      c.textContent = cat;
      bar.appendChild(c);
    });
  }

  function render() {
    var body = document.getElementById('mp-body');
    if (!body) return;
    var topics = _topics.slice();
    if (_cat !== 'all') topics = topics.filter(function(t) { return t.category === _cat; });
    if (_q) {
      var q = _q.toLowerCase();
      topics = topics.filter(function(t) {
        return t.topic.toLowerCase().indexOf(q) !== -1 || t.category.toLowerCase().indexOf(q) !== -1;
      });
    }
    if (!topics.length) { body.innerHTML = '<div class="mp-empty">No topics found.</div>'; return; }
    var show = topics.slice(0, 100);
    body.innerHTML = show.map(function(t) {
      return '<div class="mp-card" id="mpc-' + t.id + '">' +
        '<div class="mp-card-head" data-id="' + t.id + '">' +
          '<div><div class="mp-card-title">' + esc(t.topic) + '</div>' +
          '<div class="mp-card-cat">' + esc(t.category) + '</div></div>' +
          '<span class="mp-arr" id="mpa-' + t.id + '">▼</span>' +
        '</div>' +
        '<div class="mp-card-body" id="mpb-' + t.id + '"></div>' +
      '</div>';
    }).join('') + (topics.length > 100 ? '<div class="mp-empty">Showing 100 of ' + topics.length + '. Search to narrow.</div>' : '');

    body.addEventListener('click', function(e) {
      var head = e.target.closest('.mp-card-head');
      if (head) toggleCard(parseInt(head.dataset.id));
    });
  }

  function toggleCard(id) {
    var body = document.getElementById('mpb-' + id);
    var arr = document.getElementById('mpa-' + id);
    if (!body) return;
    var isOpen = body.classList.contains('mp-open');
    if (isOpen) { body.classList.remove('mp-open'); arr.classList.remove('mp-open'); return; }
    body.classList.add('mp-open'); arr.classList.add('mp-open');
    if (_rulings[id]) { body.innerHTML = _rulings[id]; return; }
    body.innerHTML = '<div style="color:#aaa;padding:8px;font-size:13px">Loading...</div>';
    fetch(SB + '/rest/v1/madhhab_rulings?topic_id=eq.' + id + '&select=hanafi_position,maliki_position,shafii_position,hanbali_position,jafari_position,zaydi_position,ibadi_position,salafi_position,consensus,key_disagreement,historical_consequences', {
      headers: { 'apikey': AK, 'Authorization': 'Bearer ' + AK }
    })
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      var r = rows[0];
      if (!r) { body.innerHTML = '<div style="color:#aaa;padding:8px">No ruling found.</div>'; return; }
      var schools = [
        ['Hanafi', r.hanafi_position], ['Maliki', r.maliki_position],
        ['Shafii', r.shafii_position], ['Hanbali', r.hanbali_position],
        ['Jafari', r.jafari_position], ['Zaydi', r.zaydi_position],
        ['Ibadi', r.ibadi_position], ['Salafi', r.salafi_position]
      ].filter(function(s) { return s[1]; });
      var html = schools.map(function(s) {
        return '<div class="mp-school"><div class="mp-school-name">' + s[0] + '</div><div class="mp-school-text">' + esc(s[1]) + '</div></div>';
      }).join('');
      if (r.consensus) html += '<div class="mp-school" style="border-left-color:#4CAF50"><div class="mp-school-name" style="color:#2E7D32">Consensus</div><div class="mp-school-text">' + esc(r.consensus) + '</div></div>';
      if (r.historical_consequences) html += '<div class="mp-school" style="border-left-color:#c62828"><div class="mp-school-name" style="color:#c62828">Historical Impact</div><div class="mp-school-text">' + esc(r.historical_consequences) + '</div></div>';
      html += '<a href="madhhab.html?topic=' + id + '" style="display:inline-block;margin-top:8px;padding:6px 14px;background:#FDF5DE;border:1.5px solid #D4A830;border-radius:16px;font-size:12px;font-weight:700;color:#B8902A;text-decoration:none">Open Full Page ↗</a>';
      _rulings[id] = html;
      body.innerHTML = html;
    })
    .catch(function(e) { body.innerHTML = '<div style="color:#c62828;padding:8px">Error: ' + e.message + '</div>'; });
  }

  function scrollToTopic(id) {
    setTimeout(function() {
      var el = document.getElementById('mpc-' + id);
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); toggleCard(id); }
    }, 400);
  }

  // Expose globally
  window.openMadhhabPanel = openPanel;
  window.closeMadhhabPanel = closePanel;

})();
