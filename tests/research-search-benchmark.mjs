#!/usr/bin/env node
// Research page search regression + latency benchmark (read-only; public anon RPCs only).
// Usage: node tests/research-search-benchmark.mjs [--rounds 3] [--ranked|--legacy] [--p95 1500] [--json out.json]
// --ranked  require public.qh_research_search (20261103_rsearch_4) and enforce the A+ latency target.
// --legacy  measure only the old per-source path (what the page does when the new RPC is not installed).
// Default: use the ranked RPC when it exists, otherwise the legacy path with a looser threshold.
// Exit code 1 when a correctness check or the p95 threshold fails.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'research.html'), 'utf8');
const SB = html.match(/const SB='([^']+)'/)[1];
const KEY = process.env.SUPABASE_ANON_KEY || html.match(/const KEY='([^']+)'/)[1];
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const ROUNDS = Number(opt('--rounds', 3));
const MODE = args.includes('--ranked') ? 'ranked' : args.includes('--legacy') ? 'legacy' : 'auto';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const LEGACY = ['quran','hadith','tafsir','madhhab','sira','campaigns','themes','propositions','tensions','stories','asbab','library'];

// The 15 audit queries (2026-11-03). kind decides which page path handles them.
export const QUERIES = [
  { q: 'mercy', expectQuranTop: '7:151' }, { q: 'patience' }, { q: 'prayer times' }, { q: 'inheritance of daughters', expectQuranTop: '4:11' },
  { q: 'الرحمن', pair: 'ar1' }, { q: 'الرَّحْمَٰنُ', pair: 'ar1' }, { q: 'بسم الله الرحمن الرحيم', expectQuran: true },
  { q: 'صبر', expectQuran: true }, { q: '2:255', kind: 'verse' }, { q: 'Bukhari 1', kind: 'hadithref' },
  { q: 'Muslim 2328', kind: 'hadithref' }, { q: 'intention actions' }, { q: 'ምሕረት', expectQuran: true, ethiopic: true },
  { q: 'ጸሎት', expectQuran: true, ethiopic: true }, { q: 'xqzvbnm', expectZero: true },
];

async function post(fn, body) {
  const t = performance.now();
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const ms = performance.now() - t;
  if (!r.ok) { const e = new Error(`${fn} ${r.status}`); e.status = r.status; e.ms = ms; throw e; }
  return { json: await r.json(), ms };
}
async function get(path) {
  const t = performance.now();
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H });
  return { json: await r.json(), ms: performance.now() - t, ok: r.ok };
}
async function rankedExists() {
  try { await post('qh_research_search', { q: 'mercy', p_per_page: 1 }); return true; }
  catch (e) { if (e.status === 404) return false; throw e; }
}
async function runQuery(item, useRanked) {
  const t = performance.now();
  if (item.kind === 'verse') {
    const [s, a] = item.q.split(':');
    const r = await get(`ayas?sura_id=eq.${s}&aya_number=eq.${a}&select=sura_id,aya_number`);
    return { ms: performance.now() - t, counts: { quran: r.json.length }, top: { quran: r.json[0] ? `${r.json[0].sura_id}:${r.json[0].aya_number}` : null } };
  }
  if (item.kind === 'hadithref') {
    const r = await post('site_search_src', { src: 'hadith', q: item.q, lim: 100 });
    return { ms: performance.now() - t, counts: { hadith: r.json.count }, referenceMatch: !!r.json.reference_match,
             top: { hadith: r.json.rows?.[0] ? `${r.json.rows[0].collection} ${r.json.rows[0].number ?? ''}`.trim() : null } };
  }
  const rest = useRanked ? LEGACY.filter(k => !['quran','hadith','tafsir'].includes(k)) : LEGACY;
  const legacy = rest.map(k => post(k === 'sira' ? 'qh_sira_search' : 'site_search_src', k === 'sira' ? { q: item.q, lim: 12 } : { src: k, q: item.q, lim: 6 })
    .then(r => [k, r.json]).catch(() => [k, { count: 0, rows: [], failed: true }]));
  // Same as research.html: one ranked request per source, in parallel.
  const ranked = useRanked ? Promise.all(['quran','hadith','tafsir'].map(src => post('qh_research_search', { q: item.q, p_source: src })
    .then(r => r.json.results?.[0] ? { ...r.json.results[0], ms: r.ms } : null).catch(() => null)))
    .then(list => ({ ok: true, results: list.filter(Boolean), ms: Math.max(...list.map(x => x?.ms || 0)) })) : null;
  const [lr, rr] = await Promise.all([Promise.all(legacy), ranked]);
  const counts = {}, top = {}, failed = [];
  for (const [k, v] of lr) { counts[k] = v.count ?? (v.rows || []).length; if (v.failed) failed.push(k); top[k] = v.rows?.[0] ? (v.rows[0].sura ? `${v.rows[0].sura}:${v.rows[0].aya}` : v.rows[0].id ?? null) : null; }
  if (rr && rr.ok) for (const v of rr.results) { counts[v.key] = v.count; top[v.key] = v.rows?.[0] ? (v.rows[0].sura ? `${v.rows[0].sura}:${v.rows[0].aya}` : v.rows[0].id) : null; }
  return { ms: performance.now() - t, counts, top, failed, rankedMs: rr?.ms };
}
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };

