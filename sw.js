/* Imposter Word Game — Service Worker */
const CACHE = 'iwg-v2';
const ASSETS = [
  './index.html',
  './style.css',
  './script.js',
  './words.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* Install — cache assets individually so one failure doesn't kill everything */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

/* Activate — remove old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Fetch — cache-first, fall back to network */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
