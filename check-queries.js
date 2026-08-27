#!/usr/bin/env node
/**
 * check-queries.js — extract every Supabase query in this repo and run it.
 *
 * Why this exists: four separate features on this site were broken for an
 * unknown length of time because they selected columns that do not exist.
 * Every one of them failed inside a try/catch or a truthiness check, so a
 * 400 became an empty array and an empty array looked like "no data yet".
 * Nothing ever surfaced. One bad column name survived in three files.
 *
 * Run:  node check-queries.js
 * Exit: 0 if every query returns 200, 1 otherwise (usable in CI).
 */

const fs = require('fs');
const path = require('path');

const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const HDRS = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

// RPCs need arguments; calling them bare returns 404 and tells you nothing.
// Add new ones here as they appear, or they will be reported as unchecked.
const RPC_ARGS = {
  get_all_themes: {},
  get_fiqh_for_verse: { p_sura: 2, p_aya: 255 },
  get_hadith_chapters: { p_collection: 'Sahih al-Bukhari' },
  get_hadith_duplicate_clusters: { p_collection: 'Sahih al-Bukhari', p_chapter: null, p_threshold: 0.9 },
  get_narrative_group_versions: { group_slug: 'maiz-ibn-malik-stoning' },
  get_root_occurrences: { p_root: 'كتب' },
  get_word_analysis: { p_sura: 2, p_aya: 255, p_word: 'الله' },
  search_arabic: { search_term: 'ماعز' },
  propagate_translations_to_story_comparison: null, // mutating — never called by this checker
};

function sourceFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, acc);
    else if (/\.(html|js)$/.test(e.name) && e.name !== 'check-queries.js') acc.push(p);
  }
  return acc;
}

const selects = new Map();   // query string -> Set of files
const rpcs = new Map();

for (const file of sourceFiles('.')) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative('.', file);

  for (const m of src.matchAll(/\/rest\/v1\/([a-z_]+)\?select=([^'"`&\s]+)/g)) {
    // Skip queries containing template placeholders we cannot resolve.
    if (m[2].includes('${')) continue;
    const q = `${m[1]}?select=${m[2]}`;
    if (!selects.has(q)) selects.set(q, new Set());
    selects.get(q).add(rel);
  }
  for (const m of src.matchAll(/\/rest\/v1\/rpc\/([a-z_]+)/g)) {
    if (!rpcs.has(m[1])) rpcs.set(m[1], new Set());
    rpcs.get(m[1]).add(rel);
  }
}

async function main() {
  let failed = 0, checked = 0, skipped = 0;

  console.log(`\nSELECT queries (${selects.size})\n${'-'.repeat(60)}`);
  for (const [q, files] of [...selects].sort()) {
    const res = await fetch(`${SB_URL}/rest/v1/${q}&limit=1`, { headers: HDRS });
    checked++;
    if (!res.ok) {
      failed++;
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch { /* non-JSON body */ }
      console.log(`FAIL ${res.status}  ${q.slice(0, 70)}`);
      console.log(`     ${msg}`);
      console.log(`     in: ${[...files].join(', ')}`);
    }
  }

  console.log(`\nRPCs (${rpcs.size})\n${'-'.repeat(60)}`);
  for (const [name, files] of [...rpcs].sort()) {
    if (!(name in RPC_ARGS)) {
      skipped++;
      console.log(`SKIP      ${name} — no arguments known; add it to RPC_ARGS`);
      console.log(`     in: ${[...files].join(', ')}`);
      continue;
    }
    if (RPC_ARGS[name] === null) { skipped++; continue; } // mutating
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { ...HDRS, 'Content-Type': 'application/json' },
      body: JSON.stringify(RPC_ARGS[name]),
    });
    checked++;
    if (!res.ok) {
      failed++;
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch { /* non-JSON body */ }
      console.log(`FAIL ${res.status}  rpc/${name}`);
      console.log(`     ${msg}`);
      console.log(`     in: ${[...files].join(', ')}`);
    }
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`${checked} checked, ${failed} failing, ${skipped} skipped`);
  if (failed === 0) console.log('All queries reachable.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(e => { console.error('checker error:', e); process.exit(2); });
