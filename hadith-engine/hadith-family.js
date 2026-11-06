/* Renders the hadith-family pilot from static JSON (no DB writes, no network beyond same-origin JSON). */
(function () {
  'use strict';
  var E = window.HadithEngine, esc = E.esc, $ = function (id) { return document.getElementById(id); };
  var BASE = './hadith-engine/pilot/';
  var FAMILIES = { 'beginning-of-revelation': ['beginning-of-revelation.json', 'analysis.json', 'conclusions.json'],
    'isra-wal-miraj': ['isra-wal-miraj.json', 'isra-wal-miraj.analysis.json', 'isra-wal-miraj.conclusions.json'],
    'final-illness-abu-bakr-prayer': ['final-illness-abu-bakr-prayer.json', 'final-illness-abu-bakr-prayer.analysis.json', 'final-illness-abu-bakr-prayer.conclusions.json'],
    'actions-by-intentions': ['actions-by-intentions.json', 'actions-by-intentions.analysis.json', 'actions-by-intentions.conclusions.json'],
    'islam-built-on-five': ['islam-built-on-five.json', 'islam-built-on-five.analysis.json', 'islam-built-on-five.conclusions.json'],
    'farewell-pilgrimage-sanctity': ['farewell-pilgrimage-sanctity.json', 'farewell-pilgrimage-sanctity.analysis.json', 'farewell-pilgrimage-sanctity.conclusions.json'] };
  var LEGACY = { branches: { A: 'ʿĀʾisha branch', J: 'Jābir branch' }, companion_markers: { A: ['عائشه'], J: ['جابر بن عبد الله', 'جابر'] }, default_selection: ['bukhari:3', 'muslim:160a', 'bukhari:4953'] };
  var slug = (new URLSearchParams(location.search).get('f') || 'beginning-of-revelation');
  if (!FAMILIES.hasOwnProperty(slug)) slug = 'beginning-of-revelation';
  var famNav = $('famNav');
  if (famNav) famNav.innerHTML = Object.keys(FAMILIES).map(function (k) { return '<a href="?f=' + encodeURIComponent(k) + '"' + (k === slug ? ' aria-current="page"' : '') + '>' + esc(k.replace(/-/g, ' ')) + '</a>'; }).join('');
  Promise.all(FAMILIES[slug].map(function (f) {
    return fetch(BASE + f).then(function (r) { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
  })).then(function (d) { render(d[0], d[1], d[2]); })
    .catch(function (e) { $('coverage').innerHTML = '<p role="alert">Could not load pilot data: ' + esc(e.message) + '</p>'; });

  function words(m) {
    var raw = String(m.text_arabic || '').split(/\s+/).filter(Boolean);
    var sp = E.splitIsnadMatn(m.text_arabic, (m._fam.companion_markers || LEGACY.companion_markers)[m.branch] || []);
    var isnLen = E.tokens(sp.isnad).length, seen = 0;
    return raw.map(function (w) { var n = E.tokens(w).join(''); var isn = seen < isnLen; seen += E.tokens(w).length; return { raw: w, n: n, isn: isn }; });
  }
  var CODES = { bukhari: 'Bukhārī ', muslim: 'Muslim ', tirmidhi: 'Tirmidhī ', nasai: 'Nasāʾī ', abudawud: 'Abū Dāwūd ', ibnmajah: 'Ibn Mājah ', malik: 'Muwaṭṭaʾ ' };
  function ref(m) { var r = m.verified_reference, c = r.split(/[:\/]/)[0]; return CODES[c] ? CODES[c] + r.slice(c.length + 1) : r; }

  function render(fam, an, cc) {
    var BR = fam.branches || LEGACY.branches, bk = Object.keys(BR).filter(function (b) { return fam.members.some(function (m) { return m.branch === b; }); });
    if (fam.title) { var h = document.querySelector('h1'); h.innerHTML = esc(fam.title) + ((fam.title_ar || (slug === 'beginning-of-revelation' ? 'بدء الوحي' : '')) ? ' <span class="ar" lang="ar" dir="rtl">' + esc(fam.title_ar || 'بدء الوحي') + '</span>' : ''); document.title = 'Hadith Family: ' + fam.title + ' (pilot) — Quran Hikma'; }
    var mem = fam.members, byRef = {}; mem.forEach(function (m) { m._fam = fam; byRef[m.verified_reference] = m; m._w = words(m); });
    var cols = {}; mem.forEach(function (m) { cols[m.collection] = (cols[m.collection] || 0) + 1; });
    var nRev = an.relationships.filter(function (r) { return r.verification_status !== 'candidate'; }).length;
    $('coverage').innerHTML = '<h2>Coverage report</h2><p><b>' + mem.length + '</b> indexed records in <b>' + Object.keys(cols).length + '</b> collections (' +
      Object.keys(cols).map(function (c) { return esc(c) + ' ' + cols[c]; }).join(' · ') + ') form <b>' + bk.length + '</b> narration branches (' + bk.map(function (b) { return esc(BR[b]); }).join(', ') + '), so these are not ' + mem.length + ' independent traditions. ' +
      '<b>' + an.relationships.length + '</b> relationships are computed, and <b>' + nRev + '</b> of them have been reviewed. <span class="status">family: ' + esc(fam.verification_status) + '</span></p>' +
      (fam.unverified && fam.unverified.length ? '<p class="hint">Not yet matched to sunnah.com (kept out, candidate): records ' + fam.unverified.join(', ') + '</p>' : '') + '<details class="hint"><summary>Excluded records (' + fam.excluded.length + ')</summary>' + fam.excluded.map(function (x) { return 'record ' + x.hadith_corpus_canonical_id + ' (' + esc(x.relationship) + ': ' + esc(x.reason) + ')'; }).join('; ') + '</details>';
    var pk = $('picker'), def = fam.default_selection || LEGACY.default_selection;
    mem.forEach(function (m) {
      var l = document.createElement('label'); l.className = 'br-' + bk.indexOf(m.branch);
      l.innerHTML = '<input type="checkbox" value="' + esc(m.verified_reference) + '"' + (def.indexOf(m.verified_reference) >= 0 ? ' checked' : '') + '> ' + esc(ref(m)) + (m.abridged ? ' <small>(abridged)</small>' : '');
      pk.appendChild(l);
    });
    function sel() { return [].slice.call(pk.querySelectorAll('input:checked')).map(function (i) { return byRef[i.value]; }); }
    function draw() {
      var s = sel(), showIsn = $('showIsnad').checked, base = s[0];
      $('cols').innerHTML = s.length < 2 ? '<p class="hint">Select at least two reports.</p>' : s.map(function (m, idx) {
        var w = m._w.filter(function (x) { return showIsn || !x.isn; }), html, miss = '';
        if (idx === 0) html = w.map(function (x) { return '<span' + (x.isn ? ' class="isn"' : '') + '>' + esc(x.raw) + '</span>'; }).join(' ');
        else {
          var bw = base._w.filter(function (x) { return (showIsn || !x.isn) && x.n; }), cw = w.filter(function (x) { return x.n; });
          var al = E.align(bw.map(function (x) { return x.n; }), cw.map(function (x) { return x.n; })), ci = 0, out = [], gone = [];
          al.ops.forEach(function (o) {
            if (o.op === 'delete') { gone.push(o.words.join(' ')); return; }
            var part = cw.slice(ci, ci + o.words.length).map(function (x) { return esc(x.raw); }).join(' '); ci += o.words.length;
            out.push(o.op === 'insert' ? '<mark class="ins">' + part + '</mark>' : part);
          });
          html = out.join(' ');
          var g = gone.filter(function (x) { return x.split(' ').length >= 3; });
          miss = '<div class="missing"><b>Word similarity to ' + esc(ref(base)) + ': ' + Math.round(al.similarity * 100) + '%.</b> ' + g.length + ' passages of 3 or more words are absent here (normalised):' +
            g.slice(0, 6).map(function (x) { return '<span class="arabs" lang="ar">' + esc(x.split(' ').slice(0, 14).join(' ')) + (x.split(' ').length > 14 ? ' …' : '') + '</span>'; }).join('') + (g.length > 6 ? '<i>…and ' + (g.length - 6) + ' more</i>' : '') + '</div>';
        }
        var u = E.safeURL(m.verified_url);
        return '<article class="col"><h3>' + esc(ref(m)) + ' <span class="status">' + esc(BR[m.branch] || m.branch) + '</span></h3>' +
          '<div class="meta">' + esc(m.collection) + ' · ' + esc(m.grade || '') + ' · QuranHikma record ' + m.hadith_corpus_canonical_id + ' (stored no. ' + esc(m.db_hadith_number) + ')' +
          (u ? ' · <a href="' + esc(u) + '" rel="noopener" target="_blank">sunnah.com</a>' : '') + ' · text match ' + m.text_match_ratio + (m.url_mismatch ? ' · <b>stored link differs</b>' : '') + '</div>' +
          '<div class="arab" lang="ar" dir="rtl">' + html + '</div>' + miss + '<p class="meta">English: see the sunnah.com link. Translations are not republished here for copyright reasons.</p></article>';
      }).join('');
    }
    pk.addEventListener('change', draw); $('showIsnad').addEventListener('change', draw); draw();

    var pids = Object.keys(fam.propositions);
    $('claimTable').innerHTML = '<thead><tr><th scope="col">Report</th>' + pids.map(function (p) { return '<th scope="col" title="' + esc(fam.propositions[p]) + '">' + esc(p.slice(0, 3)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      mem.map(function (m) { return '<tr><th scope="row">' + esc(ref(m)) + '</th>' + pids.map(function (p) { var c = m.claims[p]; return c ? '<td class="ar" title="' + esc(c.evidence) + '">●' + (c.value ? '<br><small>' + esc(c.value) + '</small>' : '') + '</td>' : '<td></td>'; }).join('') + '</tr>'; }).join('') + '</tbody>' +
      '<caption class="hint" style="caption-side:bottom;text-align:left">' + pids.map(function (p) { return '<b>' + esc(p.slice(0, 3)) + '</b> ' + esc(fam.propositions[p]); }).join(' · ') + '</caption>';

    var sh = {}; an.transmission.all.shared.forEach(function (s) { sh[s.transmitter] = s.reports; });
    var nm = function (t) { return (fam.transmitters[t] || { name: t }).name; };
    var cl = function (x) { return x && x.common_link ? esc(nm(x.common_link.transmitter)) : 'none'; };
    var brs = an.transmission.branches || { A: an.transmission.aisha, J: an.transmission.jabir };
    $('isnadBox').innerHTML = '<p>Shared transmitter (candidate common link) by branch: ' + Object.keys(brs).filter(function (b) { return brs[b]; }).map(function (b) { return esc(BR[b] || b) + ': <b>' + cl(brs[b]) + '</b>' + (brs[b].reports === 1 ? ' <small>(single report, not meaningful)</small>' : ''); }).join(' · ') + '. Across the whole family: <b>' + cl(an.transmission.all) + '</b>.</p>' +
      '<p class="hint">Chains run collector\'s teacher → … → Companion. Highlighted names appear in more than one report. ' + esc(fam.isnad_method || 'Identities are name-pattern matches') + ' (status candidate).</p>' +
      mem.map(function (m) { return '<div class="route"><b>' + esc(ref(m)) + ':</b> ' + (m.isnad_routes.length ? m.isnad_routes.map(function (r) { return r.map(function (t) { return '<span class="chip' + (sh[t] > 1 ? ' shared' : '') + '">' + esc(nm(t)) + '</span>'; }).join(' → '); }).join(' <i>and</i> ') : '<i>not segmented</i>') + (m.isnad_note ? ' <small>(' + esc(m.isnad_note) + ')</small>' : '') + '</div>'; }).join('');

    $('relTable').innerHTML = '<thead><tr><th>A</th><th>B</th><th>Label</th><th>Similarity (matn)</th><th>Differences by claim</th><th>Status</th></tr></thead><tbody>' +
      an.relationships.map(function (r) { return '<tr><td>' + esc(r.a) + '</td><td>' + esc(r.b) + '</td><td><span class="lab ' + esc(r.label) + '">' + esc(r.label.replace(/_/g, ' ')) + '</span></td><td>' + r.similarity + '</td><td>' +
        r.differences.map(function (d) { return esc(d.proposition) + ': <i>' + esc(d.kind.replace(/_/g, ' ')) + '</i> (' + esc(d.a) + ' / ' + esc(d.b) + ')'; }).join('<br>') + '</td><td><span class="status">' + esc(r.verification_status) + '</span></td></tr>'; }).join('') + '</tbody>';

    $('concl').innerHTML = cc.conclusions.map(function (c) { return '<li>' + esc(c.text) + ' <span class="status">' + esc(c.status) + (c.source_checked ? ' · sources checked' : '') + '</span><br><small>Evidence: ' +
      c.citations.map(function (r) { var u = E.safeURL('https://sunnah.com/' + r); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(r) + '</a>' : esc(r); }).join(', ') + '</small></li>'; }).join('');
    $('unc').innerHTML = cc.uncertainties.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('');
  }
})();
