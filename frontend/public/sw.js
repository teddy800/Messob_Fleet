// MESSOB Fleet Management - Service Worker
// Implements offline functionality and background sync for PWA

const CACHE_NAME = 'messob-fleet-v1.2.0';
const RUNTIME_CACHE = 'messob-runtime-v1.2';
const OFFLINE_CACHE = 'messob-offline-v1.2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg'
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
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== OFFLINE_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Smart caching strategy with offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (except for critical CDN resources)
  if (url.origin !== location.origin && !isCriticalCDN(url.href)) {
    return;
  }

  // API requests - Network first with offline fallback and queue
  if (url.pathname.startsWith('/messob/api/') || url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Static assets - Cache first with network update (stale-while-revalidate)
  event.respondWith(handleStaticAsset(request));
});

// Helper: Check if URL is a critical CDN resource
function isCriticalCDN(url) {
  const criticalCDNs = [
    'unpkg.com/leaflet',  // Leaflet maps (critical for tracking)
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ];
  return criticalCDNs.some(cdn => url.includes(cdn));
}

// Helper: Handle API requests with offline queue
async function handleAPIRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful GET requests
    if (response.ok && request.method === 'GET') {
      const responseClone = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, responseClone);
      }).catch(() => {});
    }
    
    return response;
  } catch (error) {
    // Network failed - check if we have cached response for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving cached API response:', request.url);
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE requests when offline, queue for background sync
    if (request.method !== 'GET') {
      await queueRequest(request);
      return new Response(JSON.stringify({ 
        success: true,
        offline: true,
        message: 'Request queued for sync when online',
        queued: true
      }), {
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return offline error for failed GET requests
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'No network connection available',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper: Handle static assets with stale-while-revalidate strategy
async function handleStaticAsset(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  
  // Return cached response immediately (if available)
  if (cachedResponse) {
    // Update cache in background for GET requests (stale-while-revalidate)
    if (request.method === 'GET') {
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
    
    return cachedResponse;
  }

  // Not in cache - fetch from network
  try {
    const response = await fetch(request);
    
    // Cache successful GET requests
    if (response.ok && request.method === 'GET') {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseClone);
      }).catch(() => {});
    }
    
    return response;
  } catch (error) {
    // Network failed - return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    // Return generic offline response
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Helper: Queue failed requests for background sync
async function queueRequest(request) {
  try {
    const cache = await caches.open('messob-pending-requests');
    const requestClone = request.clone();
    
    // Store request with timestamp
    const queuedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: await request.text(),
      mode: 'same-origin',
      credentials: request.credentials,
      redirect: 'follow'
    });
    
    await cache.put(queuedRequest, new Response(JSON.stringify({
      timestamp: Date.now(),
      method: request.method,
      url: request.url
    })));
    
    console.log('[SW] Request queued for sync:', request.url);
    
    // Register background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-trip-requests');
    }
  } catch (error) {
    console.error('[SW] Failed to queue request:', error);
  }
}

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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
