/* Quran Hikma: verified, verse-specific historical Sources panel.
   Never display unreviewed ancient_sources rows as verified evidence. */
(function () {
  'use strict';
  const SELECT = 'source_title,tradition,approx_date,source_type,source_locator,relationship_kind,parallel_summary,similarity_note,difference_note,reference_link,source_edition,verification_note,verification_status';
  // A checked, dated snapshot keeps citations available during transient PostgREST failures.
  // Never promote unreviewed rows or pretend a cached snapshot is current live data.
  const SNAPSHOT_URL = '/qh-sources-verified-snapshot.json?v=20261108-qumran-research-batch';
  let snapshotPromise = null;

  function el(tag, text, css) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (css) node.style.cssText = css;
    return node;
  }
  function addResearchLinks(wrap, card) {
    const bar = el('div', null, 'display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;');
    [['Read Tafsir', 'tafsir'], ['View Cross-References', 'xrefs']].forEach(([label, key]) => {
      const b = el('button', label, 'padding:9px 12px;border:1px solid #c9b895;border-radius:8px;background:#fffaf0;color:#51411e;font:600 14px system-ui;cursor:pointer;');
      b.type = 'button';
      b.addEventListener('click', () => {
        const tab = Array.from(card.querySelectorAll('.tab-btn')).find(item =>
          (item.getAttribute('onclick') || '').includes("'" + key + "'"));
        if (tab) tab.click();
      });
      bar.appendChild(b);
    });
    const sura = Number(card.dataset.sura);
    const verse = Number((card.id || '').replace('vc-', ''));
    if (sura === 18 && verse >= 83 && verse <= 98) {
      const a = el('a', 'Dhul-Qarnayn: historical sources & scholarly history ↗',
        'padding:9px 12px;border:1px solid #ac8750;border-radius:8px;background:#f9f0d9;color:#4e360a;font:600 14px/1.5 system-ui;text-decoration:none;');
      a.href = '/stories.html?story=dhul-qarnayn#story-earlier-sources';
      bar.appendChild(a);
    }
    if (sura === 37 && verse >= 102 && verse <= 107) {
      const a = el('a', 'Abraham’s sacrifice: dated scholar positions ↗',
        'padding:9px 12px;border:1px solid #ac8750;border-radius:8px;background:#f9f0d9;color:#4e360a;font:600 14px/1.5 system-ui;text-decoration:none;');
      a.href = '/scholarly-development.html';
      bar.appendChild(a);
    }
    wrap.appendChild(bar);
  }
  let dhulTimelinePromise;
  function loadDhulTimeline() {
    if (window.QHDhulTimeline && typeof window.QHDhulTimeline.render === 'function') return Promise.resolve();
    if (!dhulTimelinePromise) dhulTimelinePromise = new Promise((resolve,reject) => {
      const script=document.createElement('script');
      script.src='/qh-dhulqarnayn-timeline.js?v=20261108';
      script.onload=()=>window.QHDhulTimeline ? resolve() : reject(new Error('Timeline component unavailable'));
      script.onerror=()=>reject(new Error('Timeline script could not load'));
      document.head.appendChild(script);
    }).catch(error=>{ dhulTimelinePromise=null;throw error; });
    return dhulTimelinePromise;
  }
  function appendDhulTimeline(wrap, verse, card) {
    if (Number(card.dataset.sura) !== 18 || verse < 83 || verse > 98) return;
    const timelineHost=el('section', null, 'margin:25px 0 10px;');
    timelineHost.id='qh-dhul-scholars-18-' + verse;
    timelineHost.setAttribute('aria-label', 'Dhul-Qarnayn scholarly interpretations');
    timelineHost.appendChild(el('p','Loading the chronological scholarly record…',
      'font:400 15px/1.6 system-ui,sans-serif;color:#5e5648;'));
    wrap.appendChild(timelineHost);
    void loadDhulTimeline().then(()=>{
      if (!timelineHost.isConnected || !card.isConnected || document.getElementById('vc-'+verse)!==card) return;
      window.QHDhulTimeline.render(timelineHost, {compact:true});
    }).catch(err=>{
      if(!timelineHost.isConnected) return;
      console.warn('Dhul-Qarnayn chronology temporarily unavailable:',err);
      const a=el('a', 'View dated scholar positions in Stories ↗',
        'font:600 15px/1.6 system-ui;color:#154c5c;display:inline-block;margin:12px 0;');
      a.href='/stories.html?story=dhul-qarnayn#story-scholars';
      timelineHost.replaceChildren(a);
    });
  }
  function validReference(row) {
    if (row.verification_status !== 'verified' || !row.source_title ||
        !row.source_locator || !row.verification_note || !row.reference_link) return false;
    try { return new URL(row.reference_link).protocol === 'https:'; }
    catch (_) { return false; }
  }
  async function readVerifiedSnapshot(suraId, num) {
    if (!snapshotPromise) {
      snapshotPromise = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
          const response = await fetch(SNAPSHOT_URL, { signal: controller.signal, cache: 'no-cache' });
          if (!response.ok) throw new Error('Snapshot HTTP ' + response.status);
          const snapshot = await response.json();
          if (snapshot.schema_version !== 1 || !Array.isArray(snapshot.records) ||
              !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.as_of || '')) {
            throw new Error('Invalid Sources snapshot');
          }
          return snapshot;
        } finally {
          clearTimeout(timer);
        }
      })().catch(error => { snapshotPromise = null; throw error; });
    }
    const snapshot = await snapshotPromise;
    return {
      asOf: snapshot.as_of,
      rows: snapshot.records.filter(row =>
        Number(row.sura) === suraId && Number(row.aya) === num && validReference(row))
    };
  }
  const KIND_LABEL = {parallel:'Textual parallel', contrast:'Textual contrast', context:'Historical context', interpretation:'Interpretation'};
  function ensureSourcesStyle() {
    if (document.getElementById('qh-sources-style')) return;
    const style = document.createElement('style');
    style.id = 'qh-sources-style';
    style.textContent = [
      '.qhs-card{background:#fffdf8;border:1px solid #e6dcc6;border-left:4px solid #846e32;border-radius:12px;padding:18px 20px;margin:0 0 14px;color:#241d12;font-family:Georgia,"Times New Roman",serif;}',
      '.qhs-card.qhs-contrast{border-left-color:#7a3e2e;}',
      '.qhs-title{font:700 19px/1.4 system-ui,-apple-system,sans-serif;margin:0 0 8px;color:#1f1a12;}',
      '.qhs-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;font:600 12px/1.4 system-ui,sans-serif;}',
      '.qhs-pill{padding:3px 9px;border-radius:999px;background:#f3ecd9;color:#5b4716;}',
      '.qhs-pill.qhs-date{background:#eef1f5;color:#34465c;}',
      '.qhs-locator{font:600 14px/1.5 system-ui,sans-serif;color:#3a301d;margin:0 0 12px;padding:8px 10px;background:#faf6ec;border-radius:8px;}',
      '.qhs-locator span{display:block;font:600 11px/1.4 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:#8a7440;margin-bottom:2px;}',
      '.qhs-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 12px;}',
      '.qhs-col h5{font:700 11px/1.4 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.07em;color:#8a7440;margin:0 0 4px;}',
      '.qhs-col p{margin:0;font:400 16px/1.65 Georgia,serif;color:#2b2418;}',
      '.qhs-note{margin:0 0 10px;font:400 14px/1.6 system-ui,sans-serif;color:#5e5648;}',
      '.qhs-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #efe6d2;padding-top:10px;}',
      '.qhs-link{color:#6d4f12;font:600 14px system-ui,sans-serif;text-decoration:underline;text-underline-offset:3px;}',
      '@media(max-width:620px){.qhs-compare{grid-template-columns:1fr;}.qhs-card{padding:15px 15px;}.qhs-title{font-size:17px;}}'
    ].join('');
    document.head.appendChild(style);
  }
  function renderSource(row) {
    ensureSourcesStyle();
    const isContrast = row.relationship_kind === 'contrast';
    const card = el('article', null, '');
    card.className = 'qhs-card' + (isContrast ? ' qhs-contrast' : '');
    card.appendChild(el('h4', row.source_title, '')).className = 'qhs-title';
    const meta = el('div', null, '');
    meta.className = 'qhs-meta';
    const kind = KIND_LABEL[row.relationship_kind] || 'Documented relationship';
    const kindPill = el('span', kind, ''); kindPill.className = 'qhs-pill';
    meta.appendChild(kindPill);
    if (row.approx_date) { const d = el('span', row.approx_date, ''); d.className = 'qhs-pill qhs-date'; meta.appendChild(d); }
    if (row.tradition) { const t = el('span', row.tradition, ''); t.className = 'qhs-pill'; meta.appendChild(t); }
    card.appendChild(meta);
    const loc = el('div', null, ''); loc.className = 'qhs-locator';
    loc.appendChild(el('span', 'Passage checked', ''));
    loc.appendChild(document.createTextNode(row.source_locator));
    if (row.source_edition) loc.appendChild(el('div', row.source_edition, 'font-weight:400;color:#5e5648;margin-top:3px;'));
    card.appendChild(loc);
    if (row.parallel_summary || row.similarity_note || row.difference_note) {
      const grid = el('div', null, ''); grid.className = 'qhs-compare';
      const shared = el('div', null, ''); shared.className = 'qhs-col';
      shared.appendChild(el('h5', isContrast ? 'Where they diverge' : 'What is shared', ''));
      shared.appendChild(el('p', row.parallel_summary || row.similarity_note || '', ''));
      grid.appendChild(shared);
      if (row.difference_note) {
        const diff = el('div', null, ''); diff.className = 'qhs-col';
        diff.appendChild(el('h5', 'What differs', ''));
        diff.appendChild(el('p', row.difference_note, ''));
        grid.appendChild(diff);
      }
      card.appendChild(grid);
    }
    if (row.similarity_note && row.parallel_summary) card.appendChild(el('p', 'Connection: ' + row.similarity_note, 'margin:0 0 8px;font:400 15px/1.6 Georgia,serif;color:#3d3426;'));
    card.appendChild(el('p', 'Review note: ' + row.verification_note, '')).className = 'qhs-note';
    const foot = el('div', null, ''); foot.className = 'qhs-foot';
    foot.appendChild(el('span', 'Similarity is not proof of literary dependence.', 'font:400 13px/1.5 system-ui,sans-serif;color:#7a705e;'));
    const link = el('a', 'Open referenced source ↗');
    link.href = row.reference_link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'qhs-link';
    foot.appendChild(link);
    card.appendChild(foot);
    return card;
  }

  window.loadAncientPanel = async function loadAncientPanel(num, suraId) {
    num = Number(num);
    suraId = Number(suraId);
    const box = document.getElementById('ancient-panel-' + num);
    const card = document.getElementById('vc-' + num);
    if (!box) return;
    if (!card || Number(card.dataset.sura) !== suraId) {
      box.textContent = 'Could not identify this verse. Reload the chapter and try again.';
      return;
    }
    // The Sources button may be activated while the Study panel is still opening.
    // Never leave its initial Loading placeholder behind because of UI timing.
    const key = suraId + ':' + num;
    if (box.dataset.loadedKey === key || box.dataset.loadingKey === key) return;
    box.dataset.loadingKey = key;
    box.setAttribute('aria-busy', 'true');
    box.replaceChildren(el('p', 'Checking referenced historical sources for Qur’an ' + key + '…',
      'padding:12px 0;font:400 16px/1.6 system-ui,sans-serif;color:#605846;'));
    const tab = document.getElementById('ancient-tab-' + num);
    let timeoutId;
    try {
      // Live lookup: one attempt via the page's sbFetch, then one direct REST retry with its
      // own abort timeout, before falling back to the dated verified snapshot. A single slow
      // response (cold PostgREST / many concurrent panel queries) previously sent readers
      // straight to the snapshot.
      const params = {
        select: SELECT, sura: 'eq.' + suraId, aya: 'eq.' + num,
        verification_status: 'eq.verified', order: 'source_title.asc', limit: '50'
      };
      const attemptSbFetch = () => {
        const request = Promise.resolve().then(() => {
          if (typeof sbFetch !== 'function') throw new Error('Sources API unavailable');
          return sbFetch('ancient_sources', params);
        });
        const timeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Source request timed out')), 7000);
        });
        return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
      };
      const attemptDirect = async () => {
        if (typeof SUPABASE_URL !== 'string' || typeof HEADERS !== 'object') throw new Error('Sources config unavailable');
        const url = new URL(SUPABASE_URL + '/rest/v1/ancient_sources');
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 9000);
        try {
          const r = await fetch(url, { headers: HEADERS, signal: controller.signal, cache: 'no-store' });
          if (!r.ok) throw new Error('Sources HTTP ' + r.status);
          return r.json();
        } finally { clearTimeout(t); }
      };
      let results;
      let snapshotAsOf = null;
      try {
        try {
          results = await attemptSbFetch();
          if (!Array.isArray(results)) throw new Error('Unexpected Sources API response');
        } catch (firstError) {
          console.info('Live Sources first attempt failed, retrying once:', firstError && firstError.message);
          await new Promise(r => setTimeout(r, 400));
          results = await attemptDirect();
          if (!Array.isArray(results)) throw new Error('Unexpected Sources API response');
        }
      } catch (apiError) {
        console.warn('Live Sources request failed after retry; checking dated verified snapshot:', apiError);
        const fallback = await readVerifiedSnapshot(suraId, num);
        results = fallback.rows;
        snapshotAsOf = fallback.asOf;
      }
      if (document.getElementById('vc-' + num) !== card) return;
      // Combine checked, versioned publications with live data: new published
      // source records must appear even if the Supabase live table is behind.
      const liveRows = Array.isArray(results) ? results.filter(validReference) : [];
      let publishedRows = [], publishedAsOf = null;
      try {
        const published = await readVerifiedSnapshot(suraId, num);
        publishedRows = published.rows;
        publishedAsOf = published.asOf;
      } catch (snapshotError) {
        console.info('No additional published Sources snapshot:', snapshotError && snapshotError.message);
      }
      const rows = liveRows.slice();
      let fromPublished = 0;
      publishedRows.forEach(row => {
        if (!rows.some(existing => existing.source_title === row.source_title &&
            existing.reference_link === row.reference_link)) {
          rows.push(row); fromPublished++;
        }
      });
      rows.sort((a, b) => a.source_title.localeCompare(b.source_title));
      const wrap = el('section', null, 'max-width:74ch;margin:0 auto;color:#292721;');
      wrap.appendChild(el('h3', 'Sources for Qur’an ' + key,
        'font:600 21px/1.4 system-ui,sans-serif;margin:0 0 10px;'));
      if (snapshotAsOf) {
        wrap.appendChild(el('p', 'Live source service unavailable. Showing the last published verified-reference snapshot (' + snapshotAsOf + '); newer references may be missing.',
          'font:600 14px/1.6 system-ui,sans-serif;color:#805c20;margin:0 0 12px;'));
        const refresh = el('button', 'Try live Sources again',
          'padding:8px 11px;border:1px solid #c9b895;border-radius:8px;background:#fffaf0;color:#51411e;cursor:pointer;font:600 14px system-ui;margin-bottom:10px;');
        refresh.type = 'button';
        refresh.addEventListener('click', () => {
          delete box.dataset.loadedKey;
          window.loadAncientPanel(num, suraId);
        });
        wrap.appendChild(refresh);
      }
      if (fromPublished > 0 && !snapshotAsOf) {
        wrap.appendChild(el('p', fromPublished + ' additional reviewed source reference' +
          (fromPublished === 1 ? '' : 's') + ' from the curated publication dated ' + publishedAsOf +
          '. Live database synchronization may follow later.',
          'font:400 13px/1.55 system-ui,sans-serif;color:#655e4c;margin:0 0 12px;'));
      }
      if (rows.length === 0) {
        wrap.appendChild(el('p', snapshotAsOf
          ? 'No checked historical source is present in this dated snapshot for this verse. This is not a complete live catalogue.'
          : 'No independently checked historical source association has been published for this verse yet. This does not mean that no relevant historical literature exists.',
          'font:400 17px/1.7 Georgia,serif;margin:0 0 12px;'));
      } else {
        wrap.appendChild(el('p', rows.length + ' traceable reference' + (rows.length === 1 ? '' : 's') +
          '. The cited passage and its relationship were reviewed; similarity does not establish literary dependence.',
          'font:400 15px/1.6 system-ui,sans-serif;color:#5e5648;margin:0 0 10px;'));
        rows.forEach(row => wrap.appendChild(renderSource(row)));
      }
      appendDhulTimeline(wrap, num, card);
      addResearchLinks(wrap, card);
      box.replaceChildren(wrap);
      box.dataset.loadedKey = key;
      if (tab) tab.textContent = '🏛 Sources (' + rows.length + (suraId===18 && num>=83 && num<=98?' + Scholars':'') + ')';
    } catch (error) {
      if (document.getElementById('vc-' + num) !== card) return;
      console.error('Verse Sources load failed:', error);
      const wrap = el('section', null, 'max-width:74ch;margin:0 auto;');
      wrap.appendChild(el('p', 'Sources could not be loaded. Your connection or the source database may be temporarily unavailable.',
        'font:400 16px/1.65 system-ui,sans-serif;color:#5a4536;'));
      const retry = el('button', 'Retry Sources',
        'padding:9px 12px;border:1px solid #c9b895;border-radius:8px;background:#fffaf0;color:#51411e;cursor:pointer;font:600 14px system-ui;');
      retry.type = 'button';
      retry.addEventListener('click', () => window.loadAncientPanel(num, suraId));
      wrap.appendChild(retry);
      appendDhulTimeline(wrap, num, card);
      addResearchLinks(wrap, card);
      box.replaceChildren(wrap);
    } finally {
      clearTimeout(timeoutId);
      if (document.getElementById('ancient-panel-' + num) === box) {
        delete box.dataset.loadingKey;
        box.setAttribute('aria-busy', 'false');
      }
    }
  };
  window.qhSourcesPanelVersion = '2026-11-08-dhulqarnayn-versewide-timeline-v11';
})();
