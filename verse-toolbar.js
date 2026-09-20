/* ============================================================================
 * verse-toolbar.js — shared per-verse action toolbar
 * ----------------------------------------------------------------------------
 * Extracted from index.html so theme pages get the same toolbar without
 * forking the code. Included by theme-reader.html.
 *
 * The host page must define a global `VERSE_TOOLBAR_SOURCE` returning the
 * verse object for a given (sura, aya); this decouples the toolbar from the
 * Quran page's CURRENT_AYAS global.
 *
 * Storage keys are identical to the Quran page (bm_/note_), so bookmarks and
 * notes are shared across pages.
 * ========================================================================== */

(function (global) {
  'use strict';

  function vtVerse(suraId, ayaNum) {
    try {
      if (typeof global.VERSE_TOOLBAR_SOURCE === 'function') {
        return global.VERSE_TOOLBAR_SOURCE(suraId, ayaNum) || {};
      }
      if (Array.isArray(global.CURRENT_AYAS)) {
        return global.CURRENT_AYAS.find(function (a) { return a.aya_number === ayaNum; }) || {};
      }
    } catch (e) { console.warn('verse-toolbar: source lookup failed', e); }
    return {};
  }
  global.CURRENT_AYAS = global.CURRENT_AYAS || [];

  function bmKey(suraId, ayaNum) { return 'bm_' + suraId + '_' + ayaNum; }
  function isBookmarked(ayaNum, suraId) { return !!localStorage.getItem(bmKey(suraId, ayaNum)); }

  /* Slim bookmark: same storage shape as the Quran page, minus that page's
     sidebar re-render (renderSavedList), which does not exist on theme pages. */
  function toggleBookmark(ayaNum, suraId) {
    var key = bmKey(suraId, ayaNum);
    var btn = document.getElementById('bm-' + suraId + '-' + ayaNum) ||
              document.getElementById('bm-' + ayaNum);
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      if (btn) btn.textContent = '\u{1F3F7}\u{FE0F}';
      showToastMsg('Bookmark removed', '#8a7a5a');
    } else {
      var v = vtVerse(suraId, ayaNum);
      localStorage.setItem(key, JSON.stringify({
        sura: suraId, aya: ayaNum,
        arabic: v.arabic || '', english: v.english || '',
        tigrinya: v.tigrinya || '', amharic: v.amharic || '',
        saved: new Date().toISOString()
      }));
      if (btn) btn.textContent = '\u{1F516}';
      showToastMsg('Bookmarked', '#B8902A');
    }
    if (typeof global.renderSavedList === 'function') { try { global.renderSavedList(); } catch (e) {} }
  }

  /* Word-by-word study is bound to the Quran page's lexicon engine
     (179 functions). Deep-link there instead of forking it. */
  function openWordsFor(suraId, ayaNum) {
    global.location.href = 'index.html?sura=' + suraId + '&aya=' + ayaNum + '&words=1';
  }

  function buildVerseToolbar(suraId, ayaNum) {
    var btn = 'background:#FDF8EE;border:1px solid #E8C97B;border-radius:6px;width:32px;height:30px;' +
              'font-size:14px;cursor:pointer;padding:0;flex-shrink:0;display:inline-flex;' +
              'align-items:center;justify-content:center;';
    var s = suraId, a = ayaNum;
    return '' +
      '<div class="verse-actions" style="display:flex;gap:4px;justify-content:flex-end;margin-bottom:10px;flex-wrap:wrap;">' +
        '<button onclick="event.stopPropagation();speakVerseSelected(' + a + ',' + s + ',this)" class="verse-tts-btn" title="Listen in selected language">\u{1F50A}</button>' +
        '<select id="tts-lang-' + a + '" onclick="event.stopPropagation()" title="Select language" style="padding:3px 6px;border:1px solid #E8C97B;border-radius:8px;font-size:11px;background:#FDF8EE;color:#B8902A;outline:none;max-width:90px;">' +
          '<option value="english">English</option><option value="arabic">Arabic</option>' +
          '<option value="tigrinya">Tigrinya</option><option value="amharic">Amharic</option>' +
          '<option value="german">Deutsch</option><option value="urdu">\u0627\u0631\u062F\u0648</option>' +
          '<option value="somali">Somali</option><option value="oromo">Oromo</option>' +
        '</select>' +
        '<button id="bm-' + s + '-' + a + '" onclick="event.stopPropagation();toggleBookmark(' + a + ',' + s + ')" title="Bookmark" style="' + btn + '">' + (isBookmarked(a, s) ? '\u{1F516}' : '\u{1F3F7}\u{FE0F}') + '</button>' +
        '<button onclick="event.stopPropagation();showVerseHlPicker(' + a + ',' + s + ',this)" title="Highlight text" style="' + btn + '">\u{1F58A}</button>' +
        '<button onclick="event.stopPropagation();openNote(' + a + ',' + s + ')" title="Add note" style="' + btn + '">\u{1F4DD}</button>' +
        '<button id="copy-' + a + '" onclick="event.stopPropagation();copyVerse(' + a + ',' + s + ')" title="Copy visible languages" style="' + btn + '">\u{1F4CB}</button>' +
        '<button onclick="event.stopPropagation();shareVerse(' + a + ',' + s + ')" title="Share verse" style="' + btn + '">\u{1F4E4}</button>' +
        '<button onclick="event.stopPropagation();addVerseToPresentation(' + a + ',' + s + ')" data-sura="' + s + '" data-aya="' + a + '" title="Add to Presentation" style="background:#FDF8EE;border:1px solid #C9A85C;border-radius:6px;height:30px;padding:0 8px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;color:#B8902A;">\uFF0B</button>' +
        '<button onclick="event.stopPropagation();openSocialCardMain(' + s + ',' + a + ')" title="Create social media card" style="' + btn + '">\u{1F4F1}</button>' +
        '<button onclick="event.stopPropagation();openWordsFor(' + s + ',' + a + ')" title="Word-by-word study" class="wbw-toggle-btn">\u{1F524} Words</button>' +
      '</div>';
  }

/* ---- functions ported verbatim from index.html ---- */
  function addVerseToPresentation(ayaNum, suraId) {
    // Get text from already-rendered verse card
    var card = document.getElementById('vc-' + ayaNum);
    var english = card ? (card.querySelector('.verse-english') || card.querySelector('[class*="english"]') || {innerText:''}).innerText : '';
    var arabic = card ? (card.querySelector('.verse-arabic') || card.querySelector('[class*="arabic"]') || {innerText:''}).innerText : '';
    var key = 'presentationBasket';
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem(key)||'[]'); } catch(e){}
    var id = 'v_'+suraId+'_'+ayaNum+'_'+Date.now();
    var alreadyExists = existing.find(function(s){ return s.type==='quran' && s.reference==='Quran '+suraId+':'+ayaNum; });
    if (alreadyExists) { showToastMsg('Already in presentation'); return; }
    existing.push({
      type: 'quran',
      id: id,
      title: 'Quran ' + suraId + ':' + ayaNum,
      reference: 'Quran ' + suraId + ':' + ayaNum,
      text: english || '',
      arabic: arabic || '',
      sourceUrl: 'index.html?sura=' + suraId + '&aya=' + ayaNum
    });
    try { localStorage.setItem(key, JSON.stringify(existing)); } catch(e){}
    showToastMsg('✓ Added to presentation (' + existing.length + ' slides)');
  }

  function buildVerseShareText(ayaNum, suraId, cardEl) {
    // If a specific card element is provided, use it (for search-result cards
    // which don't have the standard vc-{n} ID). Otherwise fall back to the
    // main verse view by ID.
    let card = cardEl || document.getElementById('vc-' + ayaNum);
    if (!card) return { title: '', text: '' };
    // Most cards have a .verse-body; result cards don't. Scan the card itself
    // if there's no .verse-body inside.
    const body = card.querySelector('.verse-body') || card;
    if (!body) return { title: '', text: '' };
    // Only collect language lines that are not display:none
    const labels = {
      'lang-arabic': 'Arabic',
      'lang-translit': 'Transliteration',
      'lang-english': 'English',
      'lang-tigrinya': 'Tigrinya',
      'lang-amharic': 'Amharic',
      'lang-oromo': 'Oromo',
      'lang-somali': 'Somali'
    };
    const lines = [`Quran ${suraId}:${ayaNum}`, ''];
    for (const cls of Object.keys(labels)) {
      const el = body.querySelector('.' + cls);
      if (!el) continue;
      if (el.offsetParent === null) continue; // hidden via display:none
      const text = (el.innerText || '').trim();
      if (!text) continue;
      lines.push(`[${labels[cls]}]`);
      lines.push(text);
      lines.push('');
    }
    lines.push(`https://qurangeez-quran-scholar-api.hf.space/`);
    return {
      title: `Quran ${suraId}:${ayaNum}`,
      text: lines.join('\n').replace(/\n{3,}/g, '\n\n')
    };
  }

  async function copyVerse(ayaNum, suraId, evt) {
    const cardEl = evt && evt.currentTarget ? evt.currentTarget.closest('[data-result-card], .verse-card') : null;
    const { text } = buildVerseShareText(ayaNum, suraId, cardEl);
    if (!text) return;
    const btn = document.getElementById('copy-' + ayaNum);
    const original = btn ? btn.textContent : '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers — temp textarea + execCommand
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (btn) {
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = original || '📋'; }, 1200);
      }
    } catch(err) {
      alert('Could not copy: ' + err.message);
    }
  }

  function drawSocialCardMain(){
    if (!_socialMainVerse) return;
    const fmt = SOCIAL_FORMATS_MAIN[_socialMainFormat];
    const canvas = document.getElementById('socialCanvasMain');
    canvas.width = fmt.w; canvas.height = fmt.h;
    const ctx = canvas.getContext('2d');
    const W = fmt.w, H = fmt.h;
    const pad = W * 0.085;
    const contentWidth = W - pad * 2;

    // ── Cinematic backdrop: deep warm black, gold glow behind the text,
    //    vignette at the edges, double gold frame. ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0B2149'); bg.addColorStop(0.5, '#12356E'); bg.addColorStop(1, '#061229');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W/2, H*0.44, 0, W/2, H*0.44, Math.max(W, H) * 0.62);
    glow.addColorStop(0, 'rgba(255,214,64,0.20)');
    glow.addColorStop(0.45, 'rgba(255,214,64,0.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.28, W/2, H/2, Math.max(W, H) * 0.78);
    vig.addColorStop(0, 'rgba(4,12,28,0)'); vig.addColorStop(1, 'rgba(4,12,28,0.62)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,214,64,0.90)'; ctx.lineWidth = Math.max(2, W * 0.0045);
    ctx.strokeRect(pad*0.42, pad*0.42, W - pad*0.84, H - pad*0.84);
    ctx.strokeStyle = 'rgba(255,214,64,0.32)'; ctx.lineWidth = Math.max(1, W * 0.0016);
    ctx.strokeRect(pad*0.64, pad*0.64, W - pad*1.28, H - pad*1.28);

    ctx.textAlign = 'center';

    const activeLangs = Object.keys(ALL_LANGS).filter(k => _socialMainLangs && _socialMainLangs[k] && _socialMainVerse[SOCIAL_FIELD_MAP[k]]);
    const hasArabic = activeLangs.includes('arabic');
    const otherLangs = activeLangs.filter(k => k !== 'arabic');

    // TikTok overlays UI on the bottom (~35%) and top bar — keep the verse in the
    // upper safe zone so captions/buttons/live UI never cover it.
    const topLimit = _socialMainFormat === 'tiktok' ? H * 0.085 : pad * 1.15;
    const bottomLimit = _socialMainFormat === 'tiktok' ? H * 0.66 : H - pad * 1.55;
    const avail = bottomLimit - topLimit;

    // Measure the whole composition at a given scale. Type starts LARGE and
    // only shrinks if the content genuinely needs the room, so a short verse
    // fills the card instead of floating in empty space.
    function buildLayout(sc){
      const blocks = [];
      let total = 0;
      const titleSize = Math.round(W * 0.030 * sc);
      const titleGap = W * 0.050 * sc;
      blocks.push({ type:'title', size:titleSize, gapAfter:titleGap });
      total += titleSize + titleGap;

      if (hasArabic) {
        const aSize = Math.round(W * 0.092 * sc);
        ctx.direction = 'rtl';
        ctx.font = `${aSize}px "Times New Roman", serif`;
        const lines = wrapCanvasTextMain(ctx, _socialMainVerse.arabic, contentWidth);
        ctx.direction = 'ltr';
        const lh = aSize * 1.52;
        const gapAfter = otherLangs.length ? W * 0.055 * sc : 0;
        blocks.push({ type:'arabic', size:aSize, lines, lh, gapAfter });
        total += lines.length * lh + gapAfter;
      }

      otherLangs.forEach((k, i) => {
        const fSize = Math.round(W * 0.044 * sc);
        const labelSize = Math.round(W * 0.021 * sc);
        ctx.direction = (k === 'urdu') ? 'rtl' : 'ltr';
        ctx.font = `${k === 'english' ? 'italic ' : ''}${fSize}px Georgia, serif`;
        const lines = wrapCanvasTextMain(ctx, _socialMainVerse[SOCIAL_FIELD_MAP[k]], contentWidth * 0.94);
        ctx.direction = 'ltr';
        const lh = fSize * 1.44;
        const gapAfter = (i === otherLangs.length - 1) ? 0 : W * 0.042 * sc;
        blocks.push({ type:'lang', key:k, size:fSize, labelSize, lines, lh, gapAfter });
        total += labelSize * 2.3 + lines.length * lh + gapAfter;
      });

      return { blocks, total };
    }

    // Find the LARGEST scale that still fits, rather than only shrinking from
    // 1.0 -- otherwise a short verse on a tall canvas (Story) leaves the type
    // marooned in the middle. Descending search: first fit wins.
    let scale = 1.75, layout = buildLayout(scale);
    while (layout.total > avail * 0.94 && scale > 0.30) { scale -= 0.03; layout = buildLayout(scale); }

    // Vertically centre the finished block: no more dead space at the bottom.
    let cursor = topLimit + Math.max(0, (avail - layout.total) / 2);

    layout.blocks.forEach(b => {
      if (b.type === 'title') {
        ctx.fillStyle = '#FFD640';
        ctx.font = `700 ${b.size}px Georgia, serif`;
        ctx.letterSpacing = `${Math.round(W*0.004)}px`;
        ctx.fillText(`QUR'AN ${_socialMainSura}:${_socialMainAya}`, W/2, cursor + b.size);
        ctx.letterSpacing = '0px';
        // thin gold rule under the reference
        const ruleY = cursor + b.size + b.gapAfter * 0.45;
        const ruleW = Math.min(contentWidth * 0.34, W * 0.30);
        const rg = ctx.createLinearGradient(W/2 - ruleW/2, 0, W/2 + ruleW/2, 0);
        rg.addColorStop(0, 'rgba(255,214,64,0)');
        rg.addColorStop(0.5, 'rgba(255,214,64,0.90)');
        rg.addColorStop(1, 'rgba(255,214,64,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(W/2 - ruleW/2, ruleY, ruleW, Math.max(1, W*0.0018));
        cursor += b.size + b.gapAfter;

      } else if (b.type === 'arabic') {
        ctx.direction = 'rtl';
        ctx.font = `${b.size}px "Times New Roman", serif`;
        ctx.fillStyle = '#FFE45C';
        ctx.shadowColor = 'rgba(255,214,64,0.50)';
        ctx.shadowBlur = W * 0.022;
        b.lines.forEach(line => { ctx.fillText(line, W/2, cursor + b.size * 0.92); cursor += b.lh; });
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.direction = 'ltr';
        cursor += b.gapAfter;

      } else {
        ctx.fillStyle = 'rgba(255,214,64,0.95)';
        ctx.font = `700 ${b.labelSize}px Georgia, serif`;
        ctx.letterSpacing = `${Math.round(W*0.0045)}px`;
        ctx.fillText(ALL_LANGS[b.key].label.toUpperCase(), W/2, cursor + b.labelSize);
        ctx.letterSpacing = '0px';
        cursor += b.labelSize * 2.3;

        ctx.direction = (b.key === 'urdu') ? 'rtl' : 'ltr';
        ctx.font = `${b.key === 'english' ? 'italic ' : ''}${b.size}px Georgia, serif`;
        ctx.fillStyle = '#FFE97A';
        b.lines.forEach(line => { ctx.fillText(line, W/2, cursor + b.size * 0.9); cursor += b.lh; });
        ctx.direction = 'ltr';
        cursor += b.gapAfter;
      }
    });

    ctx.font = `700 ${Math.round(W * 0.021)}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255,214,64,0.80)';
    ctx.letterSpacing = `${Math.round(W*0.005)}px`;
    ctx.fillText('quranhikma.com', W/2, _socialMainFormat === 'tiktok' ? H * 0.70 : H - pad * 0.72);
    ctx.letterSpacing = '0px';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function noteKey(suraId, ayaNum) { return `note_${suraId}_${ayaNum}`; }

  function openNote(ayaNum, suraId) {
    try {
      currentNoteKey = noteKey(suraId, ayaNum);
      currentNoteSura = suraId;
      currentNoteAya = ayaNum;
      const labelEl = document.getElementById('noteVerseLabel');
      const editorEl = document.getElementById('noteText');
      const modalEl = document.getElementById('noteModal');
      if (!modalEl) { alert('Note dialog not found in page. Please refresh.'); return; }
      if (labelEl) labelEl.textContent = `${suraId}:${ayaNum}`;
      if (editorEl) editorEl.innerHTML = localStorage.getItem(currentNoteKey) || '';
      modalEl.classList.add('open');
      setTimeout(() => { if (editorEl) editorEl.focus(); }, 50);
    } catch(err) {
      alert('Could not open note: ' + err.message);
    }
  }

  async function openSocialCardMain(sura, aya, crossRefTheme){
    _socialMainSura = sura; _socialMainAya = aya; _socialMainFormat = 'tiktok';
    _socialMainVerseList = null; _socialMainVerseListIdx = 0;
    document.getElementById('socialOverlayMain').style.display = 'flex';
    document.getElementById('socialCanvasLoadingMain').style.display = 'block';
    document.getElementById('socialCanvasMain').style.display = 'none';
    const _lw = document.getElementById('scm-langs-wrap');
    if (_lw) _lw.style.display = 'none';
    setSocialFormatMainUI('tiktok');
  
    // DEBUGGING: Log the theme being passed
    console.log('[OPEN CARD] sura=' + sura + ', aya=' + aya + ', theme=' + (crossRefTheme || 'null'));
    console.log('[OPEN CARD] Cache keys available:', window._crossRefThemeLists ? Object.keys(window._crossRefThemeLists) : 'NO CACHE');
  
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ayas?select=arabic,arabic_transliteration,english,tigrinya,amharic,oromo,somali,german,urdu&sura_id=eq.${sura}&aya_number=eq.${aya}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
      const rows = await res.json();
      _socialMainVerse = rows[0] || {};
      // The 6 newer languages live in verse_translations, not as ayas columns.
      const vtRes = await fetch(`${SUPABASE_URL}/rest/v1/verse_translations?select=lang,text&verse_key=eq.${sura}:${aya}&lang=in.(${Object.keys(SOCIAL_VT_LANGS).join(',')})`,
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
      const vtRows = await vtRes.json();
      if (Array.isArray(vtRows)) vtRows.forEach(r => { _socialMainVerse[SOCIAL_VT_LANGS[r.lang]] = r.text; });
      resetSocialLangsMain();
      document.getElementById('socialCanvasLoadingMain').style.display = 'none';
      document.getElementById('socialCanvasMain').style.display = 'inline-block';
      drawSocialCardMain();
    } catch(e) {
      document.getElementById('socialCanvasLoadingMain').textContent = 'Could not load verse text.';
    }
  
    // Set cross-reference navigation context at the END (outside try-catch)
    if (crossRefTheme && window._crossRefThemeLists && window._crossRefThemeLists[crossRefTheme]) {
      const verseList = window._crossRefThemeLists[crossRefTheme];
      _socialNavigationContext = {
        type: 'cross-reference',
        theme: crossRefTheme,
        verses: verseList
      };
      console.log('[DEBUG] Context SET at END of openSocialCardMain:', _socialNavigationContext);
    } else {
      _socialNavigationContext = null;
    }
  }

  function renderSocialLangChipsMain(){
    const wrap = document.getElementById('scm-langs-wrap');
    const box = document.getElementById('scm-langs');
    if (!wrap || !box) return;
    const avail = socialAvailableLangsMain();
    if (!avail.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    box.innerHTML = avail.map(k => {
      const on = !!(_socialMainLangs && _socialMainLangs[k]);
      return '<button onclick="toggleSocialLangMain(\'' + k + '\')"'
        + ' aria-pressed="' + (on ? 'true' : 'false') + '"'
        + ' style="padding:5px 11px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:700;'
        + 'border:1.5px solid ' + (on ? '#C9A84C' : '#D4C9A8') + ';'
        + 'background:' + (on ? '#C9A84C' : '#fff') + ';'
        + 'color:' + (on ? '#fff' : '#7A8FA6') + ';">'
        + escapeHtml(ALL_LANGS[k].label) + '</button>';
    }).join('');
  }

  function resetSocialLangsMain(){
    const avail = socialAvailableLangsMain();
    if (!avail.length) return;
    _socialMainLangs = {};
    // Reset returns to the page's current language choices, falling back to
    // Arabic + English if that would leave the card empty.
    avail.forEach(k => { _socialMainLangs[k] = !!langState[k]; });
    if (!avail.some(k => _socialMainLangs[k])) {
      avail.forEach(k => { if (k === 'arabic' || k === 'english') _socialMainLangs[k] = true; });
      if (!avail.some(k => _socialMainLangs[k])) _socialMainLangs[avail[0]] = true;
    }
    const note = document.getElementById('scm-langs-note');
    if (note) note.style.display = 'none';
    renderSocialLangChipsMain();
    try { drawSocialCardMain(); } catch(e) { console.error('drawSocialCardMain failed:', e); }
  }

  function setSocialFormatMainUI(fmt){
    ['tiktok','square','story','wide'].forEach(f => {
      const btn = document.getElementById('scm-fmt-' + f);
      btn.style.background = f === fmt ? '#C9A84C' : '#fff';
      btn.style.color = f === fmt ? '#fff' : '#1a1a1a';
    });
  }

  async function shareVerse(ayaNum, suraId) {
    const data = buildVerseShareText(ayaNum, suraId);
    if (!data.text) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: data.title, text: data.text });
        return;
      } catch(err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    // No native share — fall back to copy
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(data.text);
        alert('Verse copied to clipboard. Paste it into any app.');
        return;
      } catch(err) {}
    }
    // Last fallback: mailto
    const subject = encodeURIComponent(data.title);
    const body = encodeURIComponent(data.text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function showToastMsg(msg) {
    var t = document.getElementById('copy-toast') || document.getElementById('toast-msg');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pres-toast';
      t.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:#1A3A2A;color:#C9A85C;padding:8px 18px;border-radius:20px;font-family:Inconsolata,monospace;font-size:12px;z-index:9999;opacity:0;transition:all .3s;pointer-events:none;border:1px solid #C9A85C;white-space:nowrap;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function(){ t.style.opacity='0'; }, 2200);
  }

  function showVerseHlPicker(ayaNum, suraId, btn) {
    _hlVerseNum = ayaNum;
    _hlSuraId = suraId;
    const picker = document.getElementById('verseHlPicker');
    const rect = btn.getBoundingClientRect();
    picker.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    picker.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
    picker.classList.add('open');
    setTimeout(() => document.addEventListener('click', _closeHlPicker, { once: true }), 10);
  }

  function socialAvailableLangsMain(){
    // Only languages that genuinely have text for THIS verse are offered --
    // never show a toggle that would produce an empty section.
    return Object.keys(ALL_LANGS).filter(k => {
      const v = _socialMainVerse && _socialMainVerse[SOCIAL_FIELD_MAP[k]];
      return typeof v === 'string' && v.trim();
    });
  }

  function speakVerse(ayaNum, suraId, lang, btn) {
    if (!('speechSynthesis' in window)) return;
    if (_verseTtsSpeaking) {
      window.speechSynthesis.cancel();
      if (_verseTtsBtn) { _verseTtsBtn.classList.remove('playing'); _verseTtsBtn.textContent = '🔊'; }
      _verseTtsSpeaking = false;
      if (_verseTtsBtn === btn) return;
    }
    const card = document.getElementById('vc-' + ayaNum);
    if (!card) return;
    const langEl = card.querySelector('.lang-' + lang);
    if (!langEl) return;
    const text = langEl.innerText.trim();
    if (!text) return;
    const ttsCode = LANG_TTS_MAP[lang] || 'en-US';
    if (!ttsCode) { alert('TTS not available for ' + lang); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = ttsCode;
    utt.rate = 0.85;
    utt.onstart = () => { _verseTtsSpeaking = true; _verseTtsBtn = btn; btn.classList.add('playing'); btn.textContent = '⏹'; };
    utt.onend = () => { _verseTtsSpeaking = false; btn.classList.remove('playing'); btn.textContent = '🔊'; };
    utt.onerror = () => { _verseTtsSpeaking = false; btn.classList.remove('playing'); btn.textContent = '🔊'; };
    window.speechSynthesis.speak(utt);
  }

  function speakVerseSelected(ayaNum, suraId, btn) {
    const sel = document.getElementById('tts-lang-' + ayaNum);
    const lang = sel ? sel.value : 'english';
    speakVerse(ayaNum, suraId, lang, btn);
  }

  function toggleSocialLangMain(k){
    if (!_socialMainLangs) return;
    const note = document.getElementById('scm-langs-note');
    const selected = socialAvailableLangsMain().filter(x => _socialMainLangs[x]);
    // Turning off the last remaining language would render a card with no
    // verse text on it, so block that and say why instead of failing quietly.
    if (_socialMainLangs[k] && selected.length <= 1) {
      if (note) { note.style.display = 'block'; setTimeout(() => { note.style.display = 'none'; }, 2200); }
      return;
    }
    if (note) note.style.display = 'none';
    _socialMainLangs[k] = !_socialMainLangs[k];
    renderSocialLangChipsMain();
    try { drawSocialCardMain(); } catch(e) { console.error('drawSocialCardMain failed:', e); }
  }

  function wrapCanvasTextMain(ctx, text, maxWidth){
    const words = (text || '').split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* export */
  global.buildVerseToolbar = buildVerseToolbar;
  global.toggleBookmark = toggleBookmark;
  global.isBookmarked = isBookmarked;
  global.openWordsFor = openWordsFor;
  global.bmKey = bmKey;
  global.noteKey = noteKey;
  global.escapeHtml = escapeHtml;
  global.speakVerse = speakVerse;
  global.speakVerseSelected = speakVerseSelected;
  global.showVerseHlPicker = showVerseHlPicker;
  global.openNote = openNote;
  global.copyVerse = copyVerse;
  global.shareVerse = shareVerse;
  global.addVerseToPresentation = addVerseToPresentation;
  global.openSocialCardMain = openSocialCardMain;
  global.showToastMsg = showToastMsg;
  global.buildVerseShareText = buildVerseShareText;
})(window);
