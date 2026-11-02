/* Quran Hikma: verified, verse-specific historical Sources panel.
   Never display unreviewed ancient_sources rows as verified evidence. */
(function () {
  'use strict';
  const SELECT = 'source_title,tradition,approx_date,source_type,source_locator,relationship_kind,parallel_summary,similarity_note,difference_note,reference_link,source_edition,verification_note,verification_status';
  // A checked, dated snapshot keeps citations available during transient PostgREST failures.
  // Never promote unreviewed rows or pretend a cached snapshot is current live data.
  const SNAPSHOT_URL = '/qh-sources-verified-snapshot.json?v=20261102-b4';
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
    wrap.appendChild(bar);
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
  function renderSource(row) {
    const card = el('article', null, 'padding:16px 0;border-top:1px solid #e1d6bc;');
    card.appendChild(el('h4', row.source_title, 'font:600 19px/1.45 system-ui,sans-serif;margin:0 0 6px;color:#33291a;'));
    const kind = ({parallel:'Textual parallel',contrast:'Textual contrast',context:'Historical context',interpretation:'Interpretation'})[row.relationship_kind] || 'Documented relationship';
    card.appendChild(el('div', kind + ' · Reference checked', 'font:600 12px/1.6 system-ui,sans-serif;color:#7a5a17;margin-bottom:7px;'));
    card.appendChild(el('div', row.source_locator, 'font:600 15px/1.6 system-ui,sans-serif;color:#433724;margin-bottom:4px;'));
    if (row.source_edition) card.appendChild(el('p', 'Edition: ' + row.source_edition, 'font:400 14px/1.6 system-ui,sans-serif;color:#655b4b;margin:0 0 4px;'));
    if (row.approx_date) card.appendChild(el('p', 'Dating note: ' + row.approx_date, 'font:400 14px/1.6 system-ui,sans-serif;color:#655b4b;margin:0 0 8px;'));
    if (row.parallel_summary) card.appendChild(el('p', row.parallel_summary, 'margin:8px 0;font:400 17px/1.65 Georgia,serif;'));
    if (row.similarity_note) card.appendChild(el('p', 'Connection: ' + row.similarity_note, 'margin:8px 0;font:400 16px/1.65 Georgia,serif;'));
    if (row.difference_note) card.appendChild(el('p', 'Difference: ' + row.difference_note, 'margin:8px 0;font:400 16px/1.65 Georgia,serif;'));
    card.appendChild(el('p', 'Review note: ' + row.verification_note, 'margin:9px 0;font:400 14px/1.65 system-ui,sans-serif;color:#5e5648;'));
    const link = el('a', 'Open referenced source');
    link.href = row.reference_link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.cssText = 'display:inline-block;margin-top:5px;color:#775313;text-decoration:underline;font:600 15px system-ui,sans-serif;';
    card.appendChild(link);
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
      // Defer the API call so even a synchronous sbFetch/configuration exception
      // becomes a rejected promise and reaches the verified-snapshot fallback.
      const request = Promise.resolve().then(() => {
        if (typeof sbFetch !== 'function') throw new Error('Sources API unavailable');
        return sbFetch('ancient_sources', {
          select: SELECT, sura: 'eq.' + suraId, aya: 'eq.' + num,
          verification_status: 'eq.verified', order: 'source_title.asc', limit: '50'
        });
      });
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Source request timed out')), 6000);
      });
      let results;
      let snapshotAsOf = null;
      try {
        results = await Promise.race([request, timeout]);
        if (!Array.isArray(results)) throw new Error('Unexpected Sources API response');
      } catch (apiError) {
        console.warn('Live Sources request failed; checking dated verified snapshot:', apiError);
        const fallback = await readVerifiedSnapshot(suraId, num);
        results = fallback.rows;
        snapshotAsOf = fallback.asOf;
      }
      if (document.getElementById('vc-' + num) !== card) return;
      const rows = Array.isArray(results) ? results.filter(validReference) : [];
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
      addResearchLinks(wrap, card);
      box.replaceChildren(wrap);
      box.dataset.loadedKey = key;
      if (tab) tab.textContent = '🏛 Sources (' + rows.length + ')';
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
  window.qhSourcesPanelVersion = '2026-11-02-verified-v4-snapshot';
})();
