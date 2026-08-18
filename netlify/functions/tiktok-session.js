const { json, withCookies, getAccessToken, tiktokFetch } = require('./_tiktok');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const auth = await getAccessToken(event);
  if (!auth.connected) return withCookies(json(200, { connected: false }), auth.cookies);
  let user = null;
  if ((auth.scope || '').split(',').includes('user.info.basic')) {
    try {
      const data = await tiktokFetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name',
        auth.accessToken
      );
      user = data.data?.user || null;
    } catch (_) {}
  }
  return withCookies(json(200, { connected: true, scope: auth.scope, user }), auth.cookies);
};
