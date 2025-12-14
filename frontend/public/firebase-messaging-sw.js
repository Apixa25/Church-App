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
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Customize notification display
  const notificationTitle = payload.notification?.title || 'TheGathering';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: false, // Auto-dismiss after a while
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);

  event.notification.close();

  // Determine the URL to open based on notification data
  let urlToOpen = '/';

  if (event.notification.data) {
    const { type, postId, prayerId, eventId, chatId } = event.notification.data;

    // Route to appropriate page based on notification type
    if (type === 'prayer_request' && prayerId) {
      urlToOpen = `/prayer/${prayerId}`;
    } else if (type === 'post_like' || type === 'post_comment') {
      urlToOpen = `/feed`;
    } else if (type === 'event_reminder' && eventId) {
      urlToOpen = `/events/${eventId}`;
    } else if (type === 'chat_message' && chatId) {
      urlToOpen = `/chat/${chatId}`;
    } else if (type === 'announcement') {
      urlToOpen = '/announcements';
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the target URL and focus the window
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('[firebase-messaging-sw.js] Service Worker loaded and ready');
