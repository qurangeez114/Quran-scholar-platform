/* Scheduled Netlify function: every 2 days at 03:00 UTC.
   Finds hadith in hadith_corpus_canonical with no row in hadith_verse_links,
   extracts SURA:AYA references from the text, inserts the links.
   Reads/inserts only. Key comes from the Netlify env (never hardcoded). */
export const config = { schedule: "0 3 */2 * *" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ylosytbxpzxzwfzjpaej.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const HEADERS = KEY.startsWith("sb_")
  ? { apikey: KEY }
  : { apikey: KEY, Authorization: `Bearer ${KEY}` };
const BUDGET_MS = 20000;

async function getPage(path, from, size) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...HEADERS, Range: `${from}-${from + size - 1}`, "Range-Unit": "items" },
  });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}

function extract(text) {
  const out = [], seen = new Set();
  for (const m of String(text || "").matchAll(/\b(\d{1,3}):(\d{1,3})\b/g)) {
    const sura = +m[1], aya = +m[2], k = `${sura}:${aya}`;
    if (sura >= 1 && sura <= 114 && aya >= 1 && aya <= 286 && !seen.has(k)) { seen.add(k); out.push({ sura, aya }); }
  }
  return out;
}

export default async () => {
  const t0 = Date.now();
  const stats = { hadith_scanned: 0, hadith_with_refs: 0, links_inserted: 0, errors: 0 };
  if (!KEY) { console.error("No Supabase key in env"); return; }
  try {
    const linked = new Set();
    for (let from = 0; ; from += 1000) {
      const rows = await getPage("hadith_verse_links?select=hadith_id", from, 1000);
      rows.forEach((r) => linked.add(r.hadith_id));
      if (rows.length < 1000) break;
    }
    const links = [];
    for (let from = 0; Date.now() - t0 < BUDGET_MS; from += 1000) {
      const rows = await getPage("hadith_corpus_canonical?select=id,hadith_text&order=id", from, 1000);
      for (const h of rows) {
        if (linked.has(h.id) || !h.hadith_text) continue;
        stats.hadith_scanned++;
        const v = extract(h.hadith_text);
        if (v.length) stats.hadith_with_refs++;
        v.forEach(({ sura, aya }) => links.push({
          hadith_id: h.id, verse_sura: sura, verse_aya: aya,
          extraction_method: "regex_extraction_v2", created_at: new Date().toISOString(),
        }));
      }
      if (rows.length < 1000) break;
    }
    for (let i = 0; i < links.length; i += 500) {
      const batch = links.slice(i, i + 500);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hadith_verse_links`, {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(batch),
      });
      if (r.ok) stats.links_inserted += batch.length;
      else { stats.errors++; console.error("insert", r.status, (await r.text()).slice(0, 200)); }
    }
  } catch (e) { stats.errors++; console.error("FATAL", e.message); }
  console.log("hadith-extraction", JSON.stringify({ ...stats, ms: Date.now() - t0 }));
};
