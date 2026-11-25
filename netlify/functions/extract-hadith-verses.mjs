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
/* 2026-11-25: the first run with that fix (Nov 25 03:01 UTC) added nothing.
   Netlify started it three times, about 15 s apart, because each try ran
   past ~15 s without answering. The three overlapped, each read the cursor
   before the others saved one, so all began at id 0; the first then failed
   on a cold-cache read (three tries of an 8 s statement timeout). Now:
   - each run works for ~10 s on 500-row pages and always answers 200, so
     Netlify has no reason to start it again;
   - a run that finds another run active in the last minute steps aside;
   - the cursor is saved after every page, so a stop keeps its place;
   - it runs every 15 minutes until a full pass is done, then rests for
     20 hours, so the whole corpus is checked once a day. */
export const config = { schedule: "*/15 * * * *" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const HEADERS = KEY.startsWith("sb_") ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` };
const METHOD = "regex:text_reference";
const PAGE_SIZE = 500;
// Scheduled functions are stopped after 30 s, and Netlify starts one again
// if it hasn't answered after about 15 s, so each run works for about 10 s
// and saves where it stopped; the next run picks up from there.
const TIME_BUDGET_MS = 10000;
const REST_HOURS = 20;     // after a full pass, wait this long before the next
const OVERLAP_MS = 60000;  // another run seen this recently counts as active
const FN = "extract-hadith-verses";
const VERSES = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

async function get(path, retries = 2, deadline = Infinity) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
    if (r.ok) return r.json();
    if (r.status >= 500 && attempt <= retries && Date.now() + attempt * 1000 < deadline) {
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

// Logs one row and returns its id (undefined if logging failed).
async function diag(phase, detail) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/automation_runs?select=id`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify([{ function_name: FN, phase, detail }]),
    });
    if (r.ok) return (await r.json())?.[0]?.id;
  } catch { /* diagnostic only, never let this break the real run */ }
}

// Where the previous run stopped, and when the last full pass finished.
// A run that reached the end of the corpus saves last_id 0 and
// pass_complete, so the next pass starts from the top after the rest period.
export async function loadState() {
  try {
    const rows = await get(`automation_runs?select=created_at,detail&function_name=eq.${FN}&phase=in.(progress,end,end_with_errors)&order=id.desc&limit=1`, 1);
    const r = rows?.[0], id = Number(r?.detail?.last_id);
    return { lastId: Number.isFinite(id) && id > 0 ? id : 0, passDoneAt: r?.detail?.pass_complete ? Date.parse(r.created_at) : 0 };
  } catch { return { lastId: 0, passDoneAt: 0 }; }
}

// True when another run logged a start or a page in the last minute and
// hasn't logged its end since.
async function otherRunActive(ownId) {
  const since = encodeURIComponent(new Date(Date.now() - OVERLAP_MS).toISOString());
  const rows = await get(`automation_runs?select=phase&function_name=eq.${FN}&id=lt.${ownId}&created_at=gte.${since}&order=id.desc&limit=1`, 1);
  return ["start", "progress"].includes(rows?.[0]?.phase);
}

export async function run({ limitPages = Infinity, dryRun = false, budgetMs = TIME_BUDGET_MS, startAfter, saveProgress = false } = {}) {
  const t0 = Date.now();
  const from = startAfter ?? (await loadState()).lastId;
  const st = { mode: "keyset", from_id: from, last_id: from, candidates: 0, new_links: 0, inserted: 0, errors: 0, pages_done: 0, pass_complete: false, dry_run: dryRun };
  let lastId = from, slowest = 0;
  try {
    // Start a page only if one as slow as the slowest so far still fits.
    while (st.pages_done < limitPages && Date.now() - t0 + slowest < budgetMs) {
      const p0 = Date.now();
      const rows = await get(`hadith_corpus_canonical?select=id,text_english&id=gt.${lastId}&order=id&limit=${PAGE_SIZE}`, 2, t0 + budgetMs);
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
      if (saveProgress && !dryRun) await diag("progress", { last_id: lastId });
      slowest = Math.max(slowest, Date.now() - p0);
    }
  } catch (e) { st.errors++; st.error = e.message; console.error("FATAL", e.message); }
  st.last_id = lastId;
  st.ms = Date.now() - t0;
  return st;
}

export default async () => {
  // Always answer 200: a failed run keeps its cursor and the next scheduled
  // run retries, so Netlify starting it again early would only overlap.
  const reply = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  if (!KEY) { console.error("No Supabase key in env"); await diag("fatal_no_key", {}); return reply({ error: "no key" }); }
  const state = await loadState();
  if (state.passDoneAt && Date.now() - state.passDoneAt < REST_HOURS * 3600e3) return reply({ idle: true, pass_done_at: new Date(state.passDoneAt).toISOString() });
  const ownId = await diag("start", { has_key: true, key_prefix: KEY.slice(0, 6), from_id: state.lastId });
  if (ownId && (await otherRunActive(ownId).catch(() => false))) {
    await diag("skipped_overlap", {});
    return reply({ skipped: "another run is active" });
  }
  const result = await run({ startAfter: state.lastId, saveProgress: true });
  console.log("hadith-extraction", JSON.stringify(result));
  // "end" carries last_id so the next run resumes where this one stopped.
  await diag(result.errors ? "end_with_errors" : "end", result);
  return reply(result);
};
