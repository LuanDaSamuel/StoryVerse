const CACHE_NAME = 'storyverse-cache-v1';
// Essential files for the app shell to work offline.
// Other resources (like CDN scripts) will be cached on demand.
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx', // In this dev environment, this is the main script.
  '/icon.svg',
  '/manifest.json'
];

// Install event: precache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event: clean up old, unused caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: implement a cache-first strategy.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to get the resource from the cache first.
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If the resource is not in the cache, fetch it from the network.
      try {
        const fetchResponse = await fetch(event.request);
        
        // If the fetch was successful, cache the new resource for future offline use.
        // We only cache GET requests.
        if (fetchResponse && fetchResponse.status === 200 && event.request.method === 'GET') {
          cache.put(event.request, fetchResponse.clone());
        }
        
        return fetchResponse;
      } catch (e) {
        // The network request failed, and it wasn't in the cache.
        console.error('Fetch failed; returning offline fallback if available.', e);
        // Optionally, you could return a custom offline fallback page here for navigation requests.
      }
    })
  );
});
