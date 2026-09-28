/* Scheduled Netlify function: every 2 days at 03:00 UTC.
   Finds hadith whose English text contains SURA:AYA references (e.g. "(36:12)"),
   validates each against real verse counts, and inserts rows into
   hadith_verse_links (link_method 'regex:text_reference'). Reads/inserts only.
   Key comes from Netlify env; nothing hardcoded. */
export const config = { schedule: "0 3 */2 * *" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const HEADERS = KEY.startsWith("sb_") ? { apikey: KEY } : { apikey: KEY, Authorization: `Bearer ${KEY}` };
const METHOD = "regex:text_reference";
const VERSES = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

async function page(path, from, size) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...HEADERS, Range: `${from}-${from + size - 1}`, "Range-Unit": "items" } });
  if (!r.ok) throw new Error(`GET ${path.split("?")[0]} ${r.status}`);
  return r.json();
}

export function extract(text) {
  const out = [], seen = new Set();
  for (const m of String(text || "").matchAll(/(?<![\d:.])(\d{1,3}):(\d{1,3})(?![\d:])(?!\s?[ap]\.?m\b)/gi)) {
    const s = +m[1], a = +m[2], k = `${s}:${a}`;
    if (s >= 1 && s <= 114 && a >= 1 && a <= VERSES[s - 1] && !seen.has(k)) { seen.add(k); out.push([s, a]); }
  }
  return out;
}

export default async () => {
  const t0 = Date.now();
  const st = { candidates: 0, new_links: 0, inserted: 0, errors: 0 };
  if (!KEY) { console.error("No Supabase key in env"); return; }
  try {
    const have = new Set();
    for (let f = 0; ; f += 1000) {
      const rows = await page("hadith_verse_links?select=hadith_id,sura_id,aya_number&order=id", f, 1000);
      rows.forEach((r) => have.add(`${r.hadith_id}|${r.sura_id}|${r.aya_number}`));
      if (rows.length < 1000) break;
    }
    const rows = [];
    const q = "hadith_corpus_canonical?select=id,text_english&order=id&text_english=match." + encodeURIComponent("\\y\\d{1,3}:\\d{1,3}\\y");
    for (let f = 0; ; f += 500) {
      const p = await page(q, f, 500);
      rows.push(...p);
      if (p.length < 500) break;
    }
    st.candidates = rows.length;
    const now = new Date().toISOString(), out = [];
    for (const h of rows)
      for (const [s, a] of extract(h.text_english))
        if (!have.has(`${h.id}|${s}|${a}`)) out.push({ hadith_id: h.id, sura_id: s, aya_number: a, link_method: METHOD, created_at: now });
    st.new_links = out.length;
    for (let i = 0; i < out.length; i += 500) {
      const b = out.slice(i, i + 500);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hadith_verse_links`, { method: "POST", headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(b) });
      if (r.ok) st.inserted += b.length; else { st.errors++; console.error("insert", r.status, (await r.text()).slice(0, 200)); }
    }
  } catch (e) { st.errors++; console.error("FATAL", e.message); }
  console.log("hadith-extraction", JSON.stringify({ ...st, ms: Date.now() - t0 }));
};
