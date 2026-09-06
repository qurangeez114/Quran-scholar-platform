#!/usr/bin/env node
/**
 * grade-tafsir-batch.mjs — Standalone tafsir translation-accuracy grader.
 *
 * Grades Ibn Kathir (or any scholar) English-vs-Arabic tafsir with Claude,
 * and writes results straight into the tafsir_accuracy_analysis table.
 *
 * SAFE TO RE-RUN: it skips any verse already in the table, so if it stops
 * (Ctrl-C, crash, closed laptop) you just run it again and it resumes.
 *
 * ── SETUP (once) ──────────────────────────────────────────────
 *   npm install @anthropic-ai/sdk
 *
 * ── RUN ───────────────────────────────────────────────────────
 *   export ANTHROPIC_API_KEY="sk-ant-..."         # your API console key
 *   export SUPABASE_SERVICE_KEY="eyJ...service..." # Supabase → Settings → API → service_role
 *   node grade-tafsir-batch.mjs --scholar=ibn_kathir --sura=2 --from=54
 *
 * ── OPTIONS ───────────────────────────────────────────────────
 *   --scholar=ibn_kathir   which tafsir (default ibn_kathir)
 *   --sura=2               grade one sura only (omit = all 114)
 *   --from=54              start at this aya within --sura (default 1)
 *   --to=120               stop after this aya within --sura (default = end)
 *   --limit=500            stop after grading N verses this run (default = no cap)
 *   --delay=400            ms to wait between API calls (default 400)
 *   --dry                  fetch + show what WOULD be graded, no API calls, no writes
 *
 * Cost is roughly $0.003–0.01 per verse. The whole Quran for one scholar
 * (~6,200 verses) is on the order of $20–60 and a few hours. Start with
 * one sura to confirm it works before turning it loose on everything.
 */

import Anthropic from "@anthropic-ai/sdk";

// ── config ────────────────────────────────────────────────────
const SUPABASE_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const API_KEY      = process.env.ANTHROPIC_API_KEY;
const MODEL        = "claude-sonnet-4-5";

// ── args ──────────────────────────────────────────────────────
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v === undefined ? true : v];
}));
const SCHOLAR = args.scholar || "ibn_kathir";
const ONE_SURA = args.sura ? Number(args.sura) : null;
const FROM = args.from ? Number(args.from) : 1;
const TO   = args.to ? Number(args.to) : Infinity;
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const DELAY = args.delay ? Number(args.delay) : 400;
const DRY = !!args.dry;

if (!API_KEY && !DRY) { console.error("ERROR: set ANTHROPIC_API_KEY"); process.exit(1); }
if (!SERVICE_KEY)     { console.error("ERROR: set SUPABASE_SERVICE_KEY (Supabase → Settings → API → service_role)"); process.exit(1); }

