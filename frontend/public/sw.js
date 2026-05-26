// Service Worker for MESSOB Fleet Management PWA
const CACHE_NAME = 'messob-fleet-v2'; // Increment version to force update
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const urlsToCache = [
  '/',
  '/index.html',
];

// Install event - cache resources (skip in development)
self.addEventListener('install', (event) => {
  if (!isDevelopment) {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Opened cache');
          return cache.addAll(urlsToCache);
        })
    );
  }
  self.skipWaiting();
});

// Fetch event - serve from network first in development, cache in production
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip caching in development mode
  if (isDevelopment) {
    // For navigation requests (HTML pages), always return index.html for React Router
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch('/index.html').catch(() => caches.match('/index.html'))
      );
      return;
    }
    
    // For all other requests, fetch from network
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
    );
    return;
  }

  // Skip caching for non-GET requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip caching for API requests
  if (url.pathname.includes('/odoo/') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests (HTML pages), return index.html for React Router
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch('/index.html')
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('/index.html', responseToCache);
          });
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Production: Cache-first strategy for assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // If fetch fails, return a fallback
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['messob-fleet-v2'];
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
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MESSOB Fleet';
  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-fuel-logs') {
    event.waitUntil(syncFuelLogs());
  }
  if (event.tag === 'sync-trip-status') {
    event.waitUntil(syncTripStatus());
  }
});

// Sync fuel logs when back online
async function syncFuelLogs() {
  try {
    const cache = await caches.open('fuel-logs-pending');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const data = await response.json();
      
      // Send to server
      await fetch('/odoo/api/fuel/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      // Remove from cache after successful sync
      await cache.delete(request);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Sync trip status when back online
async function syncTripStatus() {
  try {
    const cache = await caches.open('trip-status-pending');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const data = await response.json();
      
      // Send to server
      await fetch('/odoo/api/trip/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      // Remove from cache after successful sync
      await cache.delete(request);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
