// netlify/functions/analyze.js
// Streaming proxy for the AI analysis feature.
// Uses Anthropic's streaming API internally (stream:true) so tokens flow
// continuously — this prevents the socket from sitting idle during long
// generations, which was causing 504 timeouts, and assembles the full
// response before returning the same JSON shape the browser expects.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured — missing ANTHROPIC_API_KEY env var' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
  }

  const { prompt, max_tokens = 4000, model = 'claude-sonnet-4-6', system } = body;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  const payload = {
    model,
    max_tokens,
    messages: [{ role: 'user', content: prompt }],
    stream: true
  };
  if (system) payload.system = system;

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
      const errorBody = await resp.text();
      return {
        statusCode: resp.status,
        headers: { 'Content-Type': 'application/json' },
        body: errorBody
      };
    }

    // Consume Anthropic's SSE stream and assemble the full text.
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
        try {
          const data = JSON.parse(dataLine.slice(5).trim());
          if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
            fullText += data.delta.text || '';
          }
        } catch {
          // ignore malformed events
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text: fullText }] })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Upstream error: ' + e.message }) };
  }
};
