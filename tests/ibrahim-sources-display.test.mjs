import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const stories = readFileSync(new URL('../stories.html', import.meta.url), 'utf8');
const reader = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../qh-sources-panel.js', import.meta.url), 'utf8');
const distinctiveSrc = readFileSync(new URL('../qh-quran-distinctive.js', import.meta.url), 'utf8');
const snapshot = JSON.parse(readFileSync(new URL('../qh-sources-verified-snapshot.json', import.meta.url), 'utf8'));

function loadDistinctive() {
  const ctx = { window: {} };
  vm.runInNewContext(distinctiveSrc, ctx);
  return ctx.window.QHQuranDistinctive;
}

test('Qur\'an-distinctive status covers the Ka\'ba ayat with the approved wording', () => {
  const api = loadDistinctive();
  assert.equal(api.STATUS, 'quran_distinctive_no_earlier_attestation');
  for (const [s, a] of [[2, 125], [2, 126], [2, 127], [22, 26], [22, 27]]) assert.ok(api.forVerse(s, a), `${s}:${a}`);
  for (const [s, a] of [[2, 124], [2, 128], [21, 68], [37, 102]]) assert.equal(api.forVerse(s, a), null, `${s}:${a}`);
  const note = api.forVerse(2, 127);
  assert.equal(note.heading, 'No pre-Islamic textual parallel identified.');
  const text = note.body.map(p => p.text).join('');
  assert.match(text, /not attested in any surviving source that predates the Qur’an/);
  assert.match(text, /it reflects the limits of the surviving record\.$/);
  assert.equal(api.forStory('ibrahim').length, 1);
});

test('verse Sources panel and Stories page load and use the distinctive statement', () => {
  assert.match(reader, /qh-quran-distinctive\.js\?v=20261123"><\/script>\s*<script src="\/qh-sources-panel\.js/);
  assert.match(panel, /distinctiveNote\(suraId, num\)/);
  assert.match(stories, /qh-quran-distinctive\.js\?v=20261123/);
  assert.match(stories, /id="qh-story-distinctive"/);
});

test('Ibrahim story lists every linked verse and every checked reference', () => {
  assert.match(stories, /verseLimit=story\.slug==='ibrahim'\?200:10/);
  assert.doesNotMatch(stories, /qh_verified_verse_story_sources[^\n]*limit=100/);
  assert.equal((stories.match(/&limit=300'\)/g) || []).length, 2);
  assert.match(stories, /async function fetchStoryAyas/);
});

test('fallback snapshot is dated and includes the Ibrahim rows', () => {
  assert.equal(snapshot.as_of, '2026-11-22');
  assert.equal(snapshot.records.length, 118);
  assert.ok(snapshot.records.every(r => r.verification_status === 'verified' && /^https:\/\//.test(r.reference_link)));
  assert.ok(snapshot.records.some(r => r.sura === 21 && r.aya === 68));
  assert.ok(snapshot.records.some(r => r.sura === 6 && r.aya === 76));
  assert.ok(snapshot.records.filter(r => r.sura === 37 && r.aya === 102).length >= 5);
});

test('verses with a verified source never show the distinctive statement', () => {
  const api = loadDistinctive();
  const note = api.forStory('ibrahim')[0];
  const narrowed = api.withoutSourced(note, new Set(['2:127', '22:26']));
  assert.deepEqual([...narrowed.ayat], ['2:125', '2:126', '22:27']);
  assert.equal(narrowed.label, 'Qur’an 2:125–126; 22:27');
  assert.equal(api.withoutSourced(note, new Set()), note);
  assert.equal(api.withoutSourced(note, new Set(note.ayat)), null);
  // Verse panel: statement only when the verse has no verified rows, never on a load error.
  assert.match(panel, /rows\.length === 0 \? distinctiveNote\(suraId, num\) : null/);
  assert.doesNotMatch(panel, /distinctiveOnError/);
  // Stories page: chip and story note skip verses that have verified evidence.
  assert.match(stories, /sourcedAyat=new Set\(ancientSources\.map/);
  assert.match(stories, /!sourcedAyat\.has\(Number\(s\)\+':'\+Number\(a\)\)/);
});

test('snapshot carries the two note fixes', () => {
  const recs = snapshot.records;
  assert.ok(!JSON.stringify(recs).includes('the user raised'));
  const altars = recs.filter(r => /^Genesis 12:7–8; 13:18/.test(r.source_title || ''));
  assert.ok(altars.length >= 2);
  for (const r of altars) {
    assert.equal(r.source_title, 'Genesis 12:7–8; 13:18 — Abraham\'s altars, no Ka\'ba');
    assert.equal(r.relationship_kind, 'contrast');
  }
});
