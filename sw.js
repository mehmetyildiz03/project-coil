const CACHE = 'project-coil-pwa-v6';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=6',
  './game.js?v=6',
  './manifest.webmanifest',
  './icon.svg',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
      if (fallbackUrl) cache.put(fallbackUrl, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (fallbackUrl ? await caches.match(fallbackUrl) : undefined);
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCoreAsset = isSameOrigin && (
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/style.css') ||
    url.pathname.endsWith('/game.js') ||
    url.pathname.endsWith('/manifest.webmanifest')
  );

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  if (isCoreAsset) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});
