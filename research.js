// netlify/functions/research.js
// Server-side proxy for the AI Deep Research feature.
// Accepts: { prompt | messages, max_tokens?, model?, system? }
// Keeps the Anthropic API key on the server (in env var ANTHROPIC_API_KEY).

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

  // Accept either a simple { prompt } shape OR a pre-built { messages } array
  // (the latter is used when sending images).
  const {
    prompt,
    messages,
    max_tokens = 4000,
    model = 'claude-sonnet-4-5',
    system
  } = body;

  let finalMessages;
  if (Array.isArray(messages) && messages.length > 0) {
    finalMessages = messages;
  } else if (prompt) {
    finalMessages = [{ role: 'user', content: prompt }];
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt or messages' }) };
  }

  const payload = {
    model,
    max_tokens,
    messages: finalMessages
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

    const data = await resp.json();
    return {
      statusCode: resp.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Upstream error: ' + e.message }) };
  }
};
