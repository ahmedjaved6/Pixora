// PIXORA Service Worker — Phase 1
// Strategy: Cache-first for static assets, network-first for dynamic

const CACHE_NAME = 'pixora-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network-First for same-origin
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Same-origin — Network-First (ensures updates are seen)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((fresh) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fresh.clone());
            return fresh;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CDN resources — Cache-First
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const fresh = await fetch(event.request);
        cache.put(event.request, fresh.clone());
        return fresh;
      })
    );
  }
});
