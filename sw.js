// FieldSales Pro — offline-capable PWA service worker (v6, GitHub Pages)
const CACHE = 'wsr_v6';
const PRECACHE = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon.svg', 'logo.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      // Force every open client to reload so a redeployed fix reaches the device.
      const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      all.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for the app shell (HTML) so redeploys always reach the phone.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const c = await caches.open(CACHE);
          c.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          return (await caches.match(req)) || caches.match('index.html');
        }
      })()
    );
    return;
  }

  // Cache-first for other static assets.
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).catch(() => caches.match('index.html')))
  );
});
