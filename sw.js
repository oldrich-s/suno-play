const CACHE_NAME = 'suno-player-v1';

const APP_SHELL = [
    '/suno-play/',
    '/suno-play/index.html',
    '/suno-play/manifest.json',
    '/suno-play/icon-192.png',
    '/suno-play/icon-512.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

// Install — cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network-first for API calls, cache-first for app shell
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API calls (Suno, etc.) — always go to network, never cache
    if (url.hostname.includes('suno.com') || url.hostname.includes('cdn.audiopipe.suno.ai')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // App shell — cache first, then network
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cache successful responses for same-origin and CDN
                if (response.ok && (url.origin === self.location.origin || url.hostname.includes('cdn.jsdelivr.net'))) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback — return cached index.html for navigation
            if (event.request.mode === 'navigate') {
                return caches.match('/suno-play/index.html');
            }
        })
    );
});
