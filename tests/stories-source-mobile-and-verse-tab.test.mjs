import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stories = readFileSync(new URL('../stories.html', import.meta.url), 'utf8');
const reader = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../qh-stories-history.css', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../qh-sources-panel.js', import.meta.url), 'utf8');
const snapshot = JSON.parse(readFileSync(new URL('../qh-sources-verified-snapshot.json', import.meta.url), 'utf8'));

test('Stories mobile source headings stack long manuscript tradition above the reference', () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /#storyMain \.src-hdr > \.trad/);
  assert.match(css, /grid-column:\s*1 \/ -1/);
  assert.match(css, /#storyMain \.src-hdr > \.src-info/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(css, /#storyMain \.cg,[\s\S]*?#s-content \.cg\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(stories, /qh-stories-history\.css\?v=20261109-mobile-sources-v1/);
});

test('Quran reader requests updated verified Sources implementation', () => {
  assert.match(reader, /qh-sources-panel\.js\?v=20261109-verified-qumran-v12/);
  assert.match(panel, /window\.loadAncientPanel\s*=/);
  assert.match(panel, /readVerifiedSnapshot\(suraId, num\)/);
  assert.match(panel, /fromPublished/);
});

test('checked 4Q225 manuscript fragments remain mapped to the Quran sacrifice passage', () => {
  const verses = snapshot.records
    .filter(row => row.verification_status === 'verified' && /4Q225/.test(row.source_title))
    .map(row => Number(row.sura) + ':' + Number(row.aya));
  assert.deepEqual(verses.sort(), ['37:102', '37:103', '37:104', '37:106']);
});
