// QuranHikma — database-backed Tafsir comparison renderer.
// Safe integration module: uses the site's existing sbFetch helper and never
// embeds credentials. It renders only stored tafsir_entries data and does not
// infer semantic agreement/disagreement from raw prose.
(function(){
  'use strict';

  const BASELINE = [
    ['tabari','al-Ṭabarī'],
    ['ibn_kathir','Ibn Kathīr'],
    ['qurtubi','al-Qurṭubī'],
    ['jalalayn','al-Jalālayn'],
    ['saadi','al-Saʿdī'],
    ['ibn_abbas','Ibn ʿAbbās / Tanwīr al-Miqbās']
  ];
  const NAMES = Object.fromEntries(BASELINE);

  function esc(value='') {
    return String(value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  function longestPerLanguage(rows) {
    const out = {};
    for (const row of rows || []) {
      const lang = row.language || 'unknown';
      if (!out[lang] || String(row.content || '').length > String(out[lang].content || '').length) {
        out[lang] = row;
      }
    }
    return out;
  }

  function groupRows(rows) {
    const grouped = {};
    for (const row of rows || []) {
      const key = row.scholar_key || 'unknown';
      (grouped[key] ||= []).push(row);
    }
    return grouped;
  }

  async function fetchRows(sura, aya) {
    if (typeof window.sbFetch === 'function') {
      return await window.sbFetch('tafsir_entries', {
        sura: `eq.${sura}`,
        aya: `eq.${aya}`,
        select: 'scholar_key,language,content',
        order: 'scholar_key.asc,language.asc'
      });
    }
    if (typeof sbFetch === 'function') {
      return await sbFetch('tafsir_entries', {
        sura: `eq.${sura}`,
        aya: `eq.${aya}`,
        select: 'scholar_key,language,content',
        order: 'scholar_key.asc,language.asc'
      });
    }
    throw new Error('The existing sbFetch database helper is not available on this page.');
  }

  function styles() {
    if (document.getElementById('qh-tafsir-compare-css')) return;
    const s = document.createElement('style');
    s.id = 'qh-tafsir-compare-css';
    s.textContent = `
      .qh-tc{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1b18}
      .qh-tc-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}
      .qh-tc-metric{border:1px solid #e2d8c2;border-radius:10px;padding:8px;text-align:center;background:#fffdf8}
      .qh-tc-metric b{display:block;font-size:18px}.qh-tc-metric span{font-size:10px;color:#746b5c}
      .qh-tc-coverage{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 12px}
      .qh-tc-pill{display:inline-block;background:#fff4d6;border:1px solid #e7cf8f;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:800}
      .qh-tc-pill.missing{background:#f7eeee;border-color:#e2bbbb;color:#8a3d3d}
      .qh-tc-grid{display:grid;grid-template-columns:1fr;gap:10px}.qh-tc-card{border:1px solid #e1d8c6;border-radius:12px;overflow:hidden;background:#fff}
      .qh-tc-card summary{padding:11px 12px;font-weight:800;cursor:pointer;background:#fbf7ed}.qh-tc-body{padding:12px;border-top:1px solid #e8e0d2}
      .qh-tc-lang{font-size:10px;font-weight:800;color:#8b6d23;margin:9px 0 4px}.qh-tc-text{white-space:pre-wrap;line-height:1.6;font-size:13px}.qh-tc-text.ar{direction:rtl;text-align:right;font-size:17px}
      .qh-tc-note{background:#f6f3ea;border-left:3px solid #b99232;padding:9px 10px;font-size:11px;line-height:1.45;margin:10px 0}
      @media(min-width:760px){.qh-tc-grid{grid-template-columns:1fr 1fr}.qh-tc-summary{grid-template-columns:repeat(4,1fr)}}`;
    document.head.appendChild(s);
  }

  async function render(container, sura, aya) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) throw new Error('Comparison container not found.');
    styles();
    el.classList.add('qh-tc');
    el.innerHTML = '<div class="qh-tc-note">Loading stored tafsīr comparison…</div>';

    try {
      const rows = await fetchRows(Number(sura), Number(aya)) || [];
      const grouped = groupRows(rows);
      const keys = Object.keys(grouped);
      const langs = [...new Set(rows.map(r => r.language).filter(Boolean))];
      const found = BASELINE.filter(([k]) => grouped[k]).length;
      const ordered = [
        ...BASELINE.map(x => x[0]).filter(k => grouped[k]),
        ...keys.filter(k => !NAMES[k])
      ];

      const summary = `<div class="qh-tc-summary">
        <div class="qh-tc-metric"><b>${rows.length}</b><span>DB rows</span></div>
        <div class="qh-tc-metric"><b>${keys.length}</b><span>scholars</span></div>
        <div class="qh-tc-metric"><b>${found}/6</b><span>baseline</span></div>
        <div class="qh-tc-metric"><b>${langs.length}</b><span>languages</span></div>
      </div>`;

      const coverage = `<div class="qh-tc-coverage">${BASELINE.map(([k,n]) =>
        `<span class="qh-tc-pill ${grouped[k] ? '' : 'missing'}">${grouped[k] ? '✓' : '—'} ${esc(n)}</span>`
      ).join('')}</div>`;

      const note = '<div class="qh-tc-note">This view compares only text actually stored in <b>tafsir_entries</b>. Agreement, disagreement, preferred views, rejected reports and interpretation counts are intentionally not inferred from raw prose. Those will be attached from the verified proposition layer.</div>';

      const cards = rows.length ? `<div class="qh-tc-grid">${ordered.map((k, i) => {
        const langMap = longestPerLanguage(grouped[k]);
        const langKeys = Object.keys(langMap).sort((a,b) => a === 'ar' ? -1 : b === 'ar' ? 1 : a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b));
        return `<details class="qh-tc-card" ${i===0?'open':''}><summary>${esc(NAMES[k] || k)} <small>(${grouped[k].length} row${grouped[k].length===1?'':'s'})</small></summary><div class="qh-tc-body">${langKeys.map(lang => {
          const row = langMap[lang];
          return `<div class="qh-tc-lang">${esc(lang.toUpperCase())}</div><div class="qh-tc-text ${lang==='ar'?'ar':''}">${esc(row.content || '')}</div>`;
        }).join('')}</div></details>`;
      }).join('')}</div>` : '<div class="qh-tc-note">No stored tafsīr rows were returned for this verse.</div>';

      el.innerHTML = summary + coverage + note + cards;
      return {sura:Number(sura), aya:Number(aya), rows:rows.length, scholarKeys:keys.length, baselineFound:found, languages:langs};
    } catch (err) {
      el.innerHTML = `<div class="qh-tc-note">Tafsīr comparison could not load: ${esc(err.message || err)}</div>`;
      throw err;
    }
  }

  window.QuranHikmaTafsirComparison = { render, fetchRows };
})();