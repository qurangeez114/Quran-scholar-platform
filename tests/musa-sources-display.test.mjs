import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const stories = readFileSync(new URL('../stories.html', import.meta.url), 'utf8');
const distinctiveSrc = readFileSync(new URL('../qh-quran-distinctive.js', import.meta.url), 'utf8');
const snapshot = JSON.parse(readFileSync(new URL('../qh-sources-verified-snapshot.json', import.meta.url), 'utf8'));

function loadDistinctive() {
  const ctx = { window: {} };
  vm.runInNewContext(distinctiveSrc, ctx);
  return ctx.window.QHQuranDistinctive;
}
const musaRows = snapshot.records.filter(r => /2026-11-22: Qur'an/.test(r.verification_note || ''));

test('Musa story lists every linked verse', () => {
  assert.match(stories, /LONG_STORIES=new Set\(\['ibrahim','musa'\]\)/);
  assert.match(stories, /verseLimit=LONG_STORIES\.has\(story\.slug\)\?200:10/);
});

test('every surah a Musa passage cites has a name on the Stories page', () => {
  const m = stories.match(/const SNAMES=\{([^}]*)\}/);
  assert.ok(m, 'SNAMES map');
  const named = new Set([...m[1].matchAll(/(\d+):/g)].map(x => Number(x[1])));
  for (let s = 1; s <= 114; s++) assert.ok(named.has(s), 'surah ' + s);
});

test('Musa snapshot rows are complete, dated and cite their reading', () => {
  assert.equal(snapshot.as_of, '2026-11-23');
  assert.equal(musaRows.length, 85);
  for (const r of musaRows) {
    assert.equal(r.verification_status, 'verified');
    assert.match(r.reference_link, /^https:\/\/(mechon-mamre\.org|halakhah\.com|www\.sefaria\.org)\//);
    assert.ok(['parallel', 'contrast', 'context'].includes(r.relationship_kind));
    assert.ok(r.source_locator && r.similarity_note && r.difference_note && r.source_edition);
    assert.match(r.verification_note, /not evidence of direct borrowing/);
    assert.match(r.verification_note, /the original-language text was not checked/);
  }
  const keys = musaRows.map(r => [r.sura, r.aya, r.reference_link, r.source_locator].join('|'));
  assert.equal(new Set(keys).size, keys.length);
  // Visitor-facing text stays neutral.
  assert.ok(!/\b(the user|this conversation|you asked)\b/i.test(JSON.stringify(musaRows)));
});

test('Musa distinctive notes cover only verses without a checked source', () => {
  const api = loadDistinctive();
  const notes = api.forStory('musa');
  assert.deepEqual([...notes.map(n => n.id)].sort(), ['musa-pharaoh-body', 'musa-samiri']);
  const sourced = new Set(musaRows.map(r => r.sura + ':' + r.aya));
  for (const n of notes) {
    assert.equal(n.heading, 'No pre-Islamic textual parallel identified.');
    assert.equal(api.withoutSourced(n, sourced), n, n.id + ' must not overlap a sourced verse');
    assert.match(n.body.map(p => p.text).join(''), /it reflects the limits of the surviving record\.$/);
  }
  assert.equal(api.forVerse(10, 92).id, 'musa-pharaoh-body');
  assert.equal(api.forVerse(10, 90), null);
  assert.equal(api.forVerse(20, 88), null);
});
