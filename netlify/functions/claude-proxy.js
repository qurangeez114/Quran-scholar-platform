const https = require('https');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const payload = {
    model: body.model || 'claude-haiku-4-5-20251001',
    max_tokens: body.max_tokens || 1000,
    messages: body.messages
  };
  if (body.system) payload.system = body.system;

  const payloadStr = JSON.stringify(payload);

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Log non-200 for debugging
        if (res.statusCode !== 200) {
          console.error('Anthropic API error:', res.statusCode, data);
        }
        resolve({
          statusCode: res.statusCode,
          headers: corsHeaders,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      resolve({
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: err.message })
      });
    });

    req.write(payloadStr);
    req.end();
  });
};
