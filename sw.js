// v6 — force cache refresh for verse loading fixes
const CACHE_NAME = 'quran-hikma-v6';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for everything — ensures latest code always loads
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
