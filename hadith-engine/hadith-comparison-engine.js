/* QuranHikma Hadith Narration Comparison Engine — pure functions (browser + Node).
 * Every automatic output is a *candidate*; only a recorded review can promote it.
 * Omission (a claim absent from one report) is NEVER classified as contradiction. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HadithEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RELATIONSHIPS = ['identical', 'similar', 'complementary', 'omission', 'divergent',
    'apparent_contradiction', 'direct_contradiction', 'unrelated'];
  var VERIFICATION = ['candidate', 'source_checked', 'analysis_reviewed', 'disputed', 'rejected'];

  function normalizeArabic(s) {
    return String(s || '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tokens(s) { var n = normalizeArabic(s); return n ? n.split(' ') : []; }

  // Common transmission verbs; the matn is taken to start after the last
  // "Companion + qāla/qālat" marker found in the opening of the text.
  var ISNAD_VERBS = /^(و?حدثنا|و?حدثني|و?اخبرنا|و?اخبرني|عن|قال|قالت|سمعت|سمعه|انه|انها|ان|ح)$/;
  function splitIsnadMatn(text, companionMarkers) {
    var t = tokens(text), cut = -1;
    (companionMarkers || []).forEach(function (m) {
      var mt = tokens(m), lim = Math.min(t.length, 120);
      for (var i = 0; i + mt.length <= lim; i++) {
        if (mt.every(function (w, k) { return t[i + k] === w; })) { cut = Math.max(cut, i + mt.length); break; }
      }
    });
    if (cut < 0) return { isnad: '', matn: t.join(' '), confidence: 'low', status: 'candidate' };
    while (cut < t.length && /^(قال|قالت|انه|انها|رضي|الله|عنه|عنها|عنهما|الانصاري|ام|المؤمنين|اخبرته)$/.test(t[cut])) cut++;
    return { isnad: t.slice(0, cut).join(' '), matn: t.slice(cut).join(' '), confidence: 'medium', status: 'candidate' };
  }

  // Token-level LCS alignment → ops: equal / insert (only in b) / delete (only in a).
  function align(a, b) {
    var x = Array.isArray(a) ? a : tokens(a), y = Array.isArray(b) ? b : tokens(b);
    var n = x.length, m = y.length, i, j;
    if (n * m > 4e6) throw new Error('texts too long for in-browser alignment');
    var L = []; for (i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var ops = []; i = 0; j = 0;
    function push(op, w) { var l = ops[ops.length - 1]; if (l && l.op === op) l.words.push(w); else ops.push({ op: op, words: [w] }); }
    while (i < n && j < m) {
      if (x[i] === y[j]) { push('equal', x[i]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { push('delete', x[i]); i++; }
      else { push('insert', y[j]); j++; }
    }
    while (i < n) push('delete', x[i++]); while (j < m) push('insert', y[j++]);
    var common = L[0][0];
    return { ops: ops, common: common, similarity: (n + m) ? (2 * common) / (n + m) : 1 };
  }
  function similarity(a, b) { return align(a, b).similarity; }

  /* Propositions: map of propositionId → {status, value?, exclusive?}
   *   status: 'affirms' | 'negates' | 'absent' (absent = report is silent).
   *   value:  optional explicit value (e.g. first-revealed passage).
   *   exclusive: the report states the value *exclusively* ("only", "first").
   * Returns per-proposition differences and an overall candidate label. */
  function compareClaims(pa, pb) {
    var keys = {}; Object.keys(pa || {}).concat(Object.keys(pb || {})).forEach(function (k) { keys[k] = 1; });
    var out = [];
    Object.keys(keys).forEach(function (k) {
      var a = (pa || {})[k] || { status: 'absent' }, b = (pb || {})[k] || { status: 'absent' }, kind;
      if (a.status === 'absent' && b.status === 'absent') return;
      if (a.status === 'absent' || b.status === 'absent') kind = 'omission';
      else if (a.status !== b.status) kind = 'direct_contradiction';               // affirms vs negates
      else if (a.value !== undefined && b.value !== undefined && a.value !== b.value) {
        if (a.lexical || b.lexical) kind = 'wording_variant';           // same claim, different word form
        else if ((a.exclusive && b.exclusive) || (a.exclusive && b.interpretation) || (b.exclusive && a.interpretation))
          kind = 'apparent_contradiction';                              // incompatible only under a stated reading
        else kind = 'divergent';
      }
      else kind = 'agreement';
      out.push({ proposition: k, a: a, b: b, kind: kind });
    });
    return out;
  }

  function classifyRelationship(input) {
    var sim = input.similarity != null ? input.similarity : similarity(input.matnA || '', input.matnB || '');
    var diffs = compareClaims(input.claimsA, input.claimsB);
    var count = function (k) { return diffs.filter(function (d) { return d.kind === k; }).length; };
    var agree = count('agreement'), om = count('omission');
    var omA = diffs.filter(function (d) { return d.kind === 'omission' && d.a.status === 'absent'; }).length;
    var label;
    if (count('direct_contradiction')) label = 'direct_contradiction';
    else if (count('apparent_contradiction')) label = 'apparent_contradiction';
    else if (count('divergent')) label = 'divergent';
    else if (!agree && !count('wording_variant') && sim < 0.25) label = 'unrelated';
    else if (sim >= 0.97 && !om && !count('wording_variant')) label = 'identical';
    else if (om && omA && omA < om) label = 'complementary';   // each side adds something
    else if (om) label = 'omission';                            // one side is a subset
    else label = 'similar';
    return { label: label, similarity: Math.round(sim * 1000) / 1000, differences: diffs,
      verification_status: 'candidate', method: 'hce-rules-v1' };
  }

  // Transmission: chains are arrays ordered collector → … → Companion.
  function sharedTransmitters(chains) {
    var cnt = {}, ids = Object.keys(chains);
    ids.forEach(function (id) {
      var seen = {};
      chains[id].forEach(function (route) { route.forEach(function (n) { if (!seen[n]) { seen[n] = 1; cnt[n] = (cnt[n] || 0) + 1; } }); });
    });
    return Object.keys(cnt).filter(function (n) { return cnt[n] > 1; })
      .map(function (n) { return { transmitter: n, reports: cnt[n] }; })
      .sort(function (a, b) { return b.reports - a.reports; });
  }
  // Highest-generation transmitter (closest to collector) shared by *every* chain: candidate common link.
  function commonLink(chains) {
    var ids = Object.keys(chains); if (!ids.length) return null;
    var routes = []; ids.forEach(function (id) { chains[id].forEach(function (r) { routes.push(r); }); });
    var first = routes[0];
    for (var i = 0; i < first.length; i++) {
      var n = first[i];
      if (routes.every(function (r) { return r.indexOf(n) >= 0; })) return { transmitter: n, status: 'candidate' };
    }
    return null;
  }

  function canPromote(record, review) {
    // A candidate may only be promoted with a named reviewer, cited evidence, and a checked source.
    if (!review || !review.reviewer || !review.evidence || !review.evidence.length) return false;
    if (record.verification_status === 'candidate' && review.to === 'analysis_reviewed') return !!review.source_checked;
    return VERIFICATION.indexOf(review.to) >= 0;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeURL(u) { try { var x = new URL(u); return (x.protocol === 'https:' && !x.username && !x.password) ? x.href : null; } catch (e) { return null; } }

  return { RELATIONSHIPS: RELATIONSHIPS, VERIFICATION: VERIFICATION, normalizeArabic: normalizeArabic, tokens: tokens,
    splitIsnadMatn: splitIsnadMatn, align: align, similarity: similarity, compareClaims: compareClaims,
    classifyRelationship: classifyRelationship, sharedTransmitters: sharedTransmitters, commonLink: commonLink,
    canPromote: canPromote, esc: esc, safeURL: safeURL };
});
