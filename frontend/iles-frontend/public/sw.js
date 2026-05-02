/* Simple service worker to surface push messages for development */
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'ILES', body: event.data ? event.data.text() : 'You have a notification' };
  }

  const title = data.title || 'ILES Notification';
  const body = data.body || data.message || 'You have a new notification';
  const options = {
    body,
    data: data,
    tag: data.tag || 'iles-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(clientList) {
    if (clientList.length > 0) {
      return clientList[0].focus();
    }
    return clients.openWindow('/app/notifications');
  }));
});
