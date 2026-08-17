const { json, withCookies, getAccessToken, tiktokFetch } = require('./_tiktok');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const auth = await getAccessToken(event);
  if (!auth.connected) return withCookies(json(401, { error: 'TikTok is not connected.' }), auth.cookies);
  const publishId = event.queryStringParameters?.publish_id;
  if (!publishId || publishId.length > 300) {
    return withCookies(json(400, { error: 'Missing publish_id.' }), auth.cookies);
  }
  try {
    const data = await tiktokFetch(
      'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      auth.accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ publish_id: publishId })
      }
    );
    return withCookies(json(200, data.data || {}), auth.cookies);
  } catch (err) {
    return withCookies(json(err.statusCode || 502, {
      error: err.message,
      details: err.details?.error || null
    }), auth.cookies);
  }
};
