/* Research result action toolbar.
   Gives every search result card on research.html the same small icon row
   used by the Quran reader's verse toolbar (verse-toolbar.js):
   Copy, Share, Highlight, Add note, Add to presentation, Save to My Page.
   Storage is reused where it exists:
   - verse notes use the reader's key note_<sura>_<aya>, so a note made here
     shows up on the Quran page and vice versa; other results use
     note_res_<id>.
   - presentation uses window.QSPresentation.addItem (presentation-builder.js),
     i.e. the same presentationBasket the rest of the site uses.
   - My Page uses the same sessionStorage hand-off (qh_page_capture) as
     save-selection.js, then opens my-pages.html.
   Highlights are stored locally under qh_res_hl_<id>. Nothing here writes to
   Supabase directly. */
(function () {
  'use strict';
  var ITEMS = {};          // id -> item {id,type,ref,title,text,arabic,url,sura,aya}
  var HL_COLORS = ['#FFF3B0', '#CDEFD4', '#D6E6FF', '#FFD9E0'];

  var BTN = 'background:#FDF8EE;border:1px solid #E8C97B;border-radius:6px;width:32px;height:30px;' +
    'font-size:14px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;';

  var css = document.createElement('style');
  css.textContent =
    '.ra-bar{display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap;margin:8px 0 0}' +
    '.ra-bar button:hover{background:#F6E7C1}' +
    '.ra-bar button:focus-visible{outline:2px solid #B8902A;outline-offset:1px}' +
    '.ra-hl-pick{position:absolute;z-index:9500;display:flex;gap:6px;padding:6px;background:#fff;border:1px solid #E8C97B;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.15)}' +
    '.ra-hl-pick button{width:24px;height:24px;border-radius:50%;border:1px solid #ccc;cursor:pointer}' +
    '.ra-note{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}' +
    '.ra-note>div{background:#FFFDF7;border-radius:14px;padding:18px;width:min(520px,92vw);box-shadow:0 10px 40px rgba(0,0,0,.25);font-family:inherit}' +
    '.ra-note textarea{width:100%;min-height:140px;border:1px solid #E8C97B;border-radius:8px;padding:8px;font:inherit;box-sizing:border-box}' +
    '.ra-note .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}' +
    '.ra-note .row button{border:1px solid #B8902A;background:#FDF5DE;color:#5f4318;border-radius:999px;padding:6px 14px;cursor:pointer;font-weight:700}' +
    '.ra-note .row button.pri{background:#B8902A;color:#fff}' +
    '.ra-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:9700;background:#1f7a3a;color:#fff;padding:9px 16px;border-radius:14px;font:700 13px Georgia,serif;box-shadow:0 5px 18px rgba(0,0,0,.22)}' +
    '.card.ra-has-note .meta::after{content:" \\1F4DD";}';
  document.head.appendChild(css);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(m) { var t = document.createElement('div'); t.className = 'ra-toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  function noteKey(it) { return it.sura && it.aya && it.type === 'quran' ? 'note_' + it.sura + '_' + it.aya : 'note_res_' + it.id; }
  function hlKey(it) { return 'qh_res_hl_' + it.id; }
  function absUrl(u) { try { return new URL(u, location.href).href; } catch (e) { return location.href; } }
  function plain(it) {
    return [it.title, it.arabic, it.text].filter(Boolean).join('\n\n') + '\n\n— ' + it.ref + '\n' + absUrl(it.url);
  }
  function cardOf(id) { return document.querySelector('.card[data-ra="' + id + '"]'); }

  function register(it) {
    it.id = String(it.id).replace(/[^\w:.-]/g, '_');
    ITEMS[it.id] = it;
    return it.id;
  }

  function bar(id) {
    var b = function (act, title, icon) {
      return '<button type="button" data-act="' + act + '" title="' + title + '" aria-label="' + title + '" style="' + BTN + '">' + icon + '</button>';
    };
    return '<div class="ra-bar" data-id="' + esc(id) + '">' +
      b('copy', 'Copy', '\u{1F4CB}') +
      b('share', 'Share', '\u{1F4E4}') +
      b('hl', 'Highlight', '\u{1F58A}') +
      b('note', 'Add note', '\u{1F4DD}') +
      b('pres', 'Add to presentation', '\u2795') +
      b('page', 'Save to My Page', '\u{1F4C4}') +
      '</div>';
  }

  function copy(it) {
    var txt = plain(it);
    var done = function () { toast('Copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed'); } ta.remove(); }
  }
  function share(it) {
    var data = { title: it.ref || document.title, text: plain(it), url: absUrl(it.url) };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    copy(it);
  }
  function applyHl(id) {
    var c = cardOf(id), it = ITEMS[id]; if (!c || !it) return;
    var col = null; try { col = localStorage.getItem(hlKey(it)); } catch (e) {}
    c.style.background = col || '';
    c.style.boxShadow = col ? 'inset 4px 0 0 #B8902A' : '';
  }
  function pickHl(it, btn) {
    document.querySelectorAll('.ra-hl-pick').forEach(function (p) { p.remove(); });
    var p = document.createElement('div'); p.className = 'ra-hl-pick';
    p.innerHTML = HL_COLORS.map(function (c) { return '<button type="button" aria-label="Highlight colour" data-c="' + c + '" style="background:' + c + '"></button>'; }).join('') +
      '<button type="button" aria-label="Remove highlight" data-c="" title="Remove" style="background:#fff">\u2715</button>';
    var r = btn.getBoundingClientRect();
    p.style.top = (r.bottom + window.scrollY + 6) + 'px';
    p.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - 190)) + 'px';
    p.addEventListener('click', function (e) {
      var c = e.target.getAttribute('data-c'); if (c === null) return;
      try { if (c) localStorage.setItem(hlKey(it), c); else localStorage.removeItem(hlKey(it)); } catch (er) {}
      applyHl(it.id); p.remove(); toast(c ? 'Highlighted' : 'Highlight removed');
    });
    document.body.appendChild(p);
    setTimeout(function () { document.addEventListener('click', function f(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', f); } }); }, 10);
  }
  function note(it) {
    var k = noteKey(it), cur = ''; try { cur = localStorage.getItem(k) || ''; } catch (e) {}
    // Verse notes from the reader are stored as HTML; show them as text here.
    var tmp = document.createElement('div'); tmp.innerHTML = cur;
    var m = document.createElement('div'); m.className = 'ra-note';
    m.innerHTML = '<div role="dialog" aria-modal="true" aria-label="Note"><b>Note on ' + esc(it.ref) + '</b><textarea></textarea><div class="row"><button type="button" data-x="del">Delete</button><button type="button" data-x="cancel">Cancel</button><button type="button" class="pri" data-x="save">Save note</button></div></div>';
    var ta = m.querySelector('textarea'); ta.value = tmp.textContent;
    m.addEventListener('click', function (e) {
      var x = e.target.getAttribute('data-x');
      if (e.target === m || x === 'cancel') m.remove();
      if (x === 'save') { try { var v = ta.value.trim(); if (v) localStorage.setItem(k, esc(v).replace(/\n/g, '<br>')); else localStorage.removeItem(k); } catch (er) {} m.remove(); mark(it.id); toast('Note saved'); }
      if (x === 'del') { try { localStorage.removeItem(k); } catch (er) {} m.remove(); mark(it.id); toast('Note deleted'); }
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.remove(); });
    document.body.appendChild(m); ta.focus();
  }
  function mark(id) {
    var c = cardOf(id), it = ITEMS[id]; if (!c || !it) return;
    var has = false; try { has = !!localStorage.getItem(noteKey(it)); } catch (e) {}
    c.classList.toggle('ra-has-note', has);
  }
  function pres(it) {
    var P = window.QSPresentation;
    if (!P || !P.addItem) { toast('Presentation tool is still loading'); return; }
    var added = P.addItem({ type: it.type === 'quran' ? 'verse' : it.type, title: it.title || it.ref, reference: it.ref, text: it.text, arabic: it.arabic, source_url: it.url });
    toast(added ? 'Added to presentation' : 'Already in your presentation');
  }
  function page(it) {
    try { sessionStorage.setItem('qh_page_capture', JSON.stringify({ title: it.ref || it.title || 'Research result', body: [it.title, it.arabic, it.text].filter(Boolean).join('\n\n'), source: absUrl(it.url) })); } catch (e) {}
    location.href = '/my-pages.html';
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.ra-bar button[data-act]'); if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    var it = ITEMS[btn.parentNode.getAttribute('data-id')]; if (!it) return;
    ({ copy: copy, share: share, note: note, pres: pres, page: page, hl: function (x) { pickHl(x, btn); } })[btn.getAttribute('data-act')](it);
  });

  // After results are put in the DOM, restore highlights and note markers.
  function restore(root) { (root || document).querySelectorAll('.card[data-ra]').forEach(function (c) { var id = c.getAttribute('data-ra'); applyHl(id); mark(id); }); }

  window.ResearchActions = { register: register, bar: bar, restore: restore };
})();
