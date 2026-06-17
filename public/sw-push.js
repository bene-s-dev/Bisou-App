self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        badge: '/badge.png', // Transparent white silhouette for Android status bar
        data: {
          url: data.url || '/'
        }
      };
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error('Error showing push notification:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || '/';
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      // Check if there is already a window/tab open with the same target URL or just the app open
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Focus the client if it's on our app origin
        if (new URL(client.url).origin === self.location.origin) {
          matchingClient = client;
          break;
        }
      }

      if (matchingClient) {
        matchingClient.navigate(urlToOpen).catch(() => {});
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
