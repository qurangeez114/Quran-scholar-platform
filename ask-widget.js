/* ═══════════════════════════════════════════════════════════
   ASK QURAN HIKMA — site-wide AI chat widget
   Searches the platform's own database first, falls back to
   general knowledge (clearly labeled) only when nothing relevant
   exists. Floating widget, available on every page.
   ═══════════════════════════════════════════════════════════ */
(function () {
  console.log('ask-widget.js loaded');

  var SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  var HDRS = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  var MAX_MSGS_PER_SESSION = 20; // simple client-side rate guard
  var msgCount = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function sbSearch(table, columns, query, words, limit) {
    try {
      var orClauses = columns.map(function (col) {
        return words.map(function (w) { return col + '.ilike.*' + encodeURIComponent(w) + '*'; }).join(',');
      }).join(',');
      var url = SB_URL + '/rest/v1/' + table + '?select=*&or=(' + orClauses + ')&limit=' + limit;
      var r = await fetch(url, { headers: HDRS });
      if (!r.ok) return [];
      return await r.json();
    } catch (e) { return []; }
  }

  async function searchAllTables(question) {
    var words = question.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; }).slice(0, 6);
    if (!words.length) return {};

    var results = {};
    var [topics, ayas, tafsir, hadith, sira, stories, themes, tensions, thematicXref, hadithAnalysis] = await Promise.all([
      sbSearch('madhhab_topics', ['topic', 'brief_description'], question, words, 4),
      sbSearch('ayas', ['translation_en'], question, words, 4),
      sbSearch('tafsir_entries', ['text_english'], question, words, 3),
      sbSearch('hadith_corpus', ['text_english'], question, words, 3),
      sbSearch('sira_events', ['title_en', 'description_en'], question, words, 3),
      sbSearch('quranic_stories', ['title_en', 'summary'], question, words, 3),
      sbSearch('themes', ['name', 'description'], question, words, 3),
      sbSearch('tensions', ['name'], question, words, 3),
      sbSearch('thematic_cross_references_v2', ['theme', 'reason'], question, words, 3),
      sbSearch('hadith_analysis', ['hadith_text', 'potential_concerns'], question, words, 3)
    ]);
    if (topics.length) results.madhhab_topics = topics;
    if (ayas.length) results.ayas = ayas;
    if (tafsir.length) results.tafsir = tafsir;
    if (hadith.length) results.hadith = hadith;
    if (sira.length) results.sira = sira;
    if (stories.length) results.stories = stories;
    if (themes.length) results.themes = themes;
    if (tensions.length) results.tensions = tensions;
    if (thematicXref.length) results.thematic_cross_references = thematicXref;
    if (hadithAnalysis.length) results.hadith_analysis = hadithAnalysis;
    return results;
  }

  function buildSystemPrompt(searchResults) {
    var hasResults = Object.keys(searchResults).length > 0;
    var contextBlock = hasResults
      ? 'DATABASE SEARCH RESULTS (use these as your primary source; cite which table/item each fact comes from):\n' + JSON.stringify(searchResults).slice(0, 6000)
      : 'No matching content was found in the Quran Hikma database for this question.';

    return 'You are the "Ask Quran Hikma" assistant embedded on quranhikma.com, a Quran scholarship research platform. ' +
      'Answer the user\'s question using the DATABASE SEARCH RESULTS below whenever they are relevant — cite which item/table each fact is drawn from (e.g. "According to our Madhhab Comparison on X..."). ' +
      'If the search results are empty or not actually relevant to the question, answer from general knowledge instead, but you MUST clearly prefix that answer with "Note: this isn\'t in our database — general knowledge:" so the user knows the difference. ' +
      'Keep answers concise (3-6 sentences) and offer to link to the relevant page/topic if one exists. ' +
      'Never fabricate citations, verse numbers, or hadith references that are not present in the search results or that you are not highly confident about. ' +
      'Do not provide content involving sexualization of minors, operational/procedural detail on harmful practices, or anything outside respectful academic/religious discussion.\n\n' + contextBlock;
  }

  function widgetHTML() {
    return '' +
      '<div id="askqh-dock" style="position:fixed;left:0;right:0;bottom:54px;z-index:9000;background:#fdfaf3;border-top:1.5px solid #d5c9a8;box-shadow:0 -2px 10px rgba(0,0,0,.08);font-family:\'EB Garamond\',serif;transition:height .22s ease;">' +
        '<div id="askqh-dockhead" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;">' +
          '<span style="font-size:16px;">💬</span>' +
          '<span style="font-family:\'Inconsolata\',monospace;font-size:11.5px;letter-spacing:.05em;color:#7a6f5c;flex:1;">Ask Quran Hikma — verses, hadith, madhhab comparisons…</span>' +
          '<span id="askqh-caret" style="color:#8a6d3b;font-size:13px;">▲</span>' +
        '</div>' +
        '<div id="askqh-body" style="display:none;flex-direction:column;height:340px;max-height:55vh;border-top:1px solid #e4d9c0;">' +
          '<div id="askqh-msgs" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;font-size:14.5px;line-height:1.5;">' +
            '<div style="color:#7a6f5c;font-style:italic;">Ask about any verse, hadith, madhhab comparison, story, or theme on this site. I\'ll search our database first.</div>' +
          '</div>' +
          '<button id="askqh-summarize" style="display:none;margin:0 10px 8px;padding:8px;background:#fff;border:1px solid #8a6d3b;color:#8a6d3b;border-radius:4px;cursor:pointer;font-family:\'Inconsolata\',monospace;font-size:11.5px;">📊 Build presentation from this chat</button>' +
          '<div style="display:flex;gap:6px;padding:10px;border-top:1px solid #e4d9c0;">' +
            '<input id="askqh-input" type="text" placeholder="Ask a question…" style="flex:1;padding:8px 10px;border:1px solid #d5c9a8;border-radius:4px;font-family:inherit;font-size:14px;">' +
            '<button id="askqh-send" style="padding:0 14px;background:#8a6d3b;color:#fff;border:none;border-radius:4px;cursor:pointer;">Go</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function appendMsg(role, html) {
    var msgs = document.getElementById('askqh-msgs');
    var div = document.createElement('div');
    div.style.cssText = role === 'user'
      ? 'align-self:flex-end;background:#e4d9c0;padding:8px 12px;border-radius:10px 10px 2px 10px;max-width:85%;'
      : 'align-self:flex-start;background:#f0ebe0;padding:8px 12px;border-radius:10px 10px 10px 2px;max-width:90%;';
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  var conversationLog = []; // { question, answer, searchResults } per exchange, this session only

  function addToPresentationBasket(item) {
    try {
      var basket = JSON.parse(localStorage.getItem('presentationBasket') || '[]');
      if (!Array.isArray(basket)) basket = [];
      basket.push(item);
      localStorage.setItem('presentationBasket', JSON.stringify(basket));
      return true;
    } catch (e) { return false; }
  }

  async function buildSessionSummary() {
    if (!conversationLog.length) return;
    var btn = document.getElementById('askqh-summarize');
    if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }

    var transcript = conversationLog.map(function (turn, i) {
      return 'Q' + (i + 1) + ': ' + turn.question + '\nA' + (i + 1) + ': ' + turn.answer;
    }).join('\n\n');

    try {
      var resp = await fetch('/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 900,
          system: 'You are summarizing a user\'s research conversation on quranhikma.com into a structured, deeply-researched summary suitable for a presentation slide deck. ' +
            'Organize by theme. Include specific citations (verse numbers, hadith references, madhhab names) that appeared in the conversation. ' +
            'Respond ONLY with valid JSON, no markdown fences, in this exact shape: ' +
            '{"title": "short title for this research session", "sections": [{"heading": "...", "summary": "2-4 sentences", "key_points": ["...", "..."]}]}',
          messages: [{ role: 'user', content: transcript }]
        })
      });
      if (!resp.ok) throw new Error('API error: ' + resp.status);
      var data = await resp.json();
      var text = (data.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
      var clean = text.replace(/```json|```/g, '').trim();
      var parsed = JSON.parse(clean);

      addToPresentationBasket({
        type: 'research',
        reference: 'Ask Quran Hikma — ' + new Date().toLocaleDateString(),
        title: parsed.title || 'Research Session Summary',
        text: (parsed.sections || []).map(function (s) {
          return s.heading + ': ' + s.summary + (s.key_points && s.key_points.length ? ' (' + s.key_points.join('; ') + ')' : '');
        }).join('\n\n')
      });

      appendMsg('assistant', '✅ Added a structured summary of this conversation to your <strong>Presentation Basket</strong>. Visit the Presentation Builder to view, edit, or export it.');
    } catch (e) {
      appendMsg('assistant', '<span style="color:#a33">Could not build summary (' + esc(e.message) + '). Please try again.</span>');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📊 Build presentation from this chat'; }
    }
  }

  async function handleAsk() {
    var input = document.getElementById('askqh-input');
    var question = (input.value || '').trim();
    if (!question) return;
    if (msgCount >= MAX_MSGS_PER_SESSION) {
      appendMsg('assistant', 'You\'ve reached the question limit for this session. Please refresh the page to continue, or browse the site\'s existing pages directly.');
      return;
    }
    msgCount++;
    input.value = '';
    appendMsg('user', esc(question));
    var loadingDiv = appendMsg('assistant', '<em style="color:#998">Searching our database…</em>');

    try {
      var searchResults = await searchAllTables(question);
      loadingDiv.innerHTML = '<em style="color:#998">Thinking…</em>';

      var resp = await fetch('/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 500,
          system: buildSystemPrompt(searchResults),
          messages: [{ role: 'user', content: question }]
        })
      });
      if (!resp.ok) throw new Error('API error: ' + resp.status);
      var data = await resp.json();
      var text = (data.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n');
      loadingDiv.innerHTML = esc(text).replace(/\n/g, '<br>');
      conversationLog.push({ question: question, answer: text });
      var sumBtn = document.getElementById('askqh-summarize');
      if (sumBtn) sumBtn.style.display = 'block';
    } catch (e) {
      loadingDiv.innerHTML = '<span style="color:#a33">Sorry, something went wrong (' + esc(e.message) + '). Please try again.</span>';
    }
  }

  function init() {
    // TEMP DIAGNOSTIC — remove once widget visibility is confirmed
    var testMarker = document.createElement('div');
    testMarker.id = 'askqh-test-marker';
    testMarker.textContent = 'ASK WIDGET LOADED';
    testMarker.style.cssText = 'position:fixed;bottom:80px;left:10px;z-index:999999;background:#ff0000;color:#fff;padding:6px 10px;font-family:monospace;font-size:12px;border-radius:4px;';
    document.body.appendChild(testMarker);

    var wrap = document.createElement('div');
    wrap.id = 'askqh-root';
    wrap.innerHTML = widgetHTML();
    // Move children directly onto <body> rather than leaving them nested
    // inside this wrapper — an unstyled ancestor can break position:fixed
    // if any parent in the chain has a transform/filter applied.
    while (wrap.firstChild) {
      document.body.appendChild(wrap.firstChild);
    }

    var head = document.getElementById('askqh-dockhead');
    var body = document.getElementById('askqh-body');
    var caret = document.getElementById('askqh-caret');
    var expanded = false;

    function setExpanded(val) {
      expanded = val;
      body.style.display = expanded ? 'flex' : 'none';
      caret.textContent = expanded ? '▼' : '▲';
      if (expanded) document.getElementById('askqh-input').focus();
    }

    head.addEventListener('click', function () { setExpanded(!expanded); });
    document.getElementById('askqh-send').addEventListener('click', handleAsk);
    document.getElementById('askqh-summarize').addEventListener('click', buildSessionSummary);
    document.getElementById('askqh-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleAsk();
      e.stopPropagation(); // don't let typing re-toggle the dock header
    });

    console.log('Ask widget mounted', {
      dockInDOM: !!document.getElementById('askqh-dock'),
      dockRect: document.getElementById('askqh-dock') ? document.getElementById('askqh-dock').getBoundingClientRect() : null,
      dockComputedDisplay: document.getElementById('askqh-dock') ? getComputedStyle(document.getElementById('askqh-dock')).display : null,
      dockComputedVisibility: document.getElementById('askqh-dock') ? getComputedStyle(document.getElementById('askqh-dock')).visibility : null,
      dockComputedOpacity: document.getElementById('askqh-dock') ? getComputedStyle(document.getElementById('askqh-dock')).opacity : null
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
