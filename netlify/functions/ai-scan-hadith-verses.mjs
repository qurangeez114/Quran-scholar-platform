/* Scheduled Netlify function: every 2 days at 04:00 UTC (30 min after the
   regex-based extract-hadith-verses, to avoid overlapping load). Also
   callable on-demand via HTTP (used by the GitHub Actions fallback in
   .github/workflows/ai-scan-hadith-verses.yml).

   Companion to extract-hadith-verses.mjs: that one only catches hadith with
   an EXPLICIT "(sura:aya)"-style citation in the text. This one uses Claude
   to catch indirect/implied references regex can't see (e.g. a hadith about
   "the Throne Verse", or the explicit occasion-of-revelation for a verse
   with no digit-citation in the text at all).

   The full backlog (~76k hadith) was already cleared manually in a one-time
   session pass (2026-10-01). From here on this only needs to catch NEWLY
   ADDED hadith, so each run is intentionally small (bounded hadith count,
   not paginated to exhaustion) to stay well inside the function's time
   budget. Progress is tracked on hadith_corpus (ai_scan_status,
   ai_scanned_at) so a missed/slow run just gets picked up next time —
   nothing is lost or double-charged (duplicate links are ignored via the
   unique constraint on hadith_verse_links).

   Reads/inserts/updates only (hadith_verse_links inserts, hadith_corpus
   status columns). Keys come from Netlify env; nothing hardcoded. */
export const config = { schedule: "0 4 */2 * *" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const HEADERS = KEY.startsWith("sb_") ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` };
const METHOD = "ai_scan_v1";
const BATCH_SIZE = 60;
const MAX_HADITH_PER_RUN = 300; // ~5 batches; keeps each invocation well inside the time budget
const CONCURRENCY = 5;

const SURA_LENGTHS = {1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
111:5,112:4,113:5,114:6};

function isValidVerse(sura, aya) {
  sura = Number(sura); aya = Number(aya);
  return Number.isInteger(sura) && Number.isInteger(aya) && SURA_LENGTHS[sura] && aya >= 1 && aya <= SURA_LENGTHS[sura];
}

async function sbFetch(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${path.split("?")[0]} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

function makePrompt(rows) {
  const list = rows.map((r) => `[ID ${r.id}] (${r.collection}): ${(r.text_english || "").slice(0, 700)}`).join("\n\n");
  return `You are scanning hadith for direct or clearly-implied references to specific Quranic verses.

For each hadith below, determine if it explicitly discusses, explains, quotes, paraphrases, or was narrated as a reason-for-revelation of ONE OR MORE specific Quran verses. Include indirect-but-unambiguous references (e.g. a hadith clearly about "the Throne Verse" should be identified as 2:255). A single hadith may reference multiple distinct verses if it genuinely covers multiple topics.

Do NOT include a reference just because the hadith mentions a general Islamic concept (prayer, charity, Paradise, etc.) that appears in many verses — only tag it if there's a specific, identifiable verse it is tied to.

Hadith:
${list}

Respond with ONLY a JSON array, one object per (hadith, verse) pair found (omit hadith with no clear reference):
[{"id": <id>, "sura": <int>, "aya": <int>}]
Respond with ONLY the JSON array, no other text.`;
}

async function callClaude(rows) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 6500, messages: [{ role: "user", content: makePrompt(rows) }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.split("```")[1].replace(/^json/, "");
  return JSON.parse(cleaned);
}

async function processBatch(rows, st) {
  const ids = new Set(rows.map((r) => r.id));
  let results;
  try {
    results = await callClaude(rows);
  } catch (e) {
    st.batch_errors++;
    console.error("batch error", e.message);
    return; // left unmarked; picked up again on a future run
  }

  const links = [];
  const matched = new Set();
  for (const item of results) {
    if (!item || !ids.has(item.id) || !isValidVerse(item.sura, item.aya)) continue;
    links.push({ hadith_id: item.id, sura_id: Number(item.sura), aya_number: Number(item.aya), link_method: METHOD });
    matched.add(item.id);
  }

  if (links.length) {
    try {
      await sbFetch("hadith_verse_links?on_conflict=hadith_id,sura_id,aya_number", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal,resolution=ignore-duplicates" },
        body: JSON.stringify(links),
      });
    } catch (e) {
      console.error("insert error", e.message);
    }
  }

  const now = new Date().toISOString();
  const matchedIds = [...matched];
  const noMatchIds = rows.map((r) => r.id).filter((id) => !matched.has(id));
  try {
    if (matchedIds.length)
      await sbFetch(`hadith_corpus?id=in.(${matchedIds.join(",")})`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ ai_scan_status: "matched", ai_scanned_at: now }),
      });
    if (noMatchIds.length)
      await sbFetch(`hadith_corpus?id=in.(${noMatchIds.join(",")})`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ ai_scan_status: "no_match", ai_scanned_at: now }),
      });
  } catch (e) {
    console.error("status patch error", e.message);
    return; // links kept; status left unmarked so this batch is retried, not lost
  }

  st.processed += rows.length;
  st.matched += matched.size;
  st.links_inserted += links.length;
}

export default async (req) => {
  const t0 = Date.now();
  const st = { candidates: 0, processed: 0, matched: 0, links_inserted: 0, batch_errors: 0 };
  if (!KEY || !ANTHROPIC_KEY) {
    console.error("Missing Supabase or Anthropic key in env");
    return new Response(JSON.stringify({ error: "missing env keys" }), { status: 500 });
  }

  try {
    const rows = await sbFetch(
      "hadith_corpus_canonical?select=id,collection,text_english&ai_scan_status=is.null&ai_scan_attempted_at=is.null&order=id&limit=" +
        MAX_HADITH_PER_RUN
    );
    // Mark too-short/empty text as scanned too, so it never silently blocks
    // pagination on a future run (a page that's entirely short-text hadith
    // would otherwise filter down to empty and look like "nothing left").
    const tooShortIds = rows.filter((r) => (r.text_english || "").length <= 40).map((r) => r.id);
    if (tooShortIds.length) {
      try {
        await sbFetch(`hadith_corpus?id=in.(${tooShortIds.join(",")})`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ ai_scan_status: "too_short", ai_scanned_at: new Date().toISOString() }),
        });
      } catch (e) {
        console.error("too_short patch error", e.message);
      }
    }
    const candidates = rows.filter((r) => (r.text_english || "").length > 40);
    st.candidates = candidates.length;
    st.too_short_marked = tooShortIds.length;

    const batches = [];
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) batches.push(candidates.slice(i, i + BATCH_SIZE));

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      await Promise.all(batches.slice(i, i + CONCURRENCY).map((b) => processBatch(b, st)));
    }
  } catch (e) {
    st.error = e.message;
    console.error("FATAL", e.message);
  }

  const result = { ...st, ms: Date.now() - t0 };
  console.log("ai-hadith-scan", JSON.stringify(result));
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
};
