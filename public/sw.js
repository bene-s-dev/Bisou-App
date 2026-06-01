// Activate new service worker immediately without waiting for all tabs to close
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// Import push notifications handler
importScripts('/sw-push.js');
