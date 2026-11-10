// Run: node --test tests/crossrefs-reader.test.cjs
// Uses Node built-ins only. Neither the live database nor the network is changed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('// Paginate thematic links when a verse exceeds');
const end = html.indexOf('// ─── loadRiwayatPanel', start);
assert.ok(start >= 0 && end > start, 'reader cross-reference functions must exist');
const readerSource = html.slice(start, end);
new vm.Script(readerSource, {filename: 'crossrefs-reader.js'}); // Syntax check.

function fixture({directRows = [], themeRows = [], failTheme = false, failDirect = false} = {}) {
  const panel = {innerHTML: ''};
  const tab = {textContent: ''};
  const calls = [];
  const ctx = {
    console,
    window: {},
    document: {
      getElementById(id) {
        if (id.endsWith('-xrefs')) return panel;
        if (id.startsWith('xref-tab-')) return tab;
        return null;
      }
    },
    allSuras: [],
    QH_XREF_SHOW: 10,
    escapeHtml: v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    qhRankVerses: async (_sura, _aya, verses) => verses,
    qhAddXrefFlowControl: () => {},
    sbFetch: async (table, filters) => {
      calls.push({table, filters});
      if (table === 'thematic_cross_references_v2') {
        if (failTheme) throw new Error('thematic temporarily unavailable');
        const offset = Number(filters.offset || 0);
        return themeRows.slice(offset, offset + Number(filters.limit || 1000));
      }
      if (table === 'cross_references') {
        if (failDirect) throw new Error('direct temporarily unavailable');
        return directRows;
      }
      if (table === 'thematic_cross_references') return [];
      throw new Error('Unexpected table ' + table);
    }
  };
  vm.runInNewContext(readerSource, ctx, {timeout: 1000});
  return {panel, tab, calls, ctx};
}

test('shows direct links when no thematic membership exists (37:104)', async () => {
  const t = fixture({directRows: [
    {ref_surah:21, ref_ayah_start:90, ref_ayah_end:90}
  ]});
  await t.ctx.loadCrossReferences(37, 104);
  assert.match(t.panel.innerHTML, />21:90<\/button>/);
  assert.equal(t.tab.textContent, 'Cross-Refs (1)');
  assert.ok(!t.panel.innerHTML.includes('No cross-references added yet'));
});

test('preserves direct and thematic links together', async () => {
  const t = fixture({
    directRows: [{ref_surah:21, ref_ayah_start:90}],
    themeRows: [{theme:'Shared topic',related_sura:11,related_aya:71}]
  });
  await t.ctx.loadCrossReferences(37, 104);
  assert.equal(t.tab.textContent, 'Cross-Refs (2)');
  assert.match(t.panel.innerHTML, />21:90<\/button>/);
  assert.match(t.panel.innerHTML, />11:71<\/button>/);
});

test('deduplicates identical direct links in the reader without deleting database rows', async () => {
  const row = {ref_surah:21,ref_ayah_start:90};
  const t = fixture({directRows:[row,row,row]});
  await t.ctx.loadCrossReferences(37, 104);
  assert.equal(t.tab.textContent, 'Cross-Refs (1)');
  assert.equal((t.panel.innerHTML.match(/>21:90<\/button>/g) || []).length, 1);
});

test('continues to display direct links on thematic API failure', async () => {
  const t = fixture({
    failTheme:true,
    directRows:[{ref_surah:21,ref_ayah_start:90}]
  });
  await t.ctx.loadCrossReferences(37, 104);
  assert.equal(t.tab.textContent, 'Cross-Refs (1)');
  assert.match(t.panel.innerHTML, />21:90<\/button>/);
});

test('shows zero only when both sources return empty results', async () => {
  const t = fixture();
  await t.ctx.loadCrossReferences(37, 102);
  assert.equal(t.tab.textContent, 'Cross-Refs (0)');
  assert.match(t.panel.innerHTML, /No cross-references added yet/);
});

test('paginates thematic lists beyond 1,000 rows', async () => {
  const themeRows = Array.from({length:1007}, (_,i) => ({
    theme:'Test category',related_sura:2,related_aya:i+1
  }));
  const t = fixture({themeRows});
  const rows = await t.ctx.qhFetchAllThematicXrefs(37, 1);
  assert.equal(rows.length, 1007);
  const pages = t.calls.filter(c => c.table === 'thematic_cross_references_v2');
  assert.equal(pages.length, 2);
  assert.equal(pages[0].filters.offset, 0);
  assert.equal(pages[1].filters.offset, 1000);
});

test('search and API use real cross_references database column names', () => {
  assert.match(html, /cross_references\?source_surah=eq\.\$\{sura\}&source_ayah=eq\.\$\{aya\}&select=ref_surah,ref_ayah_start,ref_ayah_end/);
  const py = fs.readFileSync(path.join(__dirname, '..', 'main.py'), 'utf8');
  assert.match(py, /cross_references\?source_surah=eq\.\{surah\}&source_ayah=eq\.\{ayah\}/);
  assert.doesNotMatch(html, /cross_references\?sura_id=eq/);
});

test('main reader no longer contains a second competing cross-reference renderer', () => {
  assert.doesNotMatch(html, /const xrefPanel = document\.getElementById/);
  assert.match(html, /loadCrossReferences\(suraId, num\)/);
});
