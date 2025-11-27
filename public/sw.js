// sw.js

// Define a unique name for the cache.
// IMPORTANT: Change this version number every time you update the app files.
const CACHE_NAME = 'smart-kido-cache-v1.0.1';

// A minimal list of files to cache on installation for the app to work offline.
const urlsToCache = [
  '/', // Represents the main index.html file
  '/manifest.json' // The Progressive Web App manifest
];

// Event listener for the 'install' event.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell...');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Event listener for the 'activate' event for cleaning up old caches.
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

// Event listener for the 'fetch' event to handle network requests.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  // "Cache, falling back to network" strategy.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the request is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not, fetch from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Check for a valid response.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response because it's a stream that can only be consumed once.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Add the new response to the cache.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetching failed:', error);
          throw error;
        });
      })
  );
});
