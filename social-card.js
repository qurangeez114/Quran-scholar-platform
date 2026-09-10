/* Shared "Social Media Card" generator.
 *
 * Self-contained on purpose: index.html has its own inline copy that predates
 * this file, and pages like theme-analysis.html share none of its globals
 * (no SUPABASE_URL/KEY, no ALL_LANGS, no langState, no escapeHtml). Rather
 * than paste a third divergent copy, this module carries everything it needs
 * and injects its own modal on first use.
 *
 * Usage from any page:  <script src="social-card.js" defer></script>
 * then:                 openSocialCard(suraNumber, ayaNumber)
 *
 * Everything is namespaced under SC_/scCard to avoid clashing with whatever
 * the host page already defines.
 */
(function () {
  if (window.openSocialCard) return; // never double-register

  var SC_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  var SC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
  var SC_HDR = { apikey: SC_KEY, Authorization: 'Bearer ' + SC_KEY };

  var SC_FORMATS = { square: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 }, wide: { w: 1200, h: 675 } };

  // label + which ayas column (or verse_translations lang code) holds the text
  var SC_LANGS = {
    arabic:   { label: 'Arabic',          field: 'arabic' },
    translit: { label: 'Transliteration', field: 'arabic_transliteration' },
    english:  { label: 'English',         field: 'english' },
    tigrinya: { label: 'Tigrinya',        field: 'tigrinya' },
    amharic:  { label: 'Amharic',         field: 'amharic' },
    oromo:    { label: 'Oromo',           field: 'oromo' },
    somali:   { label: 'Somali',          field: 'somali' },
    german:   { label: 'German',          field: 'german' },
    urdu:     { label: 'Urdu',            field: 'urdu' },
    bengali:  { label: 'Bengali',         field: 'bengali',  vt: 'bn' },
    malay:    { label: 'Malay',           field: 'malay',    vt: 'ms' },
    spanish:  { label: 'Spanish',         field: 'spanish',  vt: 'es' },
    chinese:  { label: 'Chinese',         field: 'chinese',  vt: 'zh' },
    swahili:  { label: 'Swahili',         field: 'swahili',  vt: 'sw' },
    hausa:    { label: 'Hausa',           field: 'hausa',    vt: 'ha' }
  };
  var SC_AYA_COLS = Object.keys(SC_LANGS).filter(function (k) { return !SC_LANGS[k].vt; })
    .map(function (k) { return SC_LANGS[k].field; }).join(',');
  var SC_VT_CODES = Object.keys(SC_LANGS).filter(function (k) { return SC_LANGS[k].vt; })
    .map(function (k) { return SC_LANGS[k].vt; });

  var scSura = null, scAya = null, scFormat = 'square', scVerse = null, scSel = null;
  var scVerseList = null; // List of related verses (cross-references)
  var scListIndex = 0;   // Current position in cross-reference list

  function scEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Seed from the host page's saved language choices when it has them, so the
     card opens showing roughly what the reader already reads. */
  function scPageLangs() {
    try {
      var saved = JSON.parse(localStorage.getItem('langState'));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    return null;
  }

  function scEnsureModal() {
    if (document.getElementById('scCardOverlay')) return;
    var el = document.createElement('div');
    el.id = 'scCardOverlay';
    el.setAttribute('style', 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999998;align-items:center;justify-content:center;padding:12px;overflow-y:auto;');
    el.onclick = function (e) { if (e.target === el) closeSocialCard(); };
    el.innerHTML =
      '<div style="background:#fff;border-radius:14px;padding:16px;width:100%;max-width:480px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
      + '<button id="scNavPrev" onclick="scNavigate(-1)" style="background:none;border:none;font-size:20px;color:#C9A84C;cursor:pointer;padding:4px 8px;opacity:0.7;hover:{opacity:1};">◀</button>'
      + '<div style="font-size:14px;font-weight:700;color:#C9A84C;flex:1;text-align:center;">📱 Social Media Card</div>'
      + '<button id="scNavNext" onclick="scNavigate(1)" style="background:none;border:none;font-size:20px;color:#C9A84C;cursor:pointer;padding:4px 8px;opacity:0.7;hover:{opacity:1};">▶</button>'
      + '<button onclick="closeSocialCard()" style="background:none;border:none;font-size:18px;color:#999;cursor:pointer;">✕</button>'
      + '</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:12px;">'
      + '<button id="scFmtSquare" onclick="scSetFormat(\'square\')" style="flex:1;padding:8px;border:1.5px solid #E8C97B;border-radius:8px;background:#C9A84C;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">◻️ Square<br><span style="font-weight:400;font-size:10px;">Instagram/X post</span></button>'
      + '<button id="scFmtStory" onclick="scSetFormat(\'story\')" style="flex:1;padding:8px;border:1.5px solid #E8C97B;border-radius:8px;background:#fff;color:#1a1a1a;font-size:12px;font-weight:700;cursor:pointer;">📱 Story<br><span style="font-weight:400;font-size:10px;">Stories/TikTok/Reels</span></button>'
      + '<button id="scFmtWide" onclick="scSetFormat(\'wide\')" style="flex:1;padding:8px;border:1.5px solid #E8C97B;border-radius:8px;background:#fff;color:#1a1a1a;font-size:12px;font-weight:700;cursor:pointer;">▭ Wide<br><span style="font-weight:400;font-size:10px;">X/Twitter card</span></button>'
      + '</div>'
      + '<div id="scLangsWrap" style="margin-bottom:12px;display:none;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
      + '<div style="font-size:11px;font-weight:700;color:#B8902A;text-transform:uppercase;letter-spacing:0.5px;">Languages on card</div>'
      + '<button onclick="scResetLangs()" style="background:none;border:none;font-size:11px;color:#7A8FA6;cursor:pointer;text-decoration:underline;padding:0;">Reset</button>'
      + '</div>'
      + '<div id="scLangs" style="display:flex;flex-wrap:wrap;gap:6px;"></div>'
      + '<div id="scLangsNote" style="font-size:11px;color:#999;margin-top:6px;display:none;">Keep at least one language selected.</div>'
      + '</div>'
      + '<div style="text-align:center;background:#F0EDE6;border-radius:8px;padding:10px;margin-bottom:12px;min-height:120px;">'
      + '<canvas id="scCanvas" style="max-width:100%;height:auto;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.15);"></canvas>'
      + '<div id="scLoading" style="color:#999;font-size:13px;padding:30px 0;">Loading verse…</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button onclick="scDownload()" style="flex:1;padding:10px;background:#C9A84C;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">⬇️ Download Image</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
  }

  function scWrap(ctx, text, maxWidth) {
    var words = String(text || '').split(' ');
    var lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function scAvailable() {
    return Object.keys(SC_LANGS).filter(function (k) {
      var v = scVerse && scVerse[SC_LANGS[k].field];
      return typeof v === 'string' && v.trim();
    });
  }

  function scRenderChips() {
    var wrap = document.getElementById('scLangsWrap'), box = document.getElementById('scLangs');
    if (!wrap || !box) return;
    var avail = scAvailable();
    if (!avail.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    box.innerHTML = avail.map(function (k) {
      var on = !!(scSel && scSel[k]);
      return '<button onclick="scToggleLang(\'' + k + '\')" aria-pressed="' + (on ? 'true' : 'false') + '"'
        + ' style="padding:5px 11px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:700;'
        + 'border:1.5px solid ' + (on ? '#C9A84C' : '#D4C9A8') + ';background:' + (on ? '#C9A84C' : '#fff')
        + ';color:' + (on ? '#fff' : '#7A8FA6') + ';">' + scEsc(SC_LANGS[k].label) + '</button>';
    }).join('');
  }

  window.scToggleLang = function (k) {
    if (!scSel) return;
    var note = document.getElementById('scLangsNote');
    var on = scAvailable().filter(function (x) { return scSel[x]; });
    if (scSel[k] && on.length <= 1) {
      if (note) { note.style.display = 'block'; setTimeout(function () { note.style.display = 'none'; }, 2200); }
      return;
    }
    if (note) note.style.display = 'none';
    scSel[k] = !scSel[k];
    scRenderChips();
    try { scDraw(); } catch (e) { console.error('social card draw failed:', e); }
  };

  window.scResetLangs = function () {
    var avail = scAvailable();
    if (!avail.length) return;
    var page = scPageLangs();
    scSel = {};
    avail.forEach(function (k) { scSel[k] = page ? !!page[k] : (k === 'arabic' || k === 'english'); });
    if (!avail.some(function (k) { return scSel[k]; })) {
      avail.forEach(function (k) { if (k === 'arabic' || k === 'english') scSel[k] = true; });
      if (!avail.some(function (k) { return scSel[k]; })) scSel[avail[0]] = true;
    }
    var note = document.getElementById('scLangsNote');
    if (note) note.style.display = 'none';
    scRenderChips();
    try { scDraw(); } catch (e) { console.error('social card draw failed:', e); }
  };

  window.scSetFormat = function (fmt) {
    scFormat = fmt;
    [['square', 'scFmtSquare'], ['story', 'scFmtStory'], ['wide', 'scFmtWide']].forEach(function (p) {
      var b = document.getElementById(p[1]);
      if (!b) return;
      b.style.background = (p[0] === fmt) ? '#C9A84C' : '#fff';
      b.style.color = (p[0] === fmt) ? '#fff' : '#1a1a1a';
    });
    try { scDraw(); } catch (e) { console.error('social card draw failed:', e); }
  };

  function scDraw() {
    if (!scVerse) return;
    var fmt = SC_FORMATS[scFormat];
    var canvas = document.getElementById('scCanvas');
    canvas.width = fmt.w; canvas.height = fmt.h;
    var ctx = canvas.getContext('2d');
    var W = fmt.w, H = fmt.h;
    var pad = W * 0.085;
    var contentWidth = W - pad * 2;

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0B2149'); bg.addColorStop(0.5, '#12356E'); bg.addColorStop(1, '#061229');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, Math.max(W, H) * 0.62);
    glow.addColorStop(0, 'rgba(255,214,64,0.20)');
    glow.addColorStop(0.45, 'rgba(255,214,64,0.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    var vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.78);
    vig.addColorStop(0, 'rgba(4,12,28,0)'); vig.addColorStop(1, 'rgba(4,12,28,0.62)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,214,64,0.90)'; ctx.lineWidth = Math.max(2, W * 0.0045);
    ctx.strokeRect(pad * 0.42, pad * 0.42, W - pad * 0.84, H - pad * 0.84);
    ctx.strokeStyle = 'rgba(255,214,64,0.32)'; ctx.lineWidth = Math.max(1, W * 0.0016);
    ctx.strokeRect(pad * 0.64, pad * 0.64, W - pad * 1.28, H - pad * 1.28);

    ctx.textAlign = 'center';

    var active = Object.keys(SC_LANGS).filter(function (k) {
      return scSel && scSel[k] && scVerse[SC_LANGS[k].field];
    });
    var hasArabic = active.indexOf('arabic') !== -1;
    var others = active.filter(function (k) { return k !== 'arabic'; });

    var topLimit = pad * 1.15, bottomLimit = H - pad * 1.55;
    var avail = bottomLimit - topLimit;

    function build(sc) {
      var blocks = [], total = 0;
      var titleSize = Math.round(W * 0.030 * sc), titleGap = W * 0.050 * sc;
      blocks.push({ type: 'title', size: titleSize, gapAfter: titleGap });
      total += titleSize + titleGap;

      if (hasArabic) {
        var aSize = Math.round(W * 0.092 * sc);
        ctx.direction = 'rtl';
        ctx.font = aSize + 'px "Times New Roman", serif';
        var aLines = scWrap(ctx, scVerse.arabic, contentWidth);
        ctx.direction = 'ltr';
        var aLh = aSize * 1.52;
        var aGap = others.length ? W * 0.055 * sc : 0;
        blocks.push({ type: 'arabic', size: aSize, lines: aLines, lh: aLh, gapAfter: aGap });
        total += aLines.length * aLh + aGap;
      }

      others.forEach(function (k, i) {
        var fSize = Math.round(W * 0.044 * sc), labelSize = Math.round(W * 0.021 * sc);
        ctx.direction = (k === 'urdu') ? 'rtl' : 'ltr';
        ctx.font = (k === 'english' ? 'italic ' : '') + fSize + 'px Georgia, serif';
        var lines = scWrap(ctx, scVerse[SC_LANGS[k].field], contentWidth * 0.94);
        ctx.direction = 'ltr';
        var lh = fSize * 1.44;
        var gapAfter = (i === others.length - 1) ? 0 : W * 0.042 * sc;
        blocks.push({ type: 'lang', key: k, size: fSize, labelSize: labelSize, lines: lines, lh: lh, gapAfter: gapAfter });
        total += labelSize * 2.3 + lines.length * lh + gapAfter;
      });
      return { blocks: blocks, total: total };
    }

    var scale = 1.75, layout = build(scale);
    while (layout.total > avail * 0.94 && scale > 0.30) { scale -= 0.03; layout = build(scale); }

    var cursor = topLimit + Math.max(0, (avail - layout.total) / 2);

    layout.blocks.forEach(function (b) {
      if (b.type === 'title') {
        ctx.fillStyle = '#FFD640';
        ctx.font = '700 ' + b.size + 'px Georgia, serif';
        ctx.letterSpacing = Math.round(W * 0.004) + 'px';
        ctx.fillText("QUR'AN " + scSura + ':' + scAya, W / 2, cursor + b.size);
        ctx.letterSpacing = '0px';
        var ruleY = cursor + b.size + b.gapAfter * 0.45;
        var ruleW = Math.min(contentWidth * 0.34, W * 0.30);
        var rg = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
        rg.addColorStop(0, 'rgba(255,214,64,0)');
        rg.addColorStop(0.5, 'rgba(255,214,64,0.90)');
        rg.addColorStop(1, 'rgba(255,214,64,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, Math.max(1, W * 0.0018));
        cursor += b.size + b.gapAfter;

      } else if (b.type === 'arabic') {
        ctx.direction = 'rtl';
        ctx.font = b.size + 'px "Times New Roman", serif';
        ctx.fillStyle = '#FFE45C';
        ctx.shadowColor = 'rgba(255,214,64,0.50)';
        ctx.shadowBlur = W * 0.022;
        b.lines.forEach(function (line) { ctx.fillText(line, W / 2, cursor + b.size * 0.92); cursor += b.lh; });
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.direction = 'ltr';
        cursor += b.gapAfter;

      } else {
        ctx.fillStyle = 'rgba(255,214,64,0.95)';
        ctx.font = '700 ' + b.labelSize + 'px Georgia, serif';
        ctx.letterSpacing = Math.round(W * 0.0045) + 'px';
        ctx.fillText(SC_LANGS[b.key].label.toUpperCase(), W / 2, cursor + b.labelSize);
        ctx.letterSpacing = '0px';
        cursor += b.labelSize * 2.3;

        ctx.direction = (b.key === 'urdu') ? 'rtl' : 'ltr';
        ctx.font = (b.key === 'english' ? 'italic ' : '') + b.size + 'px Georgia, serif';
        ctx.fillStyle = '#FFE97A';
        b.lines.forEach(function (line) { ctx.fillText(line, W / 2, cursor + b.size * 0.9); cursor += b.lh; });
        ctx.direction = 'ltr';
        cursor += b.gapAfter;
      }
    });

    ctx.font = '700 ' + Math.round(W * 0.021) + 'px Georgia, serif';
    ctx.fillStyle = 'rgba(255,214,64,0.80)';
    ctx.letterSpacing = Math.round(W * 0.005) + 'px';
    ctx.fillText('quranhikma.com', W / 2, H - pad * 0.72);
    ctx.letterSpacing = '0px';
  }

  window.scDownload = function () {
    var canvas = document.getElementById('scCanvas');
    var link = document.createElement('a');
    link.download = 'quran-' + scSura + '-' + scAya + '-' + scFormat + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  window.scNavigate = function (dir) {
    if (!scVerse) return;

    // Cross-reference list navigation takes priority over chapter order.
    // The list is re-passed to openSocialCard so it survives the next hop.
    if (Array.isArray(scVerseList) && scVerseList.length > 0) {
      var scCur = scSura + ':' + scAya;
      var scI = scVerseList.indexOf(scCur);
      if (scI === -1) scI = scListIndex;
      var scNext = scI + dir;
      if (scNext < 0 || scNext >= scVerseList.length) return; // at an end
      var scParts = String(scVerseList[scNext]).split(':');
      openSocialCard(Number(scParts[0]), Number(scParts[1]), scVerseList, scNext);
      return;
    }

    var newAya = scAya + dir;
    // Determine max aya for current sura from Qur'an structure
    var surahLengths = {1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,81:29,82:19,83:36,84:45,85:22,86:17,87:19,88:26,89:30,90:20,91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,111:5,112:4,113:5,114:6};
    var maxAya = surahLengths[scSura] || scAya;
    if (newAya < 1) newAya = 1;
    if (newAya > maxAya) newAya = maxAya;
    if (newAya === scAya) return; // no change
    openSocialCard(scSura, newAya);
  };

  window.closeSocialCard = function () {
    var o = document.getElementById('scCardOverlay');
    if (o) o.style.display = 'none';
  };

  // Keyboard navigation for social card modal
  var scKeyListener = function (e) {
    var o = document.getElementById('scCardOverlay');
    if (!o || o.style.display === 'none') return; // modal not visible
    if (e.key === 'ArrowLeft') { e.preventDefault(); window.scNavigate(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); window.scNavigate(1); }
  };

  window.openSocialCard = async function (sura, aya, verseList, listIndex) {
    scEnsureModal();
    scSura = sura; scAya = aya; scFormat = 'square'; scVerse = null; scSel = null;
    scVerseList = verseList || null;  // Store cross-reference list if provided
    scListIndex = (typeof listIndex === 'number') ? listIndex : 0;
    
    document.getElementById('scCardOverlay').style.display = 'flex';
    document.getElementById('scLoading').style.display = 'block';
    document.getElementById('scLoading').textContent = 'Loading verse…';
    document.getElementById('scCanvas').style.display = 'none';
    document.getElementById('scLangsWrap').style.display = 'none';
    window.scSetFormat('square');
    
    // Attach keyboard listener when modal opens
    if (!window.scKeyListenerAttached) {
      document.addEventListener('keydown', scKeyListener);
      window.scKeyListenerAttached = true;
    }
    
    try {
      var res = await fetch(SC_URL + '/rest/v1/ayas?select=' + SC_AYA_COLS
        + '&sura_id=eq.' + sura + '&aya_number=eq.' + aya, { headers: SC_HDR });
      var rows = await res.json();
      scVerse = (rows && rows[0]) || {};
      // The newer languages live in verse_translations, not as ayas columns.
      try {
        var vtRes = await fetch(SC_URL + '/rest/v1/verse_translations?select=lang,text&verse_key=eq.'
          + sura + ':' + aya + '&lang=in.(' + SC_VT_CODES.join(',') + ')', { headers: SC_HDR });
        var vtRows = await vtRes.json();
        if (Array.isArray(vtRows)) {
          vtRows.forEach(function (r) {
            var key = Object.keys(SC_LANGS).find(function (k) { return SC_LANGS[k].vt === r.lang; });
            if (key) scVerse[SC_LANGS[key].field] = r.text;
          });
        }
      } catch (e) { /* extra languages are optional -- the card still works without them */ }

      window.scResetLangs();
      document.getElementById('scLoading').style.display = 'none';
      document.getElementById('scCanvas').style.display = 'inline-block';
      scDraw();
    } catch (e) {
      console.error('social card load failed:', e);
      document.getElementById('scLoading').textContent = 'Could not load verse text.';
    }
  };
})();
