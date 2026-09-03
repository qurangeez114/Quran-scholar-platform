#!/usr/bin/env node
/**
 * check-all.mjs — run every narration-layer check in one command.
 *
 * This codebase fails silently: a broken query becomes an empty array, a
 * missing field becomes a blank panel, a wrong link becomes the wrong hadith.
 * Each of these checks was written after such a failure shipped unnoticed.
 * Running them together, and before every deploy, is how they stay caught.
 *
 * Usage:  node check-all.mjs <anon-key>
 *         node check-all.mjs            (reads the key from books.html)
 * Exit:   0 if everything passes, 1 otherwise. Suitable for a deploy gate.
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const KEY = process.argv[2]
  || (readFileSync('books.html', 'utf8')
        .match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [])[0];
if (!KEY) { console.error('No anon key given and none found in books.html'); process.exit(2); }

const SB = 'https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const api = async p => {
  const r = await fetch(`${SB}/${p}`, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${p.split('?')[0]}`);
  return r.json();
};

let failures = 0;
const section = t => console.log(`\n=== ${t} ===`);
const ok  = m => console.log(`  ok   ${m}`);
const bad = m => { console.log(`  FAIL ${m}`); failures++; };

// 1. Delegate to the existing repo checkers (queries + rendering).
section('repo query and render checkers');
for (const script of ['check-queries.js', 'check-narrations-render.mjs', 'check-narrations-nav.mjs']) {
  try {
    execSync(`node ${script} ${KEY}`, { stdio: 'pipe' });
    ok(script);
  } catch (e) {
    bad(`${script} exited non-zero`);
    process.stdout.write(e.stdout?.toString().split('\n').filter(l => /FAIL|PROBLEM|missing|broken/i.test(l)).map(l => '       ' + l).join('\n') + '\n');
  }
}

// 2. Structural integrity, computed directly from the reader views.
section('structural integrity');
const groups = await api('narrative_group_reader?select=*');
const dossierRows = await api('narrative_dossier_reader?select=group_slug');
const inDossier = new Set(dossierRows.map(r => r.group_slug));
const orphans = groups.filter(g => !inDossier.has(g.slug));
orphans.length ? bad(`${orphans.length} group(s) not in any dossier: ${orphans.map(g=>g.slug).join(', ')}`)
               : ok(`all ${groups.length} groups reachable from a dossier`);

const versions = await api('narrative_version_reader?select=id,group_slug,source_collection,source_reference,narrator,version_summary,text_arabic,text_english,source_type');
const dupIds = versions.map(v => v.id).filter((id,i,a) => a.indexOf(id)!==i);
dupIds.length ? bad(`${dupIds.length} version row(s) duplicated in the reader view`)
              : ok(`${versions.length} version rows, none duplicated`);
const noText = versions.filter(v => !v.text_arabic && !v.text_english);
noText.length ? bad(`${noText.length} version(s) resolve no text`) : ok('every version resolves text');

// The index count must match the true data. A group with versions but no
// dossier link (or a dossier row summing wrong) makes the reader-facing
// count lie, which is exactly the kind of silent drift that hides additions.
const idxNarrations = groups.reduce((a,g)=>a+(g.version_count||0),0);
const dossierRowsFull = await api('narrative_dossier_reader?select=group_slug,version_count');
const idxGroups = new Set(dossierRowsFull.map(r=>r.group_slug));
const missingFromIndex = groups.filter(g=>!idxGroups.has(g.slug));
missingFromIndex.length
  ? bad(`${missingFromIndex.length} group(s) built but absent from the index: ${missingFromIndex.map(g=>g.slug).join(', ')}`)
  : ok(`index lists all ${groups.length} groups`);
const idxSum = dossierRowsFull.reduce((a,r)=>a+(r.version_count||0),0);
idxSum === idxNarrations
  ? ok(`index narration count (${idxSum}) matches the data`)
  : bad(`index shows ${idxSum} narrations but the groups hold ${idxNarrations}`);

// 3. Every divergence card is complete.
section('divergence cards');
const divs = (await api('narrative_divergence_reader?select=*')).filter(d => d.point_id);
let incomplete = 0, badSev = 0, missingEnglish = 0;
for (const d of divs) {
  if (!d.category || !d.analysis || !d.significance || !d.arabic_a || !d.arabic_b) incomplete++;
  const sv = d.point_severity || d.severity;
  if (!(sv >= 1 && sv <= 5)) badSev++;
  const aEn = (d.evidence_language_a||'').startsWith('English');
  const bEn = (d.evidence_language_b||'').startsWith('English');
  if ((!aEn && !d.english_a) || (!bEn && !d.english_b)) missingEnglish++;
}
incomplete ? bad(`${incomplete} card(s) missing a required field`) : ok(`${divs.length} cards complete`);
badSev ? bad(`${badSev} card(s) with severity out of 1-5`) : ok('all severities in range');
missingEnglish ? bad(`${missingEnglish} Arabic card(s) with no English translation`) : ok('every Arabic phrase has English');

// 4. No external link without a recorded verification.
section('external links');
const linked = versions.filter(v => v.source_type !== 'Tafsir');
const withLink = await api('narrative_version_reader?select=hadith_corpus_id,source_collection,verified_url&verified_url=not.is.null');
const linkMap = await api('external_link_map?select=collection');
const refMap = await api('external_reference_map?select=hadith_corpus_id');
const mappedColls = new Set(linkMap.map(m => m.collection));
const mappedIds = new Set(refMap.map(m => m.hadith_corpus_id));
const leaking = withLink.filter(v => !mappedColls.has(v.source_collection) && !mappedIds.has(v.hadith_corpus_id));
leaking.length ? bad(`${leaking.length} external link(s) with no verification record`)
               : ok(`${withLink.length} external links, all from a verified mapping`);

// 5. Search reaches English, Arabic, and metadata.
section('search index');
const idx = await api('narrative_search_index?select=searchable');
const blob = idx.map(r => r.searchable || '').join('\n');
for (const [term, label] of [['stoning','english'], ['\u0627\u0644\u0631\u062c\u0645','arabic'], ['before revelation came','translated phrase'], ['bukhari','collection']]) {
  blob.includes(term.toLowerCase()) ? ok(`search finds ${label}`) : bad(`search misses ${label} ("${term}")`);
}

console.log(`\n${'-'.repeat(52)}`);
console.log(failures ? `${failures} check(s) FAILED` : 'All checks passed.');
process.exit(failures ? 1 : 0);
