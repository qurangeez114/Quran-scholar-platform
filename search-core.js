/* QuranHikma shared search helpers: Arabic normalisation, tokenising,
   English/Arabic concept expansion, diacritic-tolerant highlighting and
   relevance scoring. Exposed as window.QHSearch. No network access. */
(function (root) {
  'use strict';
  var DIAC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
  var STOP = new Set(('the a an of in on and or to for with by from about is are was were be what who how why when where does do did ' +
    'في من على عن الى إلى و او أو ما هل').split(' '));

  function normAr(s) {
    return String(s || '').replace(DIAC, '')
      .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')   // آ أ إ ٱ -> ا
      .replace(/\u0649/g, '\u064A')                       // ى -> ي
      .replace(/\u0629/g, '\u0647')                       // ة -> ه
      .replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A');
  }
  function norm(s) { return normAr(String(s || '').normalize('NFKC').toLowerCase()).replace(/[\u2019'`ʿʾ]/g, ''); }
  function isAr(s) { return /[\u0600-\u06FF]/.test(s || ''); }
  function stripAl(t) { return isAr(t) && t.length > 4 && t.indexOf('\u0627\u0644') === 0 ? t.slice(2) : t; }

  /* Concept groups: tight equivalents only (same concept, other language or
     spelling). Built from research-classic's CONCEPT_MAP topics, but limited
     to true synonyms so AND-matching stays precise. First entry = canonical
     English term used for the server query. */
  var GROUPS = [
    ['patience','patient','sabr','steadfast','صبر','الصبر','صابر','الصابرين'],
    ['prayer','pray','prayers','salah','salat','salaat','صلاه','الصلاه','صلوات','يصلي'],
    ['inheritance','inherit','inherits','heir','heirs','mirath','miraath','faraid','estate','ميراث','الميراث','ارث','الارث','ورثه','يرث','الفرايض'],
    ['women','woman','wife','wives','female','nisa','نساء','النساء','المراه','امراه','زوجه'],
    ['men','man','male','husband','رجال','الرجال'],
    ['jesus','isa','messiah','christ','عيسي','المسيح','ابن مريم'],
    ['crucifixion','crucified','crucify','cross','salb','صلب','صلبوه','الصلب'],
    ['mary','maryam','مريم'],
    ['moses','musa','موسي'],
    ['abraham','ibrahim','ابراهيم'],
    ['noah','nuh','نوح'],
    ['joseph','yusuf','يوسف'],
    ['muhammad','prophet','messenger','rasul','محمد','النبي','رسول الله'],
    ['fasting','fast','sawm','siyam','ramadan','صوم','الصوم','صيام','الصيام'],
    ['charity','zakat','zakah','sadaqah','alms','زكاه','الزكاه','صدقه','الصدقه'],
    ['pilgrimage','hajj','umrah','الحج','عمره'],
    ['marriage','marry','married','nikah','wedding','نكاح','النكاح','زواج','الزواج'],
    ['divorce','talaq','طلاق','الطلاق'],
    ['repentance','tawbah','tawba','repent','توبه','التوبه'],
    ['forgiveness','forgive','maghfirah','pardon','مغفره','المغفره','عفو'],
    ['mercy','merciful','rahmah','rahma','رحمه','الرحمه'],
    ['paradise','jannah','heaven','garden','جنه','الجنه'],
    ['hell','hellfire','jahannam','fire','جهنم','النار'],
    ['judgment','resurrection','qiyamah','القيامه','يوم القيامه','البعث'],
    ['jihad','struggle','fighting','qital','جهاد','الجهاد','قتال','القتال'],
    ['jizya','jizyah','jizia','جزيه','الجزيه'],
    ['slavery','slave','slaves','captive','captives','الرق','عبيد','العبيد','السبي'],
    ['theft','thief','steal','stealing','سرقه','السرقه','سارق'],
    ['adultery','fornication','zina','زنا','الزنا'],
    ['apostasy','apostate','riddah','ردّه','رده','الرده','مرتد'],
    ['wine','alcohol','intoxicant','khamr','خمر','الخمر'],
    ['interest','usury','riba','ربا','الربا'],
    ['orphan','orphans','yatim','يتيم','اليتيم','اليتامي'],
    ['kaaba','kabah','الكعبه','كعبه'],
    ['pictures','picture','images','image','statues','idols','صور','الصور','تماثيل','اصنام'],
    ['angel','angels','malaikah','الملايكه','ملايكه'],
    ['quran','qur\'an','koran','قران','القران'],
    ['hadith','sunnah','حديث','الحديث','السنه'],
    ['faith','belief','iman','ايمان','الايمان'],
    ['gratitude','thankful','shukr','شكر','الشكر'],
    ['trust','tawakkul','reliance','توكل','التوكل'],
    ['oneness','tawhid','monotheism','توحيد','التوحيد'],
    ['polytheism','shirk','idolatry','شرك','الشرك'],
    ['knowledge','ilm','learning','علم','العلم'],
    ['parents','mother','father','والدين','الوالدين','الام','الاب'],
    ['children','child','son','daughter','اولاد','الاولاد','بنات'],
    ['death','die','dying','dead','موت','الموت'],
    ['war','battle','ghazwa','غزوه','حرب','معركه']
  ].map(function (g) { return g.map(norm); });
  var INDEX = new Map();
  GROUPS.forEach(function (g, i) { g.forEach(function (t) { INDEX.set(stripAl(t), i); INDEX.set(t, i); }); });

  function tokenize(q) {
    var s = norm(q).replace(/["“”«»()\[\]{},.;:!?؟،؛]+/g, ' ').trim();
    if (!s) return [];
    var words = s.split(/\s+/), out = [], i = 0;
    while (i < words.length) {            // greedy 2-word concepts first ("ibn maryam", "rasul allah")
      var two = words[i] + ' ' + (words[i + 1] || '');
      if (words[i + 1] && INDEX.has(two)) { out.push(two); i += 2; continue; }
      if (!STOP.has(words[i]) && words[i].length > 1) out.push(words[i]);
      i++;
    }
    return out.length ? out : words.filter(function (w) { return w.length > 1; });
  }

  /* Returns [{term, variants[], canonical}] one per query concept. */
  function expand(q) {
    return tokenize(q).map(function (t) {
      var gi = INDEX.has(t) ? INDEX.get(t) : INDEX.get(stripAl(t));
      var vs = new Set([t, stripAl(t)]);
      if (gi !== undefined) GROUPS[gi].forEach(function (v) { vs.add(v); vs.add(stripAl(v)); });
      return { term: t, canonical: gi !== undefined ? GROUPS[gi][0] : t, variants: Array.from(vs).filter(Boolean) };
    });
  }

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var D = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]*';
  var AR_EQ = { '\u0627': '[\u0627\u0622\u0623\u0625\u0671]', '\u064A': '[\u064A\u0649\u0626]', '\u0647': '[\u0647\u0629]', '\u0648': '[\u0648\u0624]' };
  function variantPattern(v) {
    if (!isAr(v)) return '\\b' + esc(v).replace(/\s+/g, '\\s+') + SUF + '\\b';
    return Array.from(v).map(function (ch) { return ch === ' ' ? '\\s+' : (AR_EQ[ch] || esc(ch)); }).join(D);
  }
  /* Regex over ORIGINAL text that tolerates diacritics and letter variants. */
  function highlightRegex(groups) {
    var all = [];
    groups.forEach(function (g) { g.variants.forEach(function (v) { if (isAr(v) ? v.length >= 3 : v.length > 1) all.push(v); }); });
    all.sort(function (a, b) { return b.length - a.length; });
    if (!all.length) return null;
    return new RegExp('(' + all.map(variantPattern).join('|') + ')', 'gi');
  }
  var SUF = "(?:s|es|ed|ing|'s)?";
  function wordHit(text, v) {      // English: whole word (+ simple suffix); Arabic: substring of >=3 letters
    if (isAr(v)) return v.replace(/\s/g, '').length >= 3 && text.indexOf(v) !== -1;
    return new RegExp('(^|[^a-z0-9])' + esc(v) + SUF + '(?![a-z0-9])').test(text);
  }
  /* Score a record. fields: {title:'..', body:'..'} (any keys; 'title'/'ref' weigh more).
     Returns {score, matchedAll, matched}. */
  function score(fields, groups, rawQuery) {
    var nf = {}, k, total = 0, matched = 0;
    for (k in fields) nf[k] = norm(fields[k]);
    var all = Object.keys(nf).map(function (x) { return nf[x]; }).join(' \n ');
    groups.forEach(function (g) {
      var best = 0;
      g.variants.forEach(function (v) {
        var s = 0;
        for (k in nf) if (nf[k] && wordHit(nf[k], v)) s += (k === 'title' || k === 'ref') ? 4 : 2;
        if (s && v === g.term) s += 1;           // exact word typed
        if (s > best) best = s;
      });
      if (best) matched++;
      total += best;
    });
    var nq = norm(rawQuery || '').trim();
    if (nq && nq.indexOf(' ') > 0 && all.indexOf(nq) !== -1) total += 6;   // exact phrase
    if (groups.length > 1 && matched === groups.length) {               // proximity
      var pos = groups.map(function (g) {
        var p = -1; g.variants.some(function (v) { p = all.indexOf(v); return p !== -1; }); return p;
      });
      if (pos.every(function (p) { return p >= 0; }) && Math.max.apply(null, pos) - Math.min.apply(null, pos) < 120) total += 3;
    }
    return { score: total, matched: matched, matchedAll: matched === groups.length };
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function highlight(text, rx) {
    text = String(text || '');
    if (!rx) return escHtml(text);
    var out = '', last = 0, m; rx.lastIndex = 0;
    while ((m = rx.exec(text))) {
      if (!m[0]) { rx.lastIndex++; continue; }
      out += escHtml(text.slice(last, m.index)) + '<mark class="hl">' + escHtml(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + escHtml(text.slice(last));
  }
  function snippet(text, rx, len) {
    text = String(text || ''); if (text.length <= len) return text;
    var i = 0; if (rx) { rx.lastIndex = 0; var m = rx.exec(text); if (m) i = Math.max(0, m.index - Math.floor(len / 3)); }
    return (i > 0 ? '… ' : '') + text.slice(i, i + len) + (i + len < text.length ? ' …' : '');
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }

  root.QHSearch = { norm: norm, normAr: normAr, isArabic: isAr, tokenize: tokenize, expand: expand,
    highlightRegex: highlightRegex, score: score, highlight: highlight, snippet: snippet, escHtml: escHtml, debounce: debounce, groups: GROUPS };
})(window);
