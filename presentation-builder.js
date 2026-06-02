/* ═══════════════════════════════════════════════════════════════
   PRESENTATION BUILDER START
   Shared add-to-presentation layer for Quran Scholar pages.
   Uses localStorage only: presentationBasket + savedPresentations.
   Safe: no Supabase writes, no API keys touched.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const BASKET_KEY = 'presentationBasket';
  const LEGACY_KEY = 'qs_presentation_slides';

  function safeParse(value, fallback) {
    try { return JSON.parse(value || ''); } catch { return fallback; }
  }

  function normalizeType(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'verse') return 'quran';
    if (t.includes('hadith')) return 'hadith';
    if (t.includes('madhhab') || t.includes('school') || t.includes('ruling')) return 'madhhab';
    if (t.includes('sira') || t.includes('event') || t.includes('story')) return 'sira';
    if (t.includes('tafsir')) return 'tafsir';
    if (t.includes('cross')) return 'cross_reference';
    if (t.includes('riwayat') || t.includes('qira')) return 'riwayat';
    if (t.includes('analysis') || t.includes('ai')) return 'ai_analysis';
    if (t.includes('word') || t.includes('lexicon')) return 'word_analysis';
    return t || 'research';
  }

  function getBasket() {
    const basket = safeParse(localStorage.getItem(BASKET_KEY), null);
    if (Array.isArray(basket)) return basket;
    const legacy = safeParse(localStorage.getItem(LEGACY_KEY), []);
    const normalized = legacy.map(normalizeItem);
    saveBasket(normalized);
    return normalized;
  }

  function saveBasket(items) {
    localStorage.setItem(BASKET_KEY, JSON.stringify(items));
    localStorage.setItem(LEGACY_KEY, JSON.stringify(items)); // backward compatibility
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function currentSourceUrl(extraHash) {
    const url = new URL(window.location.href);
    if (extraHash) url.hash = extraHash;
    return url.pathname.split('/').pop() + url.search + url.hash;
  }

  function textFrom(card, selectors) {
    for (const selector of selectors) {
      const el = card.querySelector(selector);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return '';
  }

  function normalizeItem(raw) {
    const type = normalizeType(raw.type || raw.kind);
    const title = raw.title || raw.source || raw.subtitle || 'Research Item';
    const reference = raw.reference || raw.subtitle || raw.source || '';
    const textParts = [raw.text, raw.english, raw.arabic, raw.extra, raw.notes].filter(Boolean);
    return {
      id: raw.id || generateId(type),
      type,
      title,
      reference,
      text: raw.text || textParts.join('\n\n'),
      arabic: raw.arabic || '',
      english: raw.english || raw.text || '',
      notes: raw.notes || '',
      sourceUrl: raw.sourceUrl || raw.source_url || currentSourceUrl(),
      createdAt: raw.createdAt || raw.addedAt || new Date().toISOString(),
      slideTitle: raw.slideTitle || title,
      speakerNotes: raw.speakerNotes || ''
    };
  }

  function addItem(raw) {
    const item = normalizeItem(raw);
    const basket = getBasket();
    const sig = [item.type, item.reference, item.title, item.text].join('|').slice(0, 900);
    const exists = basket.some(x => [x.type, x.reference, x.title, x.text].join('|').slice(0, 900) === sig);
    if (!exists) {
      basket.push(item);
      saveBasket(basket);
    }
    return !exists;
  }

  const css = `
/* PRESENTATION BUILDER START — injected styles */
.pb-add-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1.5px solid #B8902A;border-radius:999px;background:#FDF5DE;color:#7a581d;font-size:12px;font-weight:800;font-family:Georgia,serif;cursor:pointer;transition:.18s;white-space:nowrap;box-shadow:0 1px 8px rgba(0,0,0,.06)}
.pb-add-btn:hover{background:#B8902A;color:white;transform:translateY(-1px)}
.pb-add-btn.added{background:#2E7D32;border-color:#2E7D32;color:white}
.pb-inject-row{display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;border-top:1px solid rgba(184,144,42,.18);margin-top:6px}
#pb-float-btn{position:fixed;right:18px;bottom:20px;z-index:9000;display:flex;align-items:center;gap:8px;padding:12px 16px;border:0;border-radius:999px;background:linear-gradient(135deg,#5f4318,#a67d32);color:#fff7df;font-size:14px;font-weight:800;font-family:Georgia,serif;box-shadow:0 6px 24px rgba(95,67,24,.42);cursor:pointer}
#pb-float-btn .pb-count{background:#fff7df;color:#5f4318;min-width:24px;height:24px;padding:0 6px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px}
#pb-toast{position:fixed;right:18px;bottom:76px;z-index:9001;background:#1f7a3a;color:white;padding:11px 16px;border-radius:16px;font:700 13px Georgia,serif;box-shadow:0 5px 18px rgba(0,0,0,.22);opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none;max-width:280px}
#pb-toast.show{opacity:1;transform:translateY(0)}
@media(max-width:700px){#pb-float-btn{right:12px;bottom:12px;padding:11px 13px;font-size:13px}.pb-inject-row{justify-content:stretch}.pb-add-btn{width:100%;justify-content:center}}
/* PRESENTATION BUILDER END — injected styles */`;

  function injectStyles() {
    if (document.getElementById('pb-styles')) return;
    const el = document.createElement('style');
    el.id = 'pb-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function showToast(msg) {
    let toast = document.getElementById('pb-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pb-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function updateFloatCount() {
    const counter = document.querySelector('#pb-float-btn .pb-count');
    if (counter) counter.textContent = getBasket().length;
  }

  function createFloatBtn() {
    if (document.getElementById('pb-float-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'pb-float-btn';
    btn.innerHTML = `<span>📊 Presentation</span><span class="pb-count">0</span>`;
    btn.onclick = () => { window.location.href = 'presentation.html'; };
    document.body.appendChild(btn);
    updateFloatCount();
  }

  function extractFromVerseCard(card) {
    const verseNum = textFrom(card, ['.verse-num', '.ayah-number', '.aya-number']);
    const surah = textFrom(document, ['.top-english', '.surah-title-en', '.surah-name', '.current-surah']);
    const arabic = textFrom(card, ['.verse-arabic', '.arabic-text', '[dir="rtl"]']);
    const english = textFrom(card, ['.verse-english', '.english-text', '.translation', 'p']);
    const tigrinya = textFrom(card, ['.verse-tigrinya', '.tigrinya-text']);
    const reference = card.dataset.ref || card.dataset.reference || (surah && verseNum ? `${surah} ${verseNum}` : verseNum || 'Qur’an Verse');
    return { type:'quran', id:generateId('quran'), title:surah || 'Qur’an Verse', reference, arabic, english, text:[arabic, english, tigrinya].filter(Boolean).join('\n\n'), sourceUrl:currentSourceUrl(verseNum ? `verse-${verseNum}` : '') };
  }

  function inferType(card) {
    const txt = (card.className + ' ' + card.textContent.slice(0, 250)).toLowerCase();
    if (/hadith|bukhari|muslim|tirmidhi|abu dawud|nasa|ibn majah|muwatta|kafi/.test(txt)) return 'hadith';
    if (/madhhab|hanafi|maliki|shafi|hanbali|ja.fari|zaydi|ibadi|ruling|school/.test(txt)) return 'madhhab';
    if (/sira|seerah|hijri|battle|migration|event/.test(txt)) return 'sira';
    if (/tafsir|ibn kathir|tabari|qurtubi/.test(txt)) return 'tafsir';
    if (/cross.ref|related verse|↔/.test(txt)) return 'cross_reference';
    if (/riwayat|qira|hafs|warsh/.test(txt)) return 'riwayat';
    if (/ai analysis|contradiction|tension|analysis/.test(txt)) return 'ai_analysis';
    if (/root|lexicon|word analysis|morphology/.test(txt)) return 'word_analysis';
    return 'research';
  }

  function extractGeneric(card) {
    const type = inferType(card);
    const title = textFrom(card, ['.card-title','.result-title','h2','h3','.hadith-title','.tafsir-title','.event-title-en','.topic-title','.school-name']) || type.replace('_',' ').toUpperCase();
    const reference = textFrom(card, ['.source-pill','.source-badge','.result-source','.reference','.topic-meta','.event-year','.school-evidence']) || title;
    const text = textFrom(card, ['.card-text','.result-text','.hadith-text','.tafsir-text','.event-preview','.topic-desc','.school-pos','.story','p']) || card.textContent.trim().slice(0, 1600);
    const arabic = textFrom(card, ['[dir="rtl"]','.arabic','.arabic-text','.event-title-ar']);
    return { type, id:generateId(type), title, reference, text, arabic, sourceUrl:currentSourceUrl() };
  }

  function makeAddBtn(card, extractFn) {
    const btn = document.createElement('button');
    btn.className = 'pb-add-btn';
    btn.type = 'button';
    btn.textContent = '+ Add to Presentation';
    btn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const added = addItem(extractFn(card));
      btn.classList.add('added');
      btn.textContent = added ? '✓ Added to Presentation' : '✓ Already in Presentation';
      updateFloatCount();
      showToast(added ? 'Added to presentation basket' : 'Already saved in basket');
    };
    return btn;
  }

  function appendButton(card, extractFn) {
    if (!card || card.classList.contains('pb-injected')) return;
    card.classList.add('pb-injected');
    const row = document.createElement('div');
    row.className = 'pb-inject-row';
    row.appendChild(makeAddBtn(card, extractFn));
    const actionArea = card.querySelector('.action-bar,.actions,.card-actions,.verse-detail,.verse-top,.result-actions');
    if (actionArea) actionArea.appendChild(row); else card.appendChild(row);
  }

  function injectButtons() {
    document.querySelectorAll('.verse-card:not(.pb-injected)').forEach(card => appendButton(card, extractFromVerseCard));
    document.querySelectorAll('.result-card:not(.pb-injected),.event-card:not(.pb-injected),.event-detail:not(.pb-injected),.school-card:not(.pb-injected),.topic-item:not(.pb-injected),.compare:not(.pb-injected),.s-hdr:not(.pb-injected),.src-card:not(.pb-injected),.sr-card:not(.pb-injected),.hadith-card:not(.pb-injected),.tafsir-card:not(.pb-injected),.cross-ref-card:not(.pb-injected),.analysis-card:not(.pb-injected),.word-card:not(.pb-injected)').forEach(card => appendButton(card, extractGeneric));
  }

  function observeChanges() {
    let timer;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { injectButtons(); updateFloatCount(); }, 250);
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function init() {
    injectStyles();
    createFloatBtn();
    injectButtons();
    observeChanges();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
/* PRESENTATION BUILDER END */
