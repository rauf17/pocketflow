/* PocketFlow service worker — offline shell + notification handling.
 * No data is cached here: financial data lives in localStorage on the device.
 * Bump VERSION to invalidate old caches. */
const VERSION = 'pf-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache the AI endpoint or anything dynamic on the server.
  if (url.pathname.startsWith('/api/')) return;

  // Pages: network first so updates show up, cache as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match('/dashboard')) ||
            (await cache.match('/')) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Hashed build assets and icons never change: cache first.
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Everything else same-origin (RSC payloads, etc.): stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      const hit = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => hit || Response.error());
      return hit || network;
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = all.find((c) => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow('/dashboard');
    })(),
  );
});
