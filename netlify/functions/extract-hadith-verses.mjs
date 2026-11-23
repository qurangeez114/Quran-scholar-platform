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

   2026-11-22: the full scan used offset paging (Range headers). Past
   roughly offset 40,000 each page of hadith_corpus_canonical took longer
   than the 8 s database statement timeout, so pages returned 500 and the
   retries ran into Netlify's 30 s limit for scheduled functions. Every run
   from early November logged "start" and never "end", and no new links
   were added. Now: keyset paging (id > last id, ~0.3 s a page), an
   already-linked lookup only for the hadith on each page, a ~20 s budget
   per run, and a resume cursor (last_id) saved in automation_runs so
   successive runs cover the whole corpus between them. */
export const config = { schedule: "0 3 */2 * *" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const HEADERS = KEY.startsWith("sb_") ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` };
const METHOD = "regex:text_reference";
const PAGE_SIZE = 1000;
// Scheduled functions are stopped after 30 s, so each run works for about
// 20 s and saves where it stopped; the next run picks up from there.
const TIME_BUDGET_MS = 20000;
const VERSES = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

async function get(path, retries = 2) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
    if (r.ok) return r.json();
    if (r.status >= 500 && attempt <= retries) {
      await new Promise((res) => setTimeout(res, attempt * 1000));
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

// Where the previous run stopped. A run that reached the end of the corpus
// saves last_id 0, so the next run starts a fresh pass from the top.
async function loadCursor() {
  try {
    const rows = await get("automation_runs?select=detail&function_name=eq.extract-hadith-verses&phase=in.(progress,end)&order=created_at.desc&limit=1");
    const id = Number(rows?.[0]?.detail?.last_id);
    return Number.isFinite(id) && id > 0 ? id : 0;
  } catch { return 0; }
}

export async function run({ limitPages = Infinity, dryRun = false, budgetMs = TIME_BUDGET_MS, startAfter } = {}) {
  const t0 = Date.now();
  const from = startAfter ?? (await loadCursor());
  const st = { mode: "keyset", from_id: from, last_id: from, candidates: 0, new_links: 0, inserted: 0, errors: 0, pages_done: 0, pass_complete: false, dry_run: dryRun };
  let lastId = from;
  try {
    while (st.pages_done < limitPages && Date.now() - t0 < budgetMs) {
      const rows = await get(`hadith_corpus_canonical?select=id,text_english&id=gt.${lastId}&order=id&limit=${PAGE_SIZE}`);
      if (!rows.length) { st.pass_complete = true; lastId = 0; break; }
      st.candidates += rows.length;

      const found = [];
      for (const h of rows) for (const [s, a] of extract(h.text_english)) found.push({ hadith_id: h.id, sura_id: s, aya_number: a });

      let links = [];
      if (found.length) {
        const ids = [...new Set(found.map((l) => l.hadith_id))];
        const have = new Set();
        for (let i = 0; i < ids.length; i += 200) {
          const got = await get(`hadith_verse_links?select=hadith_id,sura_id,aya_number&hadith_id=in.(${ids.slice(i, i + 200).join(",")})`);
          got.forEach((r) => have.add(`${r.hadith_id}|${r.sura_id}|${r.aya_number}`));
        }
        const now = new Date().toISOString();
        links = found.filter((l) => !have.has(`${l.hadith_id}|${l.sura_id}|${l.aya_number}`)).map((l) => ({ ...l, link_method: METHOD, created_at: now }));
      }
      st.new_links += links.length;
      if (!dryRun) {
        const { inserted, ok } = await insertBatch(links);
        st.inserted += inserted;
        if (!ok) { st.errors++; break; } // keep the cursor before this page so it is retried
      }
      lastId = rows[rows.length - 1].id;
      st.pages_done++;
      if (rows.length < PAGE_SIZE) { st.pass_complete = true; lastId = 0; break; }
    }
  } catch (e) { st.errors++; st.error = e.message; console.error("FATAL", e.message); }
  st.last_id = lastId;
  st.ms = Date.now() - t0;
  return st;
}

export default async () => {
  await diag("start", { has_key: !!KEY, key_prefix: KEY ? KEY.slice(0, 6) : null });
  if (!KEY) { console.error("No Supabase key in env"); await diag("fatal_no_key", {}); return; }
  const result = await run();
  console.log("hadith-extraction", JSON.stringify(result));
  // "end" carries last_id so the next run resumes where this one stopped.
  await diag(result.errors ? "end_with_errors" : "end", result);
  if (result.errors) await diag("progress", { last_id: result.last_id });
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
};
