// Firebase Cloud Messaging Service Worker
// This handles push notifications when the app is in the background or closed

// Import Firebase scripts (using importScripts for service workers)
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy6maX_KVzYW4XNdBvFQPqMSW7p9Ua9lU",
  authDomain: "thegathering-42de7.firebaseapp.com",
  projectId: "thegathering-42de7",
  storageBucket: "thegathering-42de7.firebasestorage.app",
  messagingSenderId: "750913302010",
  appId: "1:750913302010:web:3ebd1ad0b3c31b9154c843",
  measurementId: "G-9X2CBD2KP6"
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
// We use data-only FCM messages (no "notification" payload) so that this
// handler is the SINGLE place that shows the notification. If FCM messages
// contained a "notification" field, the browser would auto-display one AND
// this handler would fire, causing duplicate notifications.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const data = payload.data || {};

  // Title and body come from the data payload (data-only messages)
  const notificationTitle = data.title || payload.notification?.title || 'TheGathering';
  const notificationBody = data.body || payload.notification?.body || 'You have a new notification';

  // Build a unique tag per message to prevent duplicate notifications
  const tag = (data.type && data.messageId)
    ? data.type + '_' + data.messageId
    : data.type || 'default';

  const notificationOptions = {
    body: notificationBody,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: tag,
    renotify: true,
    data: data,
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — opens the app and navigates to the right page
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);

  event.notification.close();

  // Determine the URL to open based on notification data
  let urlToOpen = '/dashboard';

  if (event.notification.data) {
    const data = event.notification.data;
    const type = data.type;

    if (type === 'prayer_request' && data.prayerId) {
      urlToOpen = '/prayer/' + data.prayerId;
    } else if (type === 'post_like' || type === 'post_comment') {
      urlToOpen = data.actionUrl || '/feed';
    } else if (type === 'event_reminder' && data.eventId) {
      urlToOpen = '/events/' + data.eventId;
    } else if (type === 'chat_message') {
      // Backend sends both chatId and groupId — use either one
      var chatTarget = data.chatId || data.groupId;
      if (chatTarget) {
        urlToOpen = '/chats/' + chatTarget;
      } else {
        urlToOpen = '/chats';
      }
    } else if (type === 'announcement') {
      urlToOpen = '/announcements';
    } else if (data.actionUrl) {
      urlToOpen = data.actionUrl;
    }
  }

  // Build the full URL from the service worker origin
  var fullUrl = new URL(urlToOpen, self.location.origin).href;

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if app is already open in a tab
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }

        // No existing window — open a new one
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

console.log('[firebase-messaging-sw.js] Service Worker loaded and ready');
