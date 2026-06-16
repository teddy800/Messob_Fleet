// MESSOB Fleet Management - Service Worker
// Implements offline functionality and background sync for PWA

const CACHE_NAME = 'messob-fleet-v1.1.1';
const RUNTIME_CACHE = 'messob-runtime-v1.1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first, fallback to cache
  if (url.pathname.startsWith('/messob/api/') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache GET requests (POST requests cannot be cached)
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            }).catch((err) => {
              console.warn('[SW] Failed to cache API response:', err);
            });
          }
          return response;
        })
        .catch(() => {
          // Only try to serve cached response for GET requests
          if (request.method === 'GET') {
            return caches.match(request)
              .then((cachedResponse) => {
                if (cachedResponse) {
                  console.log('[SW] Serving cached API response:', request.url);
                  return cachedResponse;
                }
                // Return offline response for failed API requests
                return new Response(JSON.stringify({ 
                  error: 'Offline', 
                  message: 'No network connection available' 
                }), {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                });
              });
          }
          // For POST/PUT/DELETE, return offline error
          return new Response(JSON.stringify({ 
            error: 'Offline', 
            message: 'No network connection available' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, update cache in background (only for GET)
          if (request.method === 'GET') {
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                }).catch(() => {}); // Ignore cache errors
              }
            }).catch(() => {}); // Ignore network errors
          }
          
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Only cache GET requests for static assets
            if (response.ok && request.method === 'GET') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              }).catch((err) => {
                console.warn('[SW] Failed to cache static asset:', err);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Background Sync - sync trip requests when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-trip-requests') {
    event.waitUntil(syncTripRequests());
  }
  
  if (event.tag === 'sync-gps-positions') {
    event.waitUntil(syncGPSPositions());
  }
});

// Push Notifications - receive maintenance alerts, trip updates
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MESSOB Fleet Management';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click - handle notification actions
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Helper: Sync trip requests
async function syncTripRequests() {
  try {
    const cache = await caches.open('messob-pending-requests');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Synced trip request:', request.url);
        }
      } catch (error) {
        console.error('[SW] Failed to sync trip request:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// Helper: Sync GPS positions
async function syncGPSPositions() {
  try {
    const cache = await caches.open('messob-pending-gps');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Synced GPS position:', request.url);
        }
      } catch (error) {
        console.error('[SW] Failed to sync GPS position:', error);
      }
    }
  } catch (error) {
    console.error('[SW] GPS sync failed:', error);
    throw error;
  }
}

// Message handler - receive commands from app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
