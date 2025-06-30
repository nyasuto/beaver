---
layout: null
---

// Beaver Knowledge Base Service Worker
// Optimized for Japanese content caching

const CACHE_NAME = 'beaver-kb-v1';
const urlsToCache = [
  '{{ "/" | relative_url }}',
  '{{ "/assets/css/style.css" | relative_url }}',
  '{{ "/beaver-Development-Strategy" | relative_url }}',
  '{{ "/beaver-Issues-Summary" | relative_url }}',
  '{{ "/beaver-Learning-Path" | relative_url }}',
  '{{ "/beaver-Troubleshooting-Guide" | relative_url }}',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('🦫 Beaver cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🦫 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});