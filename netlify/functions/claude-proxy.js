// netlify/functions/claude-proxy.js
// Uses fetch + stream:true so tokens flow continuously,
// preventing socket idle timeouts on long responses.

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const payload = {
    model: body.model || 'claude-sonnet-4-6',
    max_tokens: Math.min(body.max_tokens || 2000, 4000),
    messages: body.messages,
    stream: true
  };
  if (body.system) payload.system = body.system;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { statusCode: resp.status, headers: cors, body: errText };
    }

    // Consume SSE stream and accumulate full text
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split('\n\n');
      buf = events.pop();
      for (const ev of events) {
        const dataLine = ev.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        const jsonStr = dataLine.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            fullText += data.delta.text || '';
          }
        } catch { /* ignore malformed events */ }
      }
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ content: [{ type: 'text', text: fullText }] })
    };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: { message: e.message } }) };
  }
};
