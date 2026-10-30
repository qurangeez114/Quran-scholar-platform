/* ============================================================================
 * verse-suite.js — shared multilingual verse display suite
 * ----------------------------------------------------------------------------
 * One module, included by every page that renders verses. It auto-mounts on:
 *   - .verse-card[data-sura][data-aya]        (index.html, theme-reader.html)
 *   - .xref-item .xref-num / .xref-card .xref-ref / [data-vs-ref="s:a"]
 *                                              (Cross-Refs tab, quran-crossref.html)
 * and watches the DOM (MutationObserver) so lists rendered later get it too.
 *
 * Features: language radiogroup (Arabic + every language in verse_translations,
 * discovered live), copy, share (navigator.share or deep link with &lang=),
 * social-card generator (canvas, 3 formats), Listen (pluggable audio provider;
 * Web Speech TTS placeholder), Add to Presentation (localStorage decks,
 * managed in verse-deck.html), Research drawer (xrefs, themes, tafsir, tension).
 *
 * Read-only against Supabase (anon key, GET only). Existing verse-toolbar.js
 * behaviours are untouched; this adds a separate bar beneath them.
 * ========================================================================== */
(function (W) {
  'use strict';
  if (W.VerseSuite) return;

  var SB = 'https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1/';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  var HDR = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  var LS_LANG = 'vs_lang', LS_RATE = 'vs_tts_rate', LS_DECKS = 'vs_decks';

  /* Labels for verse_translations.lang codes. The list actually offered is
     whatever the DB returns for 1:1 (see discoverLangs); unknown codes still
     appear, labelled by code. 'ti2' is the Tigrinya explanatory text
     (tafsir-style paraphrase, ayas.tigrinya2) and is excluded as it is not a
     translation. */
  var LABELS = {
    ar: ['Arabic', 'العربية'], en: ['English', 'English'], ti: ['Tigrinya', 'ትግርኛ'], am: ['Amharic', 'አማርኛ'],
    om: ['Oromo', 'Afaan Oromoo'], so: ['Somali', 'Soomaali'], tr: ['Turkish', 'Türkçe'], de: ['German', 'Deutsch'],
    fr: ['French', 'Français'], es: ['Spanish', 'Español'], sv: ['Swedish', 'Svenska'], no: ['Norwegian', 'Norsk'],
    ur: ['Urdu', 'اردو'], fa: ['Persian', 'فارسی'], bn: ['Bengali', 'বাংলা'], id: ['Indonesian', 'Bahasa Indonesia'],
    ms: ['Malay', 'Bahasa Melayu'], zh: ['Chinese', '中文'], sw: ['Swahili', 'Kiswahili'], ha: ['Hausa', 'Hausa']
  };
  var EXCLUDE = { ti2: 1 };
  var RTL = { ar: 1, ur: 1, fa: 1 };
  var ETH = { ti: 1, am: 1 };
  var FALLBACK_LANGS = ['ar', 'en', 'ti', 'am', 'om', 'so', 'tr', 'de', 'fr', 'es', 'sv', 'no', 'ur', 'fa', 'bn', 'id', 'ms', 'zh', 'sw', 'ha'];

  var langs = FALLBACK_LANGS.slice();
  var cache = {};          // 'lang|s:a' -> text
  var surahs = null;       // id -> {ar, en}
  var curLang = 'ar';

  /* ---------------- utilities ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function label(l) { return (LABELS[l] || [l, l])[0]; }
  function native(l) { return (LABELS[l] || [l, l])[1]; }
  function ref(s, a) { return 'Quran ' + s + ':' + a; }
  function get(path) {
    return fetch(SB + path, { headers: HDR }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function clean(t) { return String(t || '').replace(/^\uFEFF/, '').trim(); }

  var live, toastEl;
  function announce(msg) {
    if (!live) { live = document.createElement('div'); live.className = 'vs-sr'; live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); live.id = 'vs-live'; document.body.appendChild(live); }
    live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30);
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'vs-toast'; toastEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && W.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); ok ? res() : rej(new Error('copy failed'));
    });
  }

  /* ---------------- data ---------------- */
  function discoverLangs() {
    return get('verse_translations?select=lang&verse_key=eq.1:1').then(function (rows) {
      var found = {}; rows.forEach(function (r) { if (!EXCLUDE[r.lang]) found[r.lang] = 1; });
      var ordered = FALLBACK_LANGS.filter(function (l) { return l === 'ar' || found[l]; });
      Object.keys(found).sort().forEach(function (l) { if (ordered.indexOf(l) < 0) ordered.push(l); });
      if (ordered.length > 1) langs = ordered;
    }).catch(function (e) { console.warn('verse-suite: language discovery failed, using fallback list', e); });
  }
  function loadSurahs() {
    if (surahs) return Promise.resolve(surahs);
    return get('surahs?select=id,name_arabic,name_english&order=id').then(function (rows) {
      surahs = {}; rows.forEach(function (r) { surahs[r.id] = { ar: r.name_arabic, en: r.name_english }; }); return surahs;
    }).catch(function () { surahs = {}; return surahs; });
  }
  function surahName(s) { return (surahs && surahs[s] && surahs[s].en) || ('Surah ' + s); }

  /* Batch-fetch text for a list of 's:a' keys in one language. Arabic comes
     from ayas.arabic (canonical Hafs), everything else from verse_translations. */
  /* Host-provided text. A page that already has a verse's text can hand it
     over so no request is made for it:
       window.VerseSuiteTexts = { en: { '2:62': '…' } }   (fill any time, before or after load)
       VerseSuite.provideTexts('en', { '2:62': '…' })
       <el data-sura="2" data-aya="62" data-vs-text-en="…">
     Blank values are ignored, so missing text still falls through to a fetch. */
  function provideTexts(lang, map) {
    if (!lang || !map) return;
    Object.keys(map).forEach(function (k) { var t = map[k]; if (typeof t === 'string' && t.trim() && !((lang + '|' + k) in cache && cache[lang + '|' + k])) cache[lang + '|' + k] = clean(t); });
  }
  function harvest(keys, lang) {
    var shared = W.VerseSuiteTexts && W.VerseSuiteTexts[lang];
    if (shared) provideTexts(lang, shared);
    if (!/^[a-z]{2,3}$/.test(lang)) return;
    var attr = 'data-vs-text-' + lang, m = {};
    document.querySelectorAll('[data-sura][data-aya][' + attr + ']').forEach(function (el) { m[el.getAttribute('data-sura') + ':' + el.getAttribute('data-aya')] = el.getAttribute(attr); });
    provideTexts(lang, m);
  }
  function fetchTexts(keys, lang) {
    harvest(keys, lang);
    var need = keys.filter(function (k) { return !((lang + '|' + k) in cache); });
    need = need.filter(function (k, i) { return need.indexOf(k) === i; });
    if (!need.length) return Promise.resolve();
    var chunks = []; for (var i = 0; i < need.length; i += 60) chunks.push(need.slice(i, i + 60));
    return Promise.all(chunks.map(function (ch) {
      var p;
      if (lang === 'ar') {
        var bySura = {};
        ch.forEach(function (k) { var x = k.split(':'); (bySura[x[0]] = bySura[x[0]] || []).push(x[1]); });
        var ors = Object.keys(bySura).map(function (s) { return 'and(sura_id.eq.' + s + ',aya_number.in.(' + bySura[s].join(',') + '))'; });
        p = get('ayas?select=sura_id,aya_number,arabic&or=(' + ors.join(',') + ')').then(function (rows) {
          rows.forEach(function (r) { cache['ar|' + r.sura_id + ':' + r.aya_number] = clean(r.arabic); });
        });
      } else {
        p = get('verse_translations?select=verse_key,text&lang=eq.' + encodeURIComponent(lang) + '&verse_key=in.(' + ch.map(encodeURIComponent).join(',') + ')').then(function (rows) {
          rows.forEach(function (r) { cache[lang + '|' + r.verse_key] = clean(r.text); });
        });
      }
      return p.then(function () { ch.forEach(function (k) { if (!((lang + '|' + k) in cache)) cache[lang + '|' + k] = ''; }); });
    }));
  }
  function textOf(s, a, lang) { return cache[(lang || curLang) + '|' + s + ':' + a] || ''; }

  /* ---------------- language selector (WAI-ARIA radiogroup) ---------------- */
  function radiogroupHTML(id, sel) {
    return '<div class="vs-radiogroup" role="radiogroup" aria-label="Verse language" id="' + id + '">' +
      langs.map(function (l) {
        var on = l === sel;
        return '<button type="button" class="vs-radio" role="radio" data-lang="' + l + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '"' +
          ' lang="' + l + '" title="' + esc(label(l)) + '">' + esc(native(l)) + (native(l) !== label(l) ? ' <span class="vs-sr">(' + esc(label(l)) + ')</span>' : '') + '</button>';
      }).join('') + '</div>';
  }
  function wireRadiogroup(group, onPick) {
    group.addEventListener('click', function (e) { var b = e.target.closest('.vs-radio'); if (b) pick(b, false); });
    group.addEventListener('keydown', function (e) {
      var items = [].slice.call(group.querySelectorAll('.vs-radio'));
      var i = items.indexOf(document.activeElement); if (i < 0) return;
      var n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % items.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + items.length) % items.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = items.length - 1;
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(items[i], true); return; }
      if (n !== null) { e.preventDefault(); pick(items[n], true); }
    });
    function pick(b, focus) {
      group.querySelectorAll('.vs-radio').forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
      if (focus) b.focus();
      onPick(b.getAttribute('data-lang'));
    }
  }
  function syncRadiogroups() {
    document.querySelectorAll('.vs-radiogroup').forEach(function (g) {
      g.querySelectorAll('.vs-radio').forEach(function (x) { var on = x.getAttribute('data-lang') === curLang; x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
    });
  }

  function setLang(l, opts) {
    if (langs.indexOf(l) < 0 && FALLBACK_LANGS.indexOf(l) < 0) return Promise.resolve();
    curLang = l;
    try { localStorage.setItem(LS_LANG, l); } catch (e) {}
    syncRadiogroups();
    var fab = document.getElementById('vs-langfab'); if (fab) fab.textContent = '🌐 ' + native(l);
    if (!(opts && opts.silent)) announce('Showing ' + label(l));
    return renderAll();
  }

  /* ---------------- per-verse bar ---------------- */
  function barHTML(s, a) {
    var k = s + '-' + a;
    return '<div class="vs-text" id="vs-text-' + k + '" aria-live="off"><span class="vs-muted">Loading…</span></div>' +
      '<div class="vs-actions" role="toolbar" aria-label="Verse tools for ' + s + ':' + a + '">' +
      '<button type="button" class="vs-btn" data-vs="copy">📋 Copy</button>' +
      '<button type="button" class="vs-btn" data-vs="share">📤 Share</button>' +
      '<button type="button" class="vs-btn" data-vs="card">🖼 Card</button>' +
      '<button type="button" class="vs-btn" data-vs="listen" aria-pressed="false">▶ Listen</button>' +
      '<button type="button" class="vs-btn" data-vs="stop" aria-label="Stop audio" hidden>⏹</button>' +
      '<button type="button" class="vs-btn" data-vs="present">＋ Presentation <span class="vs-badge" aria-label="verses in deck">' + Deck.count() + '</span></button>' +
      '<button type="button" class="vs-btn" data-vs="research">🔎 Research</button>' +
      '</div>';
  }
  function paintText(el, s, a) {
    if (!el) return;
    var t = textOf(s, a);
    el.setAttribute('dir', RTL[curLang] ? 'rtl' : 'ltr'); el.setAttribute('lang', curLang);
    el.classList.toggle('vs-eth', !!ETH[curLang]);
    el.innerHTML = t ? esc(t) : '<span class="vs-muted">No ' + esc(label(curLang)) + ' text for this verse.</span>';
  }

  function mountCard(card) {
    if (card.__vs) return; card.__vs = 1;
    var s = +card.getAttribute('data-sura'), a = +card.getAttribute('data-aya'); if (!s || !a) return;
    var bar = document.createElement('div'); bar.className = 'vs-bar'; bar.setAttribute('data-vs-s', s); bar.setAttribute('data-vs-a', a);
    bar.innerHTML = barHTML(s, a);
    var tb = card.querySelector('.verse-actions');
    if (tb && tb.parentNode) tb.parentNode.insertBefore(bar, tb.nextSibling); else card.insertBefore(bar, card.firstChild);
    bar.addEventListener('click', function (e) { e.stopPropagation(); });
    wireActions(bar, s, a);
    queue(s, a);
  }
  function mountXref(btn, s, a) {
    if (btn.__vs) return; btn.__vs = 1;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vs-btn vs-xref-tools';
    b.textContent = '⋯ Tools'; b.setAttribute('aria-label', 'Verse tools for ' + s + ':' + a);
    b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); openPanel(s, a, b); });
    btn.parentNode.insertBefore(b, btn.nextSibling);
  }

  function wireActions(root, s, a) {
    root.querySelectorAll('[data-vs]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var act = b.getAttribute('data-vs');
        if (act === 'copy') doCopy(s, a);
        else if (act === 'share') doShare(s, a);
        else if (act === 'card') openCard(s, a, b);
        else if (act === 'listen') Audio.toggle(s, a, b);
        else if (act === 'stop') Audio.stop();
        else if (act === 'present') addToDeck(s, a);
        else if (act === 'research') openResearch(s, a, b);
      });
    });
  }

  var pend = {}, pendT;
  function queue(s, a) { pend[s + ':' + a] = 1; clearTimeout(pendT); pendT = setTimeout(flush, 40); }
  function flush() {
    var keys = Object.keys(pend); pend = {}; if (!keys.length) return;
    fetchTexts(keys, curLang).then(function () { keys.forEach(function (k) { var x = k.split(':'); paintText(document.getElementById('vs-text-' + x[0] + '-' + x[1]), x[0], x[1]); }); })
      .catch(function (e) { console.warn('verse-suite: text fetch failed', e); keys.forEach(function (k) { var el = document.getElementById('vs-text-' + k.replace(':', '-')); if (el) el.innerHTML = '<span class="vs-muted">Could not load text.</span>'; }); });
  }
  function renderAll() {
    var els = [].slice.call(document.querySelectorAll('.vs-text[id^="vs-text-"]'));
    var keys = els.map(function (el) { return el.id.slice(8).replace('-', ':'); });
    return fetchTexts(keys, curLang).then(function () { els.forEach(function (el) { var x = el.id.slice(8).split('-'); paintText(el, x[0], x[1]); }); });
  }

  function scan(root) {
    (root.querySelectorAll ? root : document).querySelectorAll('.verse-card[data-sura][data-aya]').forEach(mountCard);
    var refRe = /^\s*(\d{1,3}):(\d{1,3})/;
    document.querySelectorAll('.xref-item .xref-num, .xref-card .xref-ref, [data-vs-ref]').forEach(function (el) {
      var m = refRe.exec(el.getAttribute('data-vs-ref') || el.textContent || ''); if (m) mountXref(el, +m[1], +m[2]);
    });
  }

  /* ---------------- copy / share ---------------- */
  function verseText(s, a, lang) {
    lang = lang || curLang;
    return fetchTexts([s + ':' + a], lang).then(function () { return textOf(s, a, lang); });
  }
  function doCopy(s, a, lang) {
    lang = lang || curLang;
    return verseText(s, a, lang).then(function (t) {
      var out = (t || '') + '\n— ' + ref(s, a) + ' (' + surahName(s) + ')' + (lang !== 'ar' ? ' · ' + label(lang) : '');
      return copyText(out).then(function () { announce('Copied ' + ref(s, a)); }, function () { announce('Copy failed — select the text manually'); });
    });
  }
  function deepLink(s, a, lang) {
    var u = new URL('index.html', location.href);
    u.search = '?sura=' + s + '&aya=' + a + '&lang=' + (lang || curLang);
    return u.href;
  }
  function doShare(s, a, lang) {
    lang = lang || curLang;
    var url = deepLink(s, a, lang);
    return verseText(s, a, lang).then(function (t) {
      var data = { title: ref(s, a), text: (t ? t + '\n— ' : '') + ref(s, a), url: url };
      if (navigator.share) {
        return navigator.share(data).then(function () { announce('Shared'); }, function (e) {
          if (e && e.name === 'AbortError') return;
          return copyText(url).then(function () { announce('Link copied'); });
        });
      }
      return copyText(url).then(function () { announce('Link copied: ' + ref(s, a)); }, function () { announce('Share failed'); });
    });
  }

  /* ---------------- modal helpers: focus trap + Esc ---------------- */
  var openStack = [];
  function openDialog(html, opener, opts) {
    var ov = document.createElement('div'); ov.className = opts && opts.drawer ? '' : 'vs-overlay';
    var box = document.createElement('div');
    box.className = opts && opts.drawer ? 'vs-drawer' : 'vs-modal';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    var hid = 'vs-dlg-' + Date.now(); box.setAttribute('aria-labelledby', hid);
    box.innerHTML = html.replace('%HID%', hid);
    ov.appendChild(box); document.body.appendChild(ov);
    var entry = { ov: ov, box: box, opener: opener, onClose: opts && opts.onClose };
    openStack.push(entry);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeDialog(entry); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(box.querySelectorAll('button:not([disabled]):not([hidden]),a[href],select,input,textarea,[tabindex="0"],summary')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    if (!(opts && opts.drawer)) ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeDialog(entry); });
    box.querySelectorAll('[data-vs-close]').forEach(function (b) { b.addEventListener('click', function () { closeDialog(entry); }); });
    setTimeout(function () { var f = box.querySelector('[data-vs-close]') || box.querySelector('button'); if (f) f.focus(); }, 20);
    return entry;
  }
  function closeDialog(entry) {
    var i = openStack.indexOf(entry); if (i >= 0) openStack.splice(i, 1);
    Audio.stop();
    if (entry.onClose) try { entry.onClose(); } catch (e) {}
    entry.ov.remove();
    if (entry.opener && entry.opener.focus) entry.opener.focus();
  }

  /* ---------------- verse panel (for cross-ref list items) ---------------- */
  function openPanel(s, a, opener) {
    var k = s + '-' + a;
    var d = openDialog('<button type="button" class="vs-btn vs-close" data-vs-close aria-label="Close">✕</button>' +
      '<h2 id="%HID%">' + esc(ref(s, a)) + ' · ' + esc(surahName(s)) + '</h2>' +
      radiogroupHTML('vs-rg-panel', curLang) +
      '<div class="vs-bar" style="margin:0">' + barHTML(s, a).replace('id="vs-text-' + k + '"', 'id="vs-ptext-' + k + '"') + '</div>', opener);
    wireRadiogroup(d.box.querySelector('.vs-radiogroup'), function (l) { setLang(l).then(paint); });
    wireActions(d.box, s, a);
    function paint() { fetchTexts([s + ':' + a], curLang).then(function () { paintText(d.box.querySelector('#vs-ptext-' + k), s, a); }); }
    paint();
  }

  /* ---------------- social card ---------------- */
  var FORMATS = { square: { w: 1080, h: 1080, label: 'Square 1080×1080' }, story: { w: 1080, h: 1920, label: 'Story 1080×1920' }, landscape: { w: 1200, h: 630, label: 'Landscape 1200×630' } };
  var CARD = { a: '#061229', b: '#12356E', primary: '#FFD640', text: '#FFE97A', border: 'rgba(255,214,64,0.90)' }; // social-card.js "Midnight Gold"
  function fontFor(lang) {
    if (lang === 'ar' || lang === 'fa') return "'Amiri','Scheherazade New',serif";
    if (lang === 'ur') return "'Noto Nastaliq Urdu','Amiri',serif";
    if (ETH[lang]) return "'Noto Sans Ethiopic',sans-serif";
    return "'EB Garamond',Georgia,serif";
  }
  function ensureFonts(lang) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var fam = fontFor(lang).split(',')[0];
    var sample = lang === 'ar' ? 'بسم' : (ETH[lang] ? 'ብስም' : 'Quran');
    return Promise.all([document.fonts.load('700 40px ' + fam, sample), document.fonts.load('700 40px Lato', 'Q')]).catch(function () {}).then(function () { return document.fonts.ready; });
  }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
      while (ctx.measureText(line).width > maxW && line.length > 1) { // very long token (e.g. Chinese)
        var cut = line.length - 1; while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) cut--;
        lines.push(line.slice(0, cut)); line = line.slice(cut);
      }
    });
    if (line) lines.push(line); return lines;
  }
  /* Draw onto a canvas. Auto-sizes the font: largest size whose wrapped
     block fits the text area, down to a floor; beyond that it truncates with … */
  function drawCard(cv, fmt, s, a, lang, text) {
    var F = FORMATS[fmt]; cv.width = F.w; cv.height = F.h;
    var ctx = cv.getContext('2d'), Wd = F.w, H = F.h;
    var g = ctx.createLinearGradient(0, 0, Wd, H); g.addColorStop(0, CARD.a); g.addColorStop(1, CARD.b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, H);
    var pad = Math.round(Math.min(Wd, H) * 0.06);
    ctx.strokeStyle = CARD.border; ctx.lineWidth = 4; ctx.strokeRect(pad / 2, pad / 2, Wd - pad, H - pad);
    ctx.lineWidth = 1.5; ctx.strokeRect(pad / 2 + 10, pad / 2 + 10, Wd - pad - 20, H - pad - 20);
    var rtl = !!RTL[lang]; ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = 'center';
    var top = pad * 2.2, bottom = H - pad * 2.8, maxW = Wd - pad * 3.2, fam = fontFor(lang);
    var size = Math.round(Math.min(Wd, H) * (lang === 'ar' ? 0.085 : 0.07)), lines, lh;
    for (; size >= 22; size -= 2) {
      ctx.font = (lang === 'ar' ? '700 ' : '500 ') + size + 'px ' + fam;
      lh = size * (lang === 'ar' ? 1.75 : 1.4); lines = wrap(ctx, text, maxW);
      if (lines.length * lh <= bottom - top) break;
    }
    var maxLines = Math.floor((bottom - top) / lh);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + ' …'; }
    ctx.fillStyle = CARD.text; ctx.textBaseline = 'middle';
    var y0 = top + ((bottom - top) - lines.length * lh) / 2 + lh / 2;
    lines.forEach(function (ln, i) { ctx.fillText(ln, Wd / 2, y0 + i * lh); });
    ctx.direction = 'ltr';
    ctx.fillStyle = CARD.primary; ctx.font = '700 ' + Math.round(Math.min(Wd, H) * 0.036) + 'px Lato,sans-serif';
    ctx.fillText(surahName(s) + ' · ' + s + ':' + a, Wd / 2, H - pad * 1.9);
    ctx.globalAlpha = 0.85; ctx.font = '600 ' + Math.round(Math.min(Wd, H) * 0.026) + 'px Lato,sans-serif';
    ctx.fillText('QuranHikma' + (lang !== 'ar' ? ' · ' + label(lang) : ''), Wd / 2, H - pad * 1.25);
    ctx.globalAlpha = 1;
    return { fontSize: size, lines: lines.length };
  }
  function openCard(s, a, opener, lang) {
    lang = lang || curLang; var fmt = 'square';
    var d = openDialog('<button type="button" class="vs-btn vs-close" data-vs-close aria-label="Close">✕</button>' +
      '<h2 id="%HID%">Social card · ' + esc(ref(s, a)) + '</h2>' +
      radiogroupHTML('vs-rg-card', lang) +
      '<div class="vs-radiogroup" role="radiogroup" aria-label="Card format" id="vs-rg-fmt">' +
      Object.keys(FORMATS).map(function (f) { return '<button type="button" class="vs-radio" role="radio" data-lang="' + f + '" aria-checked="' + (f === fmt) + '" tabindex="' + (f === fmt ? 0 : -1) + '">' + FORMATS[f].label + '</button>'; }).join('') + '</div>' +
      '<div class="vs-canvas-wrap"><canvas id="vs-canvas" role="img" aria-label="Preview of verse card"></canvas></div>' +
      '<div class="vs-actions"><button type="button" class="vs-btn" data-act="dl">⬇ Download PNG</button>' +
      '<button type="button" class="vs-btn" data-act="sharefile">📤 Share image</button></div>', opener);
    var cv = d.box.querySelector('#vs-canvas');
    function redraw() {
      return ensureFonts(lang).then(function () { return verseText(s, a, lang); }).then(function (t) {
        var info = drawCard(cv, fmt, s, a, lang, t || ref(s, a));
        cv.setAttribute('aria-label', 'Card preview: ' + (t || '').slice(0, 140) + ' — ' + ref(s, a));
        cv.dataset.fontSize = info.fontSize; cv.dataset.ready = '1';
      });
    }
    wireRadiogroup(d.box.querySelector('#vs-rg-card'), function (l) { lang = l; cv.dataset.ready = ''; redraw(); });
    wireRadiogroup(d.box.querySelector('#vs-rg-fmt'), function (f) { fmt = f; cv.dataset.ready = ''; redraw(); });
    var fname = function () { return 'quran-' + s + '-' + a + '-' + lang + '-' + fmt + '.png'; };
    d.box.querySelector('[data-act=dl]').addEventListener('click', function () {
      var l = document.createElement('a'); l.download = fname(); l.href = cv.toDataURL('image/png'); document.body.appendChild(l); l.click(); l.remove(); announce('Card downloaded');
    });
    var sf = d.box.querySelector('[data-act=sharefile]');
    sf.addEventListener('click', function () {
      cv.toBlob(function (blob) {
        var file = new File([blob], fname(), { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: ref(s, a), text: ref(s, a) }).catch(function () {});
        } else { announce('Image sharing not supported here — use Download'); }
      }, 'image/png');
    });
    redraw();
    return d;
  }

  /* ---------------- Listen: pluggable audio provider ----------------
   * An AudioProvider is { id, label, available():Promise<{ok,msg}>, play(s,a,text,rate,hooks), pause(), resume(), stop() }.
   * Default is Web Speech TTS — a PLACEHOLDER: synthesized speech on Quranic
   * text may mispronounce and is NOT tajweed recitation. A real per-ayah
   * recitation provider (e.g. everyayah.com / quran.com audio CDN MP3s, as
   * already used by verse-toolbar.js's 🎧 panel) can replace it with
   *   VerseSuite.registerAudioProvider(provider, true)
   * without touching the UI below. */
  var TTSProvider = {
    id: 'tts', label: 'Browser speech (placeholder)',
    voice: function () {
      var vs = (W.speechSynthesis && W.speechSynthesis.getVoices()) || [];
      return vs.filter(function (v) { return /^ar(\b|-|_)/i.test(v.lang); })[0] || null;
    },
    available: function () {
      if (!W.speechSynthesis || !W.SpeechSynthesisUtterance) return Promise.resolve({ ok: false, msg: 'Speech is not supported in this browser.' });
      var self = this;
      return new Promise(function (res) {
        if (self.voice()) return res({ ok: true });
        var done = false;
        function chk() { if (done) return; done = true; res(self.voice() ? { ok: true } : { ok: false, msg: 'No Arabic voice is installed on this device, so audio is unavailable. (We do not read Arabic with a non-Arabic voice.)' }); }
        try { W.speechSynthesis.addEventListener('voiceschanged', chk, { once: true }); } catch (e) {}
        setTimeout(chk, 700);
      });
    },
    play: function (s, a, text, rate, hooks) {
      var u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.voice = this.voice(); u.rate = rate;
      u.onend = hooks.end; u.onerror = hooks.end;
      W.speechSynthesis.cancel(); W.speechSynthesis.speak(u);
    },
    pause: function () { W.speechSynthesis.pause(); },
    resume: function () { W.speechSynthesis.resume(); },
    stop: function () { try { W.speechSynthesis.cancel(); } catch (e) {} }
  };
  var Audio = {
    provider: TTSProvider, key: null, state: 'idle', btn: null,
    rate: function () { var r = parseFloat(localStorage.getItem(LS_RATE)); return [0.5, 0.75, 1, 1.25, 1.5].indexOf(r) >= 0 ? r : 1; },
    ui: function () {
      document.querySelectorAll('[data-vs=listen]').forEach(function (b) {
        var bar = b.closest('.vs-bar,.vs-modal'), mine = bar && Audio.btn && bar.contains(Audio.btn) && (b === Audio.btn);
        var st = mine ? Audio.state : 'idle';
        b.setAttribute('aria-pressed', st === 'playing');
        b.textContent = st === 'playing' ? '⏸ Pause' : st === 'paused' ? '▶ Resume' : '▶ Listen';
        var stop = b.parentNode.querySelector('[data-vs=stop]'); if (stop) stop.hidden = st === 'idle';
        var sp = b.parentNode.querySelector('.vs-speed');
        if (st !== 'idle' && !sp) {
          sp = document.createElement('select'); sp.className = 'vs-speed'; sp.setAttribute('aria-label', 'Playback speed');
          sp.innerHTML = [0.5, 0.75, 1, 1.25, 1.5].map(function (r) { return '<option value="' + r + '"' + (r === Audio.rate() ? ' selected' : '') + '>' + r + '×</option>'; }).join('');
          sp.addEventListener('click', function (e) { e.stopPropagation(); });
          sp.addEventListener('change', function () { localStorage.setItem(LS_RATE, sp.value); announce('Speed ' + sp.value + '×'); if (Audio.state === 'playing') Audio.restart(); });
          b.parentNode.insertBefore(sp, stop ? stop.nextSibling : b.nextSibling);
        } else if (st === 'idle' && sp) sp.remove();
      });
    },
    toggle: function (s, a, b) {
      var k = s + ':' + a;
      if (Audio.key === k && Audio.btn === b && Audio.state === 'playing') { Audio.provider.pause(); Audio.state = 'paused'; Audio.ui(); announce('Paused'); return; }
      if (Audio.key === k && Audio.btn === b && Audio.state === 'paused') { Audio.provider.resume(); Audio.state = 'playing'; Audio.ui(); announce('Resumed'); return; }
      Audio.stop(true);
      Audio.provider.available().then(function (av) {
        if (!av.ok) { announce(av.msg); return; }
        return verseText(s, a, 'ar').then(function (t) {
          if (!t) { announce('No Arabic text to play'); return; }
          Audio.key = k; Audio.btn = b; Audio.text = t; Audio.state = 'playing'; Audio.ui();
          announce('Playing ' + ref(s, a) + ' (synthesized speech, not recitation)');
          Audio.provider.play(s, a, t, Audio.rate(), { end: function () { if (Audio.key === k) { Audio.state = 'idle'; Audio.key = null; Audio.ui(); } } });
        });
      });
    },
    restart: function () { var k = Audio.key.split(':'); Audio.provider.play(+k[0], +k[1], Audio.text, Audio.rate(), { end: function () { Audio.state = 'idle'; Audio.key = null; Audio.ui(); } }); },
    stop: function (quiet) {
      if (Audio.state === 'idle' && !Audio.key) return;
      Audio.provider.stop(); var was = Audio.key; Audio.state = 'idle'; Audio.key = null; Audio.ui();
      if (was && !quiet) announce('Stopped');
    }
  };
  W.addEventListener('pagehide', function () { Audio.stop(true); });
  W.addEventListener('popstate', function () { Audio.stop(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) Audio.stop(true); });

  /* ---------------- presentation decks (localStorage) ---------------- */
  var Deck = {
    load: function () {
      var d; try { d = JSON.parse(localStorage.getItem(LS_DECKS) || ''); } catch (e) {}
      if (!d || !d.decks) d = { active: 'd1', decks: { d1: { name: 'My Verses', items: [] } } };
      if (!d.decks[d.active]) d.active = Object.keys(d.decks)[0];
      return d;
    },
    save: function (d) { localStorage.setItem(LS_DECKS, JSON.stringify(d)); Deck.badges(); },
    active: function () { var d = Deck.load(); return d.decks[d.active]; },
    count: function () { try { return Deck.active().items.length; } catch (e) { return 0; } },
    add: function (item) {
      var d = Deck.load(), dk = d.decks[d.active];
      if (dk.items.some(function (x) { return x.sura === item.sura && x.aya === item.aya && x.lang === item.lang; })) return false;
      dk.items.push(item); Deck.save(d); return true;
    },
    badges: function () { var n = Deck.count(); document.querySelectorAll('[data-vs=present] .vs-badge').forEach(function (b) { b.textContent = n; }); }
  };
  function addToDeck(s, a) {
    var lang = curLang;
    verseText(s, a, lang).then(function (t) {
      var ok = Deck.add({ sura: s, aya: a, reference: ref(s, a), surah: surahName(s), lang: lang, langLabel: label(lang), text: t, added: new Date().toISOString() });
      announce(ok ? 'Added ' + ref(s, a) + ' (' + label(lang) + ') to "' + Deck.active().name + '" — ' + Deck.count() + ' verses' : 'Already in this deck');
    });
  }

  /* ---------------- Research drawer ---------------- */
  var PAGE = 25;
  function openResearch(s, a, opener) {
    var key = s + ':' + a, notes = { s: s, a: a, sections: {} };
    var secs = [
      ['xref', 'Cross-references by theme'],
      ['themes', 'Theme memberships'],
      ['tafsir', 'Tafsir excerpts'],
      ['tension', 'Tension-map links']
    ];
    var d = openDialog('<button type="button" class="vs-btn vs-close" data-vs-close aria-label="Close research panel">✕</button>' +
      '<h2 id="%HID%">Research · ' + esc(ref(s, a)) + ' · ' + esc(surahName(s)) + '</h2>' +
      '<div class="vs-actions" style="margin-bottom:6px"><button type="button" class="vs-btn" data-act="cite">📎 Copy citation</button>' +
      '<button type="button" class="vs-btn" data-act="md">⬇ Export notes (Markdown)</button></div>' +
      secs.map(function (x) { return '<details class="vs-sec" data-sec="' + x[0] + '"><summary>' + x[1] + ' <span class="vs-count" aria-live="polite"></span></summary><div class="vs-sec-body" aria-busy="false"><span class="vs-muted">Open to load.</span></div></details>'; }).join(''),
      opener, { drawer: true });
    d.box.querySelectorAll('details').forEach(function (det) {
      det.addEventListener('toggle', function () { if (det.open && !det.__loaded) { det.__loaded = 1; loadSec(det); } });
    });
    d.box.querySelector('details').open = true;
    d.box.querySelector('[data-act=cite]').addEventListener('click', function () {
      var c = 'The Qur\u2019an, ' + surahName(s) + ' ' + key + '. Retrieved ' + new Date().toISOString().slice(0, 10) + ' from QuranHikma, ' + deepLink(s, a);
      copyText(c).then(function () { announce('Citation copied'); });
    });
    d.box.querySelector('[data-act=md]').addEventListener('click', function () {
      Promise.all(secs.map(function (x) { var det = d.box.querySelector('[data-sec=' + x[0] + ']'); if (!det.__loaded) { det.__loaded = 1; return loadSec(det); } return det.__p; })).then(function () {
        verseText(s, a, 'ar').then(function (ar) {
          var md = '# ' + ref(s, a) + ' — ' + surahName(s) + '\n\n> ' + ar + '\n\n' + (curLang !== 'ar' ? '> ' + textOf(s, a) + ' (' + label(curLang) + ')\n\n' : '') +
            secs.map(function (x) { return '## ' + x[1] + '\n\n' + (notes.sections[x[0]] || '_none recorded_') + '\n'; }).join('\n') +
            '\n---\nSource: ' + deepLink(s, a) + ' · exported ' + new Date().toISOString() + '\n';
          var l = document.createElement('a'); l.download = 'research-' + s + '-' + a + '.md';
          l.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); document.body.appendChild(l); l.click(); l.remove();
          announce('Notes exported');
        });
      });
    });

    function body(det) { return det.querySelector('.vs-sec-body'); }
    function setCount(det, n) { det.querySelector('.vs-count').textContent = '(' + n + ')'; }
    function fail(det, e) { body(det).innerHTML = '<p class="vs-err" role="alert">Could not load this section (' + esc(e.message || e) + '). <button type="button" class="vs-btn">Retry</button></p>'; body(det).querySelector('button').onclick = function () { loadSec(det); }; }
    function paged(det, items, renderItem, mdItem) {
      var shown = 0, b = body(det); b.innerHTML = '<ul></ul>';
      var ul = b.querySelector('ul');
      function more() {
        items.slice(shown, shown + PAGE).forEach(function (it) { var li = document.createElement('li'); li.innerHTML = renderItem(it); ul.appendChild(li); });
        shown = Math.min(items.length, shown + PAGE);
        var btn = b.querySelector('.vs-more'); if (btn) btn.remove();
        if (shown < items.length) {
          btn = document.createElement('button'); btn.type = 'button'; btn.className = 'vs-btn vs-more';
          btn.textContent = 'Show more (' + shown + ' of ' + items.length + ')'; btn.onclick = function () { more(); var li = ul.children[shown - PAGE] || ul.lastChild; if (li) { li.tabIndex = -1; li.focus(); } };
          b.appendChild(btn);
        }
      }
      if (!items.length) { b.innerHTML = '<p class="vs-muted">None recorded.</p>'; return; }
      more();
      if (mdItem) notes.sections[det.dataset.sec] = items.map(mdItem).join('\n');
    }
    function vlink(rs, ra) { return '<a href="index.html?sura=' + rs + '&aya=' + ra + '&lang=' + curLang + '">' + rs + ':' + ra + '</a>'; }
    function loadSec(det) {
      var sec = det.dataset.sec; body(det).setAttribute('aria-busy', 'true'); body(det).innerHTML = '<span class="vs-muted">Loading…</span>';
      var p;
      if (sec === 'xref') {
        p = Promise.all([
          get('thematic_cross_references_v2?select=theme,related_sura,related_aya,reason&sura=eq.' + s + '&aya=eq.' + a + '&order=theme&limit=2000'),
          get('cross_references?select=ref_surah,ref_ayah_start,ref_ayah_end&source_surah=eq.' + s + '&source_ayah=eq.' + a + '&limit=1000')
        ]).then(function (r) {
          var groups = {};
          r[0].forEach(function (x) { (groups[x.theme] = groups[x.theme] || []).push(x.related_sura + ':' + x.related_aya); });
          if (r[1].length) groups['Direct cross-references'] = r[1].map(function (x) { return x.ref_surah + ':' + x.ref_ayah_start + (x.ref_ayah_end ? '-' + x.ref_ayah_end : ''); });
          var list = Object.keys(groups).map(function (t) { return { theme: t, refs: groups[t] }; }).sort(function (x, y) { return y.refs.length - x.refs.length; });
          setCount(det, r[0].length + r[1].length + ' links, ' + list.length + ' groups');
          paged(det, list, function (g) {
            var shown = g.refs.slice(0, 40).map(function (k) { var x = k.split(/[:-]/); return vlink(x[0], x[1]); }).join(', ');
            return '<strong>' + esc(g.theme) + '</strong> (' + g.refs.length + '): ' + shown + (g.refs.length > 40 ? ' … <a href="theme-reader.html?theme=' + encodeURIComponent(g.theme) + '">all</a>' : '');
          }, function (g) { return '- **' + g.theme + '** (' + g.refs.length + '): ' + g.refs.join(', '); });
        });
      } else if (sec === 'themes') {
        p = Promise.all([
          get('theme_verses?select=theme&sura=eq.' + s + '&aya=eq.' + a),
          get('thematic_cross_references_v2?select=theme&sura=eq.' + s + '&aya=eq.' + a + '&limit=5000')
        ]).then(function (r) {
          var m = {}; r[0].concat(r[1]).forEach(function (x) { if (!/^Tension:/i.test(x.theme)) m[x.theme] = 1; });
          var list = Object.keys(m).sort(); setCount(det, list.length);
          paged(det, list, function (t) { return '<a href="theme-reader.html?theme=' + encodeURIComponent(t) + '">' + esc(t) + '</a>'; }, function (t) { return '- ' + t; });
        });
      } else if (sec === 'tafsir') {
        p = get('tafsir_entries?select=id,scholar_name,language,content&sura=eq.' + s + '&aya=eq.' + a + '&order=language,scholar_name&limit=200').then(function (rows) {
          var pref = curLang === 'ar' ? 'ar' : curLang === 'ti' ? 'ti' : 'en';
          rows.sort(function (x, y) { return (y.language === pref) - (x.language === pref); });
          setCount(det, rows.length);
          paged(det, rows, function (r) {
            var c = clean(r.content), ex = c.slice(0, 260), rtl = r.language === 'ar';
            return '<strong>' + esc(r.scholar_name) + '</strong> <span class="vs-muted">[' + esc(r.language) + ']</span>' +
              '<div dir="' + (rtl ? 'rtl' : 'ltr') + '" lang="' + esc(r.language) + '"' + (rtl ? ' style="font-family:Amiri,serif;font-size:16px"' : '') + '>' + esc(ex) + (c.length > 260 ? '…' : '') + '</div>' +
              (c.length > 260 ? '<details><summary>Read full entry</summary><div dir="' + (rtl ? 'rtl' : 'ltr') + '" style="white-space:pre-wrap">' + esc(c) + '</div></details>' : '');
          }, function (r) { return '- **' + r.scholar_name + '** [' + r.language + ']: ' + clean(r.content).slice(0, 300).replace(/\n/g, ' ') + '…'; });
        });
      } else if (sec === 'tension') {
        p = get('thematic_cross_references_v2?select=theme,category,reason,related_sura,related_aya&sura=eq.' + s + '&aya=eq.' + a + '&or=(theme.ilike.Tension:*,category.ilike.tension*)&limit=500').then(function (rows) {
          setCount(det, rows.length);
          paged(det, rows, function (r) { return vlink(r.related_sura, r.related_aya) + ' — <em>' + esc(r.theme) + '</em>' + (r.reason ? '<div class="vs-muted">' + esc(r.reason) + '</div>' : ''); },
            function (r) { return '- ' + r.related_sura + ':' + r.related_aya + ' — ' + r.theme + (r.reason ? ': ' + r.reason : ''); });
        });
      }
      det.__p = p.catch(function (e) { setCount(det, '!'); fail(det, e); det.__loaded = 0; }).then(function () { body(det).setAttribute('aria-busy', 'false'); });
      return det.__p;
    }
  }

  /* ---------------- global language control ---------------- */
  function mountLangControl() {
    if (document.getElementById('vs-langfab')) return;
    var fab = document.createElement('button'); fab.type = 'button'; fab.id = 'vs-langfab'; fab.className = 'vs-langfab';
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'vs-langpop'); fab.setAttribute('aria-label', 'Verse display language');
    fab.textContent = '🌐 ' + native(curLang);
    var pop = document.createElement('div'); pop.id = 'vs-langpop'; pop.className = 'vs-langpop'; pop.hidden = true;
    pop.innerHTML = '<h2 id="vs-langpop-h">Verse display language</h2>' + radiogroupHTML('vs-rg-global', curLang) + '<p style="margin:4px 0 0;font-size:12px"><a href="verse-deck.html">My verse decks (' + Deck.count() + ')</a></p>';
    document.body.appendChild(pop); document.body.appendChild(fab);
    wireRadiogroup(pop.querySelector('.vs-radiogroup'), function (l) { setLang(l); });
    fab.addEventListener('click', function () { var o = pop.hidden; pop.hidden = !o; fab.setAttribute('aria-expanded', o); if (o) pop.querySelector('[aria-checked=true]').focus(); });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { pop.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); } });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    var qp = new URLSearchParams(location.search).get('lang');
    var saved = null; try { saved = localStorage.getItem(LS_LANG); } catch (e) {}
    curLang = (qp && (LABELS[qp] || qp)) ? qp : (saved || 'ar');
    if (qp) try { localStorage.setItem(LS_LANG, qp); } catch (e) {}
    Promise.all([discoverLangs(), loadSurahs()]).then(function () {
      if (langs.indexOf(curLang) < 0) curLang = 'ar';
      var hasVerses = document.querySelector('.verse-card,.xref-item,.xref-card,[data-vs-ref]') || document.body.hasAttribute('data-vs-page');
      scan(document);
      if (hasVerses || document.body.hasAttribute('data-vs-page')) mountLangControl();
      var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(function () { scan(document); if (document.querySelector('.vs-bar,.vs-xref-tools')) mountLangControl(); }, 60); });
      mo.observe(document.body, { childList: true, subtree: true });
      W.dispatchEvent(new Event('verse-suite-ready'));
    });
  }

  W.VerseSuite = {
    setLang: setLang, getLang: function () { return curLang; }, languages: function () { return langs.slice(); },
    label: label, fetchTexts: fetchTexts, provideTexts: provideTexts, textOf: textOf, copy: doCopy, share: doShare, deepLink: deepLink,
    openCard: openCard, drawCard: drawCard, ensureFonts: ensureFonts, openResearch: openResearch, openPanel: openPanel,
    deck: Deck, audio: Audio, surahName: surahName, loadSurahs: loadSurahs, scan: scan,
    registerAudioProvider: function (p, makeDefault) { if (makeDefault) { Audio.stop(true); Audio.provider = p; } }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
