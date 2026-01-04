// 🚀 The Gathering - Service Worker
// This service worker enables offline capabilities and handles app updates gracefully
// Version is updated automatically on each build (cache busting)

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `gathering-cache-${CACHE_VERSION}`;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// ============================================
// INSTALL EVENT - Cache core assets
// ============================================
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Pre-caching core assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installed successfully');
        // Don't skip waiting here - let the app control when to activate
        // This allows the update notification to show
      })
      .catch((error) => {
        console.error('❌ Service Worker: Install failed', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches that don't match current version
              return cacheName.startsWith('gathering-cache-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated and controlling');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH EVENT - Smart caching strategy
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (API calls to different domains, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API calls - always go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip WebSocket upgrade requests
  if (request.headers.get('Upgrade') === 'websocket') {
    return;
  }

  // For navigation requests (HTML pages) - Network First
  // This ensures users always get the latest index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images) - Cache First, then Network
  // These files have content hashes in their names, so caching is safe
  if (
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version, but also fetch and update cache in background
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            }).catch(() => {}); // Ignore network errors for background update
            
            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(request).then((response) => {
            if (!response.ok) {
              return response;
            }
            
            // Cache the fetched response
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            
            return response;
          });
        })
    );
    return;
  }

  // For everything else - Network First with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) {
          return response;
        }
        
        // Cache successful responses
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request);
      })
  );
});

// ============================================
// MESSAGE EVENT - Handle skip waiting request
// ============================================
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker: Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏩ Service Worker: Skipping waiting, activating immediately');
    self.skipWaiting();
  }
  
  // Handle cache clear request (useful for debugging)
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ Service Worker: Clearing all caches');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('✅ Service Worker: All caches cleared');
    });
  }
});

// ============================================
// PERIODIC SYNC - Check for updates (if supported)
// ============================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-updates') {
    console.log('🔄 Service Worker: Checking for updates via periodic sync');
    event.waitUntil(
      self.registration.update()
    );
  }
});

console.log('📱 The Gathering Service Worker loaded');