const useRanked = MODE === 'ranked' ? true : MODE === 'legacy' ? false : await rankedExists();
if (MODE === 'ranked' && !(await rankedExists())) { console.error('FAIL: qh_research_search is not installed (404).'); process.exit(1); }
const P95 = Number(opt('--p95', useRanked ? 1500 : 8000));
console.log(`Research search benchmark — path: ${useRanked ? 'ranked (qh_research_search)' : 'legacy (12 parallel RPCs)'}; rounds: ${ROUNDS}; p95 target ${P95} ms`);
const results = [];
const failures = [];
for (const item of QUERIES) {
  const runs = [];
  for (let i = 0; i < ROUNDS; i++) runs.push(await runQuery(item, useRanked));
  const ms = runs.map(r => r.ms);
  const last = runs[runs.length - 1];
  const rk = runs.map(r => r.rankedMs).filter(x => x != null);
  const row = { q: item.q, rankedMaxMs: rk.length ? Math.round(Math.max(...rk)) : null, coldMs: Math.round(ms[0]), warmP50: Math.round(pct(ms.slice(1).length ? ms.slice(1) : ms, 50)), p95: Math.round(pct(ms, 95)), counts: last.counts, top: last.top, failed: last.failed || [] };
  results.push(row);
  const total = Object.values(last.counts).reduce((a, b) => a + (b || 0), 0);
  if (item.expectZero && total !== 0) failures.push(`${item.q}: expected 0 results, got ${total}`);
  if (item.expectQuran && useRanked && !(last.counts.quran > 0)) failures.push(`${item.q}: expected Quran matches`);
  if (item.expectQuranTop && useRanked && last.top.quran !== item.expectQuranTop) failures.push(`${item.q}: expected top Quran ${item.expectQuranTop}, got ${last.top.quran}`);
  if (item.kind === 'verse' && last.counts.quran !== 1) failures.push(`${item.q}: verse lookup failed`);
  if (item.kind === 'hadithref' && !last.referenceMatch) failures.push(`${item.q}: reference lookup did not match`);
  if (row.failed.length) failures.push(`${item.q}: sources failed/timed out: ${row.failed.join(',')}`);
  console.log(`${item.q.padEnd(26)} cold ${String(row.coldMs).padStart(6)} ms  warm p50 ${String(row.warmP50).padStart(6)} ms  ${row.rankedMaxMs != null ? 'ranked ' + row.rankedMaxMs + ' ms  ' : ''}` +
    Object.entries(last.counts).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' '));
}
const pairs = {};
for (const [i, item] of QUERIES.entries()) if (item.pair) (pairs[item.pair] ||= []).push(results[i]);
for (const [name, [a, b]] of Object.entries(pairs)) {
  for (const k of ['quran', 'hadith', 'tafsir']) if (useRanked && a.counts[k] !== b.counts[k]) failures.push(`diacritics ${name}: ${k} ${a.counts[k]} vs ${b.counts[k]}`);
}
const all = results.flatMap(r => [r.coldMs, r.p95]);
const p95 = pct(all, 95);
const rk95 = results.map(r => r.rankedMaxMs).filter(x => x != null);
if (rk95.length) console.log(`\nRanked requests (slowest source per query, max of rounds): p95 ${Math.round(pct(rk95, 95))} ms`);
console.log(`\nOverall p95 ${Math.round(p95)} ms (target ${P95} ms)`);
if (p95 > P95) failures.push(`p95 ${Math.round(p95)} ms exceeds ${P95} ms`);
const jsonOut = opt('--json');
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ when: new Date().toISOString(), path: useRanked ? 'ranked' : 'legacy', p95, results, failures }, null, 2));
if (failures.length) { console.log('\nFAILURES:\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('\nALL CHECKS PASS');
