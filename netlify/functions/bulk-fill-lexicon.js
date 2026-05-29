
const https = require('https');

const SUPABASE_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const BATCH_SIZE = 50;   // words per invocation
const CHUNK_SIZE = 10;   // words per Claude call

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({ hostname, port: 443, path, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchMissing(limit, offset) {
  const url = `${SUPABASE_URL}/rest/v1/word_analysis?select=id,arabic_word,root_word&or=(original_meaning.is.null,original_meaning.eq.)&arabic_word=not.is.null&limit=${limit}&offset=${offset}&order=id`;
  const res = await new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });
  return JSON.parse(res).filter(w => w.arabic_word && /[\u0600-\u06FF]/.test(w.arabic_word) && w.arabic_word.length > 1);
}

async function fillChunk(words) {
  const list = words.map((w, i) => `${i+1}. "${w.arabic_word}"${w.root_word ? ` (root: ${w.root_word})` : ''}`).join('\n');
  const prompt = `You are a Quranic Arabic lexicographer. For each Arabic word below, provide a concise Quranic-era meaning in English (max 12 words each). Respond ONLY as a JSON array of strings in the same order, no extra text.\n\nWords:\n${list}`;
  
  const r = await httpsPost('api.anthropic.com', '/v1/messages', {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  }, { model: 'claude-haiku-4-5-20251001', max_tokens: 800,
       messages: [{ role: 'user', content: prompt }] });

  const data = JSON.parse(r.body);
  const text = data.content?.[0]?.text || '[]';
  // Strip markdown fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function saveWords(updates) {
  // Bulk upsert via Supabase
  const r = await httpsPost('ylosytbxpzxzwfzjpaej.supabase.co',
    '/rest/v1/word_analysis', {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    }, updates);
  return r.status;
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const offset = body.offset || 0;

    // Fetch a batch of missing words
    const words = await fetchMissing(BATCH_SIZE, offset);
    if (words.length === 0) {
      return { statusCode: 200, headers: corsHeaders,
        body: JSON.stringify({ done: true, message: 'All words filled!' }) };
    }

    // Process in chunks of CHUNK_SIZE in parallel
    const chunks = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) chunks.push(words.slice(i, i + CHUNK_SIZE));

    const results = await Promise.allSettled(chunks.map(async chunk => {
      try {
        const meanings = await fillChunk(chunk);
        const updates = chunk.map((w, i) => ({
          id: w.id,
          arabic_word: w.arabic_word,
          original_meaning: meanings[i] || null
        })).filter(u => u.original_meaning);
        if (updates.length > 0) await saveWords(updates);
        return updates.length;
      } catch(e) {
        console.error('Chunk failed:', e.message);
        return 0;
      }
    }));

    const filled = results.reduce((s, r) => s + (r.value || 0), 0);
    return {
      statusCode: 200, headers: corsHeaders,
      body: JSON.stringify({
        done: false,
        offset: offset + BATCH_SIZE,
        filled,
        total_in_batch: words.length,
        message: `Filled ${filled} words. Next offset: ${offset + BATCH_SIZE}`
      })
    };
  } catch(e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
  }
};
