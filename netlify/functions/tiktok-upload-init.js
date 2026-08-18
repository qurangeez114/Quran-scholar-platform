const { json, withCookies, getAccessToken, tiktokFetch } = require('./_tiktok');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = await getAccessToken(event);
  if (!auth.connected) return withCookies(json(401, { error: 'TikTok is not connected.' }), auth.cookies);
  if (!(auth.scope || '').split(',').includes('video.upload')) {
    return withCookies(json(403, { error: 'TikTok video.upload permission was not granted. Reconnect TikTok after the app has that scope approved.' }), auth.cookies);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return withCookies(json(400, { error: 'Invalid JSON body.' }), auth.cookies);
  }

  const videoSize = Number(body.video_size);
  if (!Number.isSafeInteger(videoSize) || videoSize <= 0 || videoSize > 4 * 1024 * 1024 * 1024) {
    return withCookies(json(400, { error: 'Invalid video_size.' }), auth.cookies);
  }

  try {
    const data = await tiktokFetch(
      'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
      auth.accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1
          }
        })
      }
    );
    return withCookies(json(200, {
      upload_url: data.data?.upload_url || '',
      publish_id: data.data?.publish_id || ''
    }), auth.cookies);
  } catch (err) {
    return withCookies(json(err.statusCode || 502, {
      error: err.message,
      details: err.details?.error || null
    }), auth.cookies);
  }
};
