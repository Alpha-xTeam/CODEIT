// Service Worker for CODEIT PWA - NO CACHE MODE
const CACHE_NAME = 'codeit-v1-no-cache';

// Install event - Do not cache anything
self.addEventListener('install', (event) => {
  console.log('Service Worker installed - NO CACHE MODE');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Fetch event - Always fetch from network, no caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request.clone())
      .then((response) => {
        // Always return fresh response from network
        return response;
      })
      .catch((error) => {
        console.log('Fetch failed:', error);
        // Return a basic error response if network fails
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Activate event - Clear all existing caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync logic here
  return Promise.resolve();
}

// Push notifications (optional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/Logo/Code-it-Logo.png',
    badge: '/Logo/Code-it-Logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open CODEIT',
        icon: '/Logo/Code-it-Logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/Logo/Code-it-Logo.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('CODEIT', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
