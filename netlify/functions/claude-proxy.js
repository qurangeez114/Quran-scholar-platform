const https = require('https');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY env var' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const payload = {
    model: body.model || 'claude-sonnet-4-5',
    max_tokens: Math.min(body.max_tokens || 1000, 2000),
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
      timeout: 25000,
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
        resolve({ statusCode: res.statusCode, headers: corsHeaders, body: data });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 504, headers: corsHeaders, body: JSON.stringify({ error: 'Request timeout' }) });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) });
    });

    req.write(payloadStr);
    req.end();
  });
};