const client = DRY ? null : new Anthropic({ apiKey: API_KEY });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── supabase REST helpers (service key = full read/write) ─────
const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}
async function sbInsert(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tafsir_accuracy_analysis`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`INSERT -> ${res.status} ${await res.text()}`);
}

// list of {sura,aya} that HAVE both ar+en for this scholar, ordered
async function verseList() {
  // pull distinct sura/aya that have an arabic row; en presence checked per-verse at grade time
  let all = [];
  let offset = 0;
  const pageSize = 1000;
  const suraFilter = ONE_SURA ? `&sura=eq.${ONE_SURA}` : "";
  while (true) {
    const rows = await sbGet(
      `tafsir_entries?select=sura,aya&scholar_key=eq.${SCHOLAR}&language=eq.ar${suraFilter}` +
      `&order=sura.asc,aya.asc&limit=${pageSize}&offset=${offset}`
    );
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// set of "sura:aya" already graded for this scholar
async function alreadyGraded() {
  const done = new Set();
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const rows = await sbGet(
      `tafsir_accuracy_analysis?select=sura,aya&scholar_key=eq.${SCHOLAR}` +
      `&limit=${pageSize}&offset=${offset}`
    );
    for (const r of rows) done.add(`${r.sura}:${r.aya}`);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return done;
}

async function fetchText(sura, aya, lang) {
  const rows = await sbGet(
    `tafsir_entries?select=content&sura=eq.${sura}&aya=eq.${aya}&scholar_key=eq.${SCHOLAR}&language=eq.${lang}&limit=1`
  );
  return rows[0]?.content || "";
}

/**
 * Build a set of "sura:aya" whose ENGLISH is a stale duplicate of an EARLIER
 * verse in the same sura. This is a known import artifact: Ibn Kathir's English
 * comments on verse-RANGES, and the same block got stamped onto every aya in the
 * range while the Arabic was split per verse. For every verse after the first in
 * a group, the English no longer matches its Arabic, so grading it produces a
 * misleading score. We skip those (the group HEAD — first occurrence — is graded
 * normally, since its pair is correct).
 */
async function englishDuplicateTails() {
  const tails = new Set();
  const seenBySura = new Map(); // sura -> Map(hash -> firstAya)
  let offset = 0;
  const pageSize = 1000;
  const suraFilter = ONE_SURA ? `&sura=eq.${ONE_SURA}` : "";
  // Simple stable hash of the content (length + sampled chars) to avoid pulling megabytes.
  const hash = s => {
    let h = 5381; const n = s.length;
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 512))) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return `${n}:${h}`;
  };
  while (true) {
    const rows = await sbGet(
      `tafsir_entries?select=sura,aya,content&scholar_key=eq.${SCHOLAR}&language=eq.en${suraFilter}` +
      `&order=sura.asc,aya.asc&limit=${pageSize}&offset=${offset}`
    );
    for (const r of rows) {
      if (!seenBySura.has(r.sura)) seenBySura.set(r.sura, new Map());
      const seen = seenBySura.get(r.sura);
      const h = hash(r.content || "");
      if (seen.has(h)) tails.add(`${r.sura}:${r.aya}`); // duplicate of an earlier aya -> tail
      else seen.set(h, r.aya);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return tails;
}

async function grade(sura, aya, ar, en) {
  const prompt = `You are an expert Islamic scholar specializing in Arabic-English translation accuracy.

Analyze this ${SCHOLAR} tafsir translation for verse ${sura}:${aya}.

ARABIC ORIGINAL:
${ar.substring(0, 2000).trim()}

ENGLISH TRANSLATION:
${en.substring(0, 2000).trim()}

Provide a detailed evaluation in this exact JSON format (no markdown, no preamble):
{
  "accuracy_score": <number 1-10, where 10 is perfect translation>,
  "accurate_portions": "<key phrases/concepts translated accurately>",
  "omitted_content": "<present in Arabic but missing/understated in English>",
  "mistranslated_sections": "<incorrectly or misleadingly translated>",
  "theological_concerns": "<any theological or conceptual shifts>",
  "verdict": "<1-2 sentence overall assessment>"
}`;
  let full = "";
  const stream = await client.messages.stream({
    model: MODEL, max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  for await (const c of stream) {
    if (c.type === "content_block_delta" && c.delta.type === "text_delta") full += c.delta.text;
  }
  return JSON.parse(full.replace(/```json/gi, "").replace(/```/g, "").trim());
}

// ── main ──────────────────────────────────────────────────────
(async () => {
  console.log(`scholar=${SCHOLAR}${ONE_SURA ? ` sura=${ONE_SURA}` : " (all suras)"} from=${FROM} to=${TO === Infinity ? "end" : TO} limit=${LIMIT === Infinity ? "none" : LIMIT} dry=${DRY}`);
  const [verses, done, tails] = await Promise.all([verseList(), alreadyGraded(), englishDuplicateTails()]);
  const todo = verses.filter(v =>
    !done.has(`${v.sura}:${v.aya}`) &&
    !tails.has(`${v.sura}:${v.aya}`) &&                 // skip stale-English group tails
    (!ONE_SURA || (v.aya >= FROM && v.aya <= TO))
  );
  console.log(`${verses.length} verses have Arabic; ${done.size} already graded; ${tails.size} skipped as duplicate-English tails; ${todo.length} to do this scope.`);
  if (DRY) { console.log("DRY RUN — first 20:", todo.slice(0, 20).map(v => `${v.sura}:${v.aya}`).join(", ")); return; }

  let n = 0, ok = 0, skip = 0, err = 0;
  for (const { sura, aya } of todo) {
    if (n >= LIMIT) { console.log(`hit --limit=${LIMIT}, stopping.`); break; }
    n++;
    try {
      const [ar, en] = await Promise.all([fetchText(sura, aya, "ar"), fetchText(sura, aya, "en")]);
      if (!ar || !en) { console.log(`  skip ${sura}:${aya} (missing ${!ar ? "ar" : "en"})`); skip++; continue; }
      const ev = await grade(sura, aya, ar, en);
      await sbInsert({
        sura, aya, scholar_key: SCHOLAR,
        accuracy_score: ev.accuracy_score,
        accurate_portions: ev.accurate_portions,
        omitted_content: ev.omitted_content,
        mistranslated_sections: ev.mistranslated_sections,
        theological_concerns: ev.theological_concerns,
        verdict: ev.verdict,
        arabic_excerpt: ar.substring(0, 1000),
        english_excerpt: en.substring(0, 1000),
        reviewed_by: MODEL,
        confidence_level: "high",
      });
      ok++;
      console.log(`  ${sura}:${aya} -> ${ev.accuracy_score}/10   [${ok} done, ${todo.length - n} left]`);
    } catch (e) {
      err++;
      console.log(`  ERROR ${sura}:${aya}: ${e.message}`);
      // back off harder on rate-limit / overload
      if (/429|overload|rate/i.test(e.message)) await sleep(5000);
    }
    await sleep(DELAY);
  }
  console.log(`\nDONE. graded=${ok} skipped=${skip} errors=${err} (of ${n} attempted).`);
})();
