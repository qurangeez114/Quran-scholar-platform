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

  const { prompt, max_tokens = 4000, model = 'claude-sonnet-4-6' } = body;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
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
