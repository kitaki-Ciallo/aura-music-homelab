// Aura Music - Service Worker
// Minimal SW to satisfy PWA installability requirements

const CACHE_NAME = 'aura-music-v1';

// Only cache essential app shell resources
const APP_SHELL = [
    './',
    './index.html',
];

self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
});

self.addEventListener('activate', (event) => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    // Claim all clients immediately
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Network-first strategy: always try network, fall back to cache
    // This ensures users always get fresh content when online
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful GET responses for offline fallback
                if (event.request.method === 'GET' && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline: try to serve from cache
                return caches.match(event.request);
            })
    );
});
