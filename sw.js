const CACHE = 'pixora-v4';
const SHELL = ['./', './index.html', './manifest.json'];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// Install: pre-cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting(); // activate immediately — no stale version on next visit
});

// Activate: clear all old caches and claim all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   CDN assets  → cache-first (fast repeat loads, offline capable)
//   App shell   → network-first, fall back to cache, then offline shell
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // CDN assets: cache-first
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Same-origin / app shell: network-first with offline fallback
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then(cached =>
          cached || caches.match('./index.html')
        )
      )
  );
});
