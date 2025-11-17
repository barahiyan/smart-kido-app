// sw.js
const CACHE_NAME = 'smart-kido-cache-v30'; // Updated version to force refresh

// App shell files to cache on install.
// This list is simplified to be more robust. Caching only essentials ensures the SW installs successfully.
// Other assets will be cached by the 'fetch' event handler upon first visit.
const urlsToCache = [
  '/', // This serves index.html at the root
  '/manifest.json'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache. Caching app shell...');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Use a "Cache, falling back to network" strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return response from cache if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, fetch from the network
        return fetch(event.request).then(
          networkResponse => {
            // Check for a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Opaque responses are for cross-origin requests without CORS.
            // We don't want to cache them as we can't inspect them and they can take up a lot of space.
            if (networkResponse.type === 'opaque') {
                return networkResponse;
            }

            // Clone the response stream because it can only be read once
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetching failed:', error);
          // You could return a custom offline page here
          throw error;
        });
      })
  );
});