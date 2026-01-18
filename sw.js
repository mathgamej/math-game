// Service Worker with Version-Based Cache Management
// Increment VERSION whenever you want to force an update
const VERSION = 'v1.5.0';
const CACHE_NAME = `math-game-${VERSION}`;

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install event: Cache all assets with new version
self.addEventListener('install', (event) => {
    console.log(`[SW ${VERSION}] Installing...`);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW ${VERSION}] Caching assets`);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log(`[SW ${VERSION}] Installation complete`);
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log(`[SW ${VERSION}] Activating...`);

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Delete all caches except the current version
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(`[SW ${VERSION}] Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log(`[SW ${VERSION}] Activation complete`);
                // Take control of all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch event: Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response before caching
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // If not in cache, return a basic offline page
                        return new Response('Offline - Please check your connection', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log(`[SW ${VERSION}] Skip waiting requested`);
        self.skipWaiting();
    }
});
