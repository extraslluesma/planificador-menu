// ================================================================
// Service Worker — Planificador de Menú
// Permite instalar la app en el teléfono y usarla sin conexión.
// ================================================================

const CACHE_NAME = 'meal-planner-cache-v1';

// Archivos básicos a cachear. Si tu HTML tiene otro nombre, cámbialo aquí.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ===== INSTALACIÓN: guarda los archivos básicos en caché =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        // Si algún archivo no existe (p.ej. icon-512.png aún no subido),
        // no bloqueamos la instalación entera.
        console.warn('Service Worker: algunos assets no se pudieron cachear', err);
      });
    })
  );
  self.skipWaiting();
});

// ===== ACTIVACIÓN: limpia cachés antiguas de versiones previas =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ===== FETCH: sirve desde caché primero, y si no existe, va a la red =====
self.addEventListener('fetch', (event) => {
  // Solo gestionamos peticiones GET (evita interferir con APIs externas tipo CDN POST, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Guardamos en caché una copia de los recursos del mismo origen
          // (no intentamos cachear CDNs externos como cdnjs/jsdelivr para evitar errores CORS)
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Sin conexión y sin caché disponible: si era el HTML principal,
          // devolvemos la página principal cacheada como fallback.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
