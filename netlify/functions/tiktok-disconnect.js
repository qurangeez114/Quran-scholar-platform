const { parseCookies, clearTikTokCookies, json, withCookies, getConfig } = require('./_tiktok');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const c = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  try {
    if (c.tt_access) {
      const { clientKey, clientSecret } = getConfig();
      await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          token: c.tt_access
        })
      });
    }
  } catch (_) {}
  return withCookies(json(200, { connected: false }), clearTikTokCookies());
};
