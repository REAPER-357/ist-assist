// IST Assist service worker
// Pages: NETWORK-FIRST (latest version when online, saved copy offline).
// Static files: cache-first for same-origin and known CDNs only.
const CACHE = 'ist-assist-v4';
const CORE = ['./', 'index.html', 'manifest.json', 'icon.png', 'small-icon.png'];
const CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(
        CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})).concat([
          fetch('https://cdn.tailwindcss.com', { mode: 'no-cors' }).then(r => c.put('https://cdn.tailwindcss.com', r)).catch(() => {})
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
  const same = url.origin === location.origin;
  if (!same && !CDN.includes(url.hostname)) return; // APIs, Google, etc. pass through

  const isPage = req.mode === 'navigate' ||
    (same && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));

  if (isPage) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))
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
