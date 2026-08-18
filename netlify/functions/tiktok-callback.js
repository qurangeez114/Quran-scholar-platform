const { parseCookies, cookie, json, getConfig, safeReturn, tokenRequest, tokenCookies } = require('./_tiktok');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const c = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  const q = event.queryStringParameters || {};
  const returnTo = safeReturn(c.tt_return || '/');
  if (!q.state || !c.tt_state || q.state !== c.tt_state) {
    return json(400, { error: 'TikTok authorization state check failed.' });
  }
  if (q.error) {
    const target = new URL(returnTo, 'https://quranhikma.com');
    target.searchParams.set('tiktok', 'error');
    target.searchParams.set('reason', q.error_description || q.error);
    return {
      statusCode: 302,
      headers: { Location: target.pathname + target.search + target.hash, 'Cache-Control': 'no-store' },
      multiValueHeaders: { 'Set-Cookie': [cookie('tt_state','',0), cookie('tt_return','',0)] },
      body: ''
    };
  }
  if (!q.code) return json(400, { error: 'Missing TikTok authorization code.' });
  try {
    const { redirectUri } = getConfig();
    const data = await tokenRequest({
      code: q.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });
    const target = new URL(returnTo, 'https://quranhikma.com');
    target.searchParams.set('tiktok', 'connected');
    return {
      statusCode: 302,
      headers: {
        Location: target.pathname + target.search + target.hash,
        'Cache-Control': 'no-store'
      },
      multiValueHeaders: {
        'Set-Cookie': [...tokenCookies(data), cookie('tt_state','',0), cookie('tt_return','',0)]
      },
      body: ''
    };
  } catch (err) {
    const target = new URL(returnTo, 'https://quranhikma.com');
    target.searchParams.set('tiktok', 'error');
    target.searchParams.set('reason', err.message || 'Token exchange failed');
    return {
      statusCode: 302,
      headers: { Location: target.pathname + target.search + target.hash, 'Cache-Control': 'no-store' },
      multiValueHeaders: { 'Set-Cookie': [cookie('tt_state','',0), cookie('tt_return','',0)] },
      body: ''
    };
  }
};
