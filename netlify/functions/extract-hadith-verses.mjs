/* Scheduled Netlify function: every 2 days at 03:00 UTC. Also callable
   on-demand via HTTP (used by the GitHub Actions fallback in
   .github/workflows/extract-hadith-verses.yml).

   Finds hadith whose English text contains SURA:AYA references (e.g.
   "(36:12)"), validates each against real verse counts, and inserts rows
   into hadith_verse_links (link_method 'regex:text_reference').
   Reads/inserts only. Key comes from Netlify env; nothing hardcoded.

   Always does a full paginated scan of hadith_corpus_canonical -- there
   is no cheaper correct way to find "not yet covered by this method"
   without a dedicated tracking column. A previous version filtered by
   created_at over the last few days to keep each run fast, on the
   assumption new hadith get inserted into this table regularly between
   runs. That assumption was wrong: this corpus was imported once and is
   effectively static, so created_at >= (now - N days) matched zero rows
   on every single scheduled run from deployment (2026-09-27) through at
   least 2026-10-03 -- four separate "successful" runs that silently did
   nothing. Confirmed via link_method breakdown in hadith_verse_links:
   zero rows under this method's name from any date in that window.

   The already-linked lookup (the `have` set below) is loaded once up
   front specifically so a full scan stays correctness-safe and cheap to
   re-run: re-scanning hadith whose text yields no match, or whose match
   is already linked, costs a page fetch and a regex pass, not a wasted
   insert. A full pass over the corpus in 1000-row pages is lightweight
   SELECT+regex+INSERT work, not heavy computation, so it fits the
   function's time budget comfortably at this corpus size. */
export const config = { schedule: "0 3 */2 * *" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const HEADERS = KEY.startsWith("sb_") ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` };
const METHOD = "regex:text_reference";
const PAGE_SIZE = 1000;
const VERSES = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

async function page(path, from, size, retries = 4) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...HEADERS, Range: `${from}-${from + size - 1}`, "Range-Unit": "items" } });
    if (r.ok) return r.json();
    if (r.status >= 500 && attempt <= retries) {
      await new Promise((res) => setTimeout(res, Math.min(attempt * 1000, 5000)));
      continue;
    }
    throw new Error(`GET ${path.split("?")[0]} ${r.status}`);
  }
}

export function extract(text) {
  const out = [], seen = new Set();
  for (const m of String(text || "").matchAll(/(?<![\d:.])(\d{1,3}):(\d{1,3})(?![\d:])(?!\s?[ap]\.?m\b)/gi)) {
    const s = +m[1], a = +m[2], k = `${s}:${a}`;
    if (s >= 1 && s <= 114 && a >= 1 && a <= VERSES[s - 1] && !seen.has(k)) { seen.add(k); out.push([s, a]); }
  }
  return out;
}

async function insertBatch(links) {
  if (!links.length) return { inserted: 0, ok: true };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/hadith_verse_links?on_conflict=hadith_id,sura_id,aya_number`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify(links),
  });
  if (r.ok) return { inserted: links.length, ok: true };
  console.error("insert", r.status, (await r.text()).slice(0, 200));
  return { inserted: 0, ok: false };
}

async function diag(phase, detail) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/automation_runs`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify([{ function_name: "extract-hadith-verses", phase, detail }]),
    });
  } catch { /* diagnostic only, never let this break the real run */ }
}

export default async (req) => {
  const t0 = Date.now();
  const st = { mode: "full", candidates: 0, new_links: 0, inserted: 0, errors: 0, pages_done: 0 };
  await diag("start", { has_key: !!KEY, key_prefix: KEY ? KEY.slice(0, 6) : null });
  if (!KEY) { console.error("No Supabase key in env"); await diag("fatal_no_key", {}); return; }

  try {
    const have = new Set();
    for (let f = 0; ; f += 1000) {
      const rows = await page("hadith_verse_links?select=hadith_id,sura_id,aya_number&order=id", f, 1000);
      rows.forEach((r) => have.add(`${r.hadith_id}|${r.sura_id}|${r.aya_number}`));
      if (rows.length < 1000) break;
    }

    const q = "hadith_corpus_canonical?select=id,text_english&order=id";
    const now = new Date().toISOString();
    for (let f = 0; ; f += PAGE_SIZE) {
      const rows = await page(q, f, PAGE_SIZE);
      st.candidates += rows.length;

      const links = [];
      for (const h of rows)
        for (const [s, a] of extract(h.text_english)) {
          const k = `${h.id}|${s}|${a}`;
          if (!have.has(k)) { links.push({ hadith_id: h.id, sura_id: s, aya_number: a, link_method: METHOD, created_at: now }); have.add(k); }
        }
      st.new_links += links.length;

      const { inserted, ok } = await insertBatch(links);
      st.inserted += inserted;
      if (!ok) st.errors++;
      st.pages_done++;

      if (rows.length < PAGE_SIZE) break;
    }
  } catch (e) { st.errors++; console.error("FATAL", e.message); await diag("fatal_exception", { message: e.message }); }
  const result = { ...st, ms: Date.now() - t0 };
  console.log("hadith-extraction", JSON.stringify(result));
  await diag("end", result);
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
};
