
const https = require('https');

const SUPABASE_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const BATCH_SIZE = 50;
const CHUNK_SIZE = 10;

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'ylosytbxpzxzwfzjpaej.supabase.co', path,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function supabasePatch(id, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = https.request({
      hostname: 'ylosytbxpzxzwfzjpaej.supabase.co',
      path: `/rest/v1/word_analysis?id=eq.${id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

function claudeCall(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com', port: 443, path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

async function fetchMissing(limit, offset) {
  const path = `/rest/v1/word_analysis?select=id,arabic_word,root_word&or=(original_meaning.is.null,original_meaning.eq.)&arabic_word=not.is.null&limit=${limit}&offset=${offset}&order=id`;
  const res = await supabaseGet(path);
  return JSON.parse(res).filter(w => w.arabic_word && /[\u0600-\u06FF]/.test(w.arabic_word) && w.arabic_word.length > 1);
}

async function fillChunk(words) {
  const list = words.map((w, i) => `${i+1}. "${w.arabic_word}"${w.root_word ? ` (root: ${w.root_word})` : ''}`).join('\n');
  const prompt = `You are a Quranic Arabic lexicographer. For each Arabic word below, provide a concise Quranic-era meaning in English (max 12 words each). Respond ONLY as a JSON array of strings in the same order, no extra text, no markdown fences.\n\nWords:\n${list}`;
  const data = await claudeCall(prompt);
  const text = (data.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

exports.handler = async (event) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const offset = body.offset || 0;
    const words = await fetchMissing(BATCH_SIZE, offset);

    if (words.length === 0) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ done: true, message: 'All words filled!' }) };
    }

    const chunks = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) chunks.push(words.slice(i, i + CHUNK_SIZE));

    const results = await Promise.allSettled(chunks.map(async chunk => {
      try {
        const meanings = await fillChunk(chunk);
        let count = 0;
        await Promise.all(chunk.map(async (w, i) => {
          if (meanings[i]) {
            await supabasePatch(w.id, { original_meaning: meanings[i] });
            count++;
          }
        }));
        return count;
      } catch(e) { console.error('chunk failed:', e.message); return 0; }
    }));

    const filled = results.reduce((s, r) => s + (r.value || 0), 0);
    return {
      statusCode: 200, headers: corsHeaders,
      body: JSON.stringify({ done: false, offset: offset + BATCH_SIZE, filled, total_in_batch: words.length })
    };
  } catch(e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
  }
};
