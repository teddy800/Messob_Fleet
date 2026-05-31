// ============================================================================
// MESSOB Fleet Management System
// Service Worker for Progressive Web App (PWA)
// Enables offline functionality and push notifications for Driver Mobile App
// ============================================================================

const CACHE_NAME = 'messob-fms-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Assets to cache for offline functionality
const ASSETS_TO_CACHE = [
  '/',
  '/dashboard/driver/mobile',
  '/offline.html',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.error('[Service Worker] Cache addAll failed:', error);
      });
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API calls - always fetch fresh
  if (event.request.url.includes('/api/') || event.request.url.includes('/odoo/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }
      
      // Fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response
        const responseToCache = response.clone();
        
        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Network failed, return offline page
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from MESSOB Fleet',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'messob-notification',
    requireInteraction: false,
  };
  
  event.waitUntil(
    self.registration.showNotification('MESSOB Fleet', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/dashboard/driver/mobile')
  );
});

// Background sync event (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-trip-status') {
    event.waitUntil(syncTripStatus());
  }
});

// Sync trip status updates when back online
async function syncTripStatus() {
  try {
    // Get pending updates from IndexedDB or localStorage
    const pendingUpdates = await getPendingUpdates();
    
    for (const update of pendingUpdates) {
      await fetch('/api/trip/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
    }
    
    // Clear pending updates
    await clearPendingUpdates();
    
    console.log('[Service Worker] Trip status synced successfully');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Helper functions (implement based on your storage strategy)
async function getPendingUpdates() {
  // Implement retrieval from IndexedDB or localStorage
  return [];
}

async function clearPendingUpdates() {
  // Implement clearing from IndexedDB or localStorage
}

console.log('[Service Worker] Loaded successfully');
