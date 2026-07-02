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

  // stream:true = tokens flow continuously, so the socket never sits idle
  // long enough to trip a timeout, even for the longest analyses.
  const payload = {
    model: body.model || 'claude-sonnet-4-5',
    max_tokens: Math.min(body.max_tokens || 2000, 4000),
    messages: body.messages,
    stream: true
  };
  if (body.system) payload.system = body.system;

  const payloadStr = JSON.stringify(payload);

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      // Idle timeout between chunks. With streaming, chunks arrive every few
      // hundred ms, so this only fires if the connection genuinely stalls.
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    };

    const req = https.request(options, (res) => {
      let buffer = '';       // holds partial SSE lines between chunks
      let text = '';         // accumulated model output
      let stopReason = null;
      let usage = null;
      let apiError = null;

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();            // keep the last (possibly partial) line
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          let evt;
          try { evt = JSON.parse(jsonStr); } catch { continue; }

          if (evt.type === 'content_block_delta' && evt.delta) {
            if (typeof evt.delta.text === 'string') text += evt.delta.text;
          } else if (evt.type === 'message_delta') {
            if (evt.delta && evt.delta.stop_reason) stopReason = evt.delta.stop_reason;
            if (evt.usage) usage = evt.usage;
          } else if (evt.type === 'error') {
            apiError = evt.error || { message: 'Unknown API error' };
          }
        }
      });

      res.on('end', () => {
        if (apiError) {
          resolve({ statusCode: 200, headers: corsHeaders, body: JSON.stringify({ error: apiError }) });
          return;
        }
        // If the upstream returned a non-2xx, surface it as an error.
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = text || buffer || ('Upstream status ' + res.statusCode);
          try { const p = JSON.parse(msg); if (p.error) msg = p.error.message || msg; } catch {}
          resolve({ statusCode: 200, headers: corsHeaders, body: JSON.stringify({ error: { message: msg } }) });
          return;
        }
        // Reassemble the same non-streaming response shape the client expects:
        //   data.content[0].text
        resolve({
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            content: [{ type: 'text', text: text }],
            stop_reason: stopReason,
            usage: usage
          })
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 504, headers: corsHeaders, body: JSON.stringify({ error: { message: 'Connection stalled — please retry.' } }) });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: { message: err.message } }) });
    });

    req.write(payloadStr);
    req.end();
  });
};
