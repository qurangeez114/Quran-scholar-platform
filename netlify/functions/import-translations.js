// import-translations — pulls quran.com translations into Supabase.
// Call: /.netlify/functions/import-translations?lang=ur&chapters=2,7,15,17,18,20,38
// One language per call, chapter list kept small to stay within the 26s limit.
// Chains: quran.com -> verse_translations (upsert) -> story_comparison (propagate).

const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const API = 'https://api.quran.com/api/v4';

// code -> quran.com translation resource_id (verify at /resources/translations)
const LANG_IDS = { en:131, ur:158, am:87, tr:77, fr:136, id:33, fa:29, so:107 };

const HDR_GET    = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const HDR_UPSERT = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
                     'Content-Type': 'application/json',
                     Prefer: 'resolution=merge-duplicates,return=minimal' };

const stripHtml = (s) => (s || '')
  .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ').trim();

async function fetchChapter(resourceId, chapter) {
  const rows = []; let page = 1, total = 1;
  do {
    const url = `${API}/verses/by_chapter/${chapter}?translations=${resourceId}` +
                `&fields=verse_key&per_page=50&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`quran api ${r.status} ch${chapter}`);
    const j = await r.json();
    for (const v of j.verses) {
      const t = v.translations && v.translations[0] ? v.translations[0].text : null;
      if (t) rows.push({ verse_key: v.verse_key, text: stripHtml(t) });
    }
    total = (j.pagination && j.pagination.total_pages) || 1;
    page++;
  } while (page <= total);
  return rows;
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const lang = (q.lang || 'ur').toLowerCase();
    const resourceId = LANG_IDS[lang];
    if (!resourceId) return { statusCode: 400, body: JSON.stringify({ error: 'unknown lang ' + lang }) };

    const chapters = (q.chapters || '2,7,15,17,18,20,38')
      .split(',').map(n => parseInt(n, 10)).filter(Boolean);

    let upserted = 0; const perCh = {};
    for (const ch of chapters) {
      const rows = await fetchChapter(resourceId, ch);
      const payload = rows.map(r => ({ verse_key: r.verse_key, lang, text: r.text, resource_id: resourceId }));
      for (let i = 0; i < payload.length; i += 500) {
        const res = await fetch(`${SB_URL}/rest/v1/verse_translations`,
          { method: 'POST', headers: HDR_UPSERT, body: JSON.stringify(payload.slice(i, i + 500)) });
        if (!res.ok) throw new Error(`supabase upsert ${res.status}: ${await res.text()}`);
      }
      upserted += rows.length; perCh[ch] = rows.length;
    }

    const rpc = await fetch(`${SB_URL}/rest/v1/rpc/propagate_translations_to_story_comparison`,
      { method: 'POST', headers: { ...HDR_GET, 'Content-Type': 'application/json' }, body: '{}' });
    const propagated = rpc.ok ? await rpc.json() : `rpc ${rpc.status}`;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ ok: true, lang, chapters, upserted, perCh, propagated }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
