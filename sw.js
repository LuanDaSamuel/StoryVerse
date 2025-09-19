// A modern, robust service worker for StoryVerse using a stale-while-revalidate strategy.

// Incrementing the cache name is crucial for deploying updates.
const CACHE_NAME = 'storyverse-cache-v3';

// These are the essential files that make up the "app shell".
// They are cached on install, making the app load instantly on subsequent visits, even offline.
// We are only caching the bare essentials here to make the installation more robust.
// Other assets (like the main JS file) will be cached on-demand by the fetch handler.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  // Note: The main script ('/index.tsx') is intentionally omitted.
  // It will be cached by the 'fetch' event handler when the page requests it.
  // This avoids installation failures if the script path is dynamic or hard to predict.
];

/**
 * INSTALL:
 * This event is fired when the service worker is first installed.
 * We open our cache and pre-cache the app shell resources.
 */
self.addEventListener('install', (event) => {
  // skipWaiting() forces the waiting service worker to become the active service worker.
  // This is good for single-page apps where you want the update to happen right away.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * ACTIVATE:
 * This event is fired when the service worker becomes active.
 * We use this opportunity to clean up old, unused caches to save space.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If a cache's name is not our current CACHE_NAME, it's an old cache. Delete it.
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all open clients (pages) immediately, without needing a reload.
      return self.clients.claim();
    })
  );
});

/**
 * FETCH:
 * This event intercepts all network requests from the app.
 * We implement different strategies for different types of requests.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // We only want to handle GET requests.
  if (request.method !== 'GET') {
    return;
  }

  // It's critical to NOT cache requests to Google's APIs for authentication and data.
  // We let the browser handle these as normal network requests.
  const isGoogleApiRequest = request.url.startsWith('https://accounts.google.com') ||
                             request.url.startsWith('https://apis.google.com') ||
                             request.url.startsWith('https://www.googleapis.com');
  
  if (isGoogleApiRequest) {
    // Do not intercept. Let the request pass through to the network.
    return;
  }
  
  // For navigation requests (to HTML pages), use a network-first strategy.
  // This ensures users always get the latest version of the main page if they are online.
  // The cached version is used as a fallback for offline access.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate Strategy for all other assets (JS, CSS, images, fonts etc.):
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Check if we have a cached response for this request.
      const cachedResponse = await cache.match(request);

      // 2. Start a fetch request to the network to get the latest version.
      const fetchPromise = fetch(request).then(networkResponse => {
        // If the fetch is successful, update the cache with the new response.
        // We have to clone the response because it's a stream and can only be consumed once.
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }).catch(err => {
        // If the network request fails and we don't have a cached response,
        // the promise will reject, and the user will see a network error.
        // If we do have a cached response, it would have already been returned.
        console.warn(`[ServiceWorker] Fetch failed for ${request.url}. Using cache if available.`);
        // Re-throwing the error is not needed here as the logic handles the offline case.
      });

      // 3. Return the cached response immediately if it exists.
      //    If not, wait for the network fetch to complete.
      //    This makes the app feel instant on subsequent loads.
      return cachedResponse || fetchPromise;
    })
  );
});
