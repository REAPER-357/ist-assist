const CACHE = 'ist-assist-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'icon.png', 'small-icon.png'];
const TAILWIND = 'https://cdn.tailwindcss.com';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(
        CORE.map(u => c.add(u).catch(() => {})).concat([
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
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('index.html'))
    )
  );
});
