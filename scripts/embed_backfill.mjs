// Backfill public.search_embeddings (see migrations/20261020_semantic_search.sql).
// Usage: SUPABASE_URL=https://ylosytbxpzxzwfzjpaej.supabase.co \
//        SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... node scripts/embed_backfill.mjs [quran|hadith|all]
// Re-runnable: upserts on (src, ref_id). Column names below may need adjusting.
const URL_ = process.env.SUPABASE_URL, SR = process.env.SUPABASE_SERVICE_ROLE_KEY, OK = process.env.OPENAI_API_KEY;
if (!URL_ || !SR || !OK) { console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY'); process.exit(1); }
const MODEL = 'text-embedding-3-small', BATCH = 100, which = process.argv[2] || 'all';
const H = { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };

const SOURCES = {
  quran: { table: 'ayas', select: 'sura_id,aya_number,english', map: r => ({ src: 'quran', ref_id: `${r.sura_id}:${r.aya_number}`, sura: r.sura_id, aya: r.aya_number, title: null, body: r.english }) },
  hadith: { table: 'hadith_corpus', select: 'id,collection,hadith_number,text_english', map: r => ({ src: 'hadith', ref_id: String(r.id), sura: null, aya: null, title: `${r.collection} #${r.hadith_number}`, body: r.text_english }) },
};

async function embed(texts) {
  const r = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: 'Bearer ' + OK, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, input: texts.map(t => t.slice(0, 8000)) }) });
  if (!r.ok) throw new Error('embeddings ' + r.status + ' ' + await r.text());
  return (await r.json()).data.map(d => d.embedding);
}
for (const [name, s] of Object.entries(SOURCES)) {
  if (which !== 'all' && which !== name) continue;
  for (let off = 0; ; off += BATCH) {
    const r = await fetch(`${URL_}/rest/v1/${s.table}?select=${s.select}&order=${s.select.split(',')[0]}&offset=${off}&limit=${BATCH}`, { headers: H });
    const rows = (await r.json()).map(s.map).filter(x => x.body && x.body.trim());
    if (!rows.length) break;
    const vecs = await embed(rows.map(x => (x.title ? x.title + '\n' : '') + x.body));
    rows.forEach((x, i) => { x.embedding = vecs[i]; x.model = MODEL; x.updated_at = new Date().toISOString(); });
    const u = await fetch(`${URL_}/rest/v1/search_embeddings?on_conflict=src,ref_id`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) });
    if (!u.ok) throw new Error('upsert ' + u.status + ' ' + await u.text());
    console.log(name, off + rows.length);
  }
}
