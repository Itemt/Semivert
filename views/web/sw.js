/**
 * sw.js - Service Worker de Semivert
 * Habilita modo offline, PWA e instalación en dispositivos móviles y de escritorio.
 */

const CACHE_NAME = 'semivert-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './js/app.js',
  './js/config.js',
  './js/controllers/appController.js',
  './js/models/state.js',
  './js/views/mainView.js',
  './js/views/loginView.js',
  './js/views/homeView.js',
  './js/views/treeView.js',
  './js/views/mapView.js',
  './js/views/missionView.js',
  './js/views/academiaView.js',
  './js/views/rankingView.js',
  './js/views/perfilView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo interceptar peticiones GET del mismo origen
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // No interceptar peticiones a /api o auth si existieran
  if (request.url.includes('/auth/') || request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano actualizar caché (Stale-While-Revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback a index.html si es navegación
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
