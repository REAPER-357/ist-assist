// IST Assist service worker
// - Pages (index.html / navigation): NETWORK-FIRST, so you always get the latest version when online.
//   Falls back to the saved copy when offline.
// - Everything else (icons, Tailwind, manifest): cache-first for speed and offline use.
const CACHE = 'ist-assist-v3';
const CORE = ['./', 'index.html', 'manifest.json', 'icon.png', 'small-icon.png'];
const TAILWIND = 'https://cdn.tailwindcss.com';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(
        CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})).concat([
          fetch(TAILWIND, { mode: 'no-cors' }).then(r => c.put(TAILWIND, r)).catch(() => {})
        ])
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' ||
    (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));

  if (isPage) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match('index.html'))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit =>
      hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});
