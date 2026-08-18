const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function cookie(name, value, maxAge, opts = {}) {
  const bits = [`${name}=${encodeURIComponent(value || '')}`, 'Path=/', 'Secure', 'SameSite=Lax'];
  if (opts.httpOnly !== false) bits.push('HttpOnly');
  if (typeof maxAge === 'number') bits.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return bits.join('; ');
}

function clearTikTokCookies() {
  return ['tt_access','tt_refresh','tt_exp','tt_refresh_exp','tt_scope','tt_open','tt_state','tt_return']
    .map(name => cookie(name, '', 0));
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body)
  };
}

function getConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://quranhikma.com/api/tiktok/callback';
  if (!clientKey || !clientSecret) {
    const err = new Error('TikTok integration is not configured.');
    err.code = 'TIKTOK_NOT_CONFIGURED';
    throw err;
  }
  return { clientKey, clientSecret, redirectUri };
}

function safeReturn(value) {
  if (!value || typeof value !== 'string') return '/';
  try {
    const u = new URL(value, 'https://quranhikma.com');
    if (u.origin !== 'https://quranhikma.com') return '/';
    return u.pathname + u.search + u.hash;
  } catch (_) {
    return value.startsWith('/') && !value.startsWith('//') ? value : '/';
  }
}

async function tokenRequest(params) {
  const { clientKey, clientSecret } = getConfig();
  const body = new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...params });
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(data.error_description || data.message || 'TikTok token request failed.');
    err.statusCode = res.status || 502;
    err.details = data;
    throw err;
  }
  return data;
}

function tokenCookies(data) {
  const now = Math.floor(Date.now() / 1000);
  const accessMax = Number(data.expires_in || 86400);
  const refreshMax = Number(data.refresh_expires_in || 31536000);
  return [
    cookie('tt_access', data.access_token, accessMax),
    cookie('tt_refresh', data.refresh_token, refreshMax),
    cookie('tt_exp', String(now + accessMax), accessMax),
    cookie('tt_refresh_exp', String(now + refreshMax), refreshMax),
    cookie('tt_scope', data.scope || '', refreshMax),
    cookie('tt_open', data.open_id || '', refreshMax)
  ];
}

async function getAccessToken(event) {
  const c = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(c.tt_exp || 0);
  if (c.tt_access && exp > now + 60) {
    return { connected: true, accessToken: c.tt_access, scope: c.tt_scope || '', openId: c.tt_open || '', cookies: [] };
  }
  if (!c.tt_refresh) return { connected: false, cookies: clearTikTokCookies() };
  try {
    const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: c.tt_refresh });
    return {
      connected: true,
      accessToken: data.access_token,
      scope: data.scope || '',
      openId: data.open_id || '',
      cookies: tokenCookies(data)
    };
  } catch (err) {
    return { connected: false, cookies: clearTikTokCookies(), error: err };
  }
}


function withCookies(response, cookies) {
  if (Array.isArray(cookies) && cookies.length) {
    response.multiValueHeaders = { ...(response.multiValueHeaders || {}), 'Set-Cookie': cookies };
  }
  return response;
}

async function tiktokFetch(url, accessToken, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.error && data.error.code && data.error.code !== 'ok')) {
    const err = new Error(data.error?.message || data.message || `TikTok API request failed (${res.status}).`);
    err.statusCode = res.status || 502;
    err.details = data;
    throw err;
  }
  return data;
}

module.exports = {
  parseCookies, cookie, clearTikTokCookies, json, withCookies, getConfig, safeReturn,
  tokenRequest, tokenCookies, getAccessToken, tiktokFetch
};
