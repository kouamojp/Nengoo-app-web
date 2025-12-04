const CACHE_NAME = 'nengoo-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/catalog',
  '/cart',
  '/login',
  '/seller',
  // Cache des images importantes
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Cache des polices et assets essentiels
  '/static/media/',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Erreur lors du cache:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression du cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  // Stratégie Cache First pour les assets statiques
  if (event.request.url.includes('/static/') || 
      event.request.url.includes('/icons/') ||
      event.request.url.includes('/manifest.json')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
    return; // Important: exit early for static assets
  }

  // Stratégie Network First pour les pages et API
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache GET requests
        if (event.request.method === 'GET' && response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response; // Always return the network response if successful
      })
      .catch(async (error) => { // Catch network errors
        // Try to get from cache if network fails
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fallback for navigation requests (e.g., if offline and page not cached)
        if (event.request.mode === 'navigate') {
          const offlinePage = await caches.match('/'); // Assume '/' is the offline fallback
          if (offlinePage) {
            return offlinePage;
          }
        }
        
        // If neither network nor cache worked, and it's not a navigation request with a fallback,
        // rethrow the error. This will propagate the error back to the page.
        return Promise.reject(error);
      })
  );
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Ici on pourrait synchroniser les données en attente
      console.log('Synchronisation en arrière-plan')
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification Nengoo',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Nengoo', options)
  );
});

// Click sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});