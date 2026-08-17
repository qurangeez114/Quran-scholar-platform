const crypto = require('crypto');
const { cookie, json, getConfig, safeReturn } = require('./_tiktok');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const { clientKey, redirectUri } = getConfig();
    const state = crypto.randomBytes(24).toString('hex');
    const returnTo = safeReturn(event.queryStringParameters?.return || '/');
    const scopes = process.env.TIKTOK_SCOPES || 'user.info.basic,video.upload';
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.set('client_key', clientKey);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('disable_auto_auth', '1');
    return {
      statusCode: 302,
      headers: {
        Location: url.toString(),
        'Cache-Control': 'no-store'
      },
      multiValueHeaders: {
        'Set-Cookie': [cookie('tt_state', state, 600), cookie('tt_return', returnTo, 600)]
      },
      body: ''
    };
  } catch (err) {
    return json(err.code === 'TIKTOK_NOT_CONFIGURED' ? 503 : 500, { error: err.message });
  }
};
