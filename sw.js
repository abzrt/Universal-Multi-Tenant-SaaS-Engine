// Ticky Passport Scanner Service Worker
const CACHE_NAME = 'ticky-pass-scanner-v1';
const ASSETS_TO_CACHE = [
  '/scan.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network first, fallback to cache for scanner app
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
