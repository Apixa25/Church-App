import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';

/**
 * Firebase Configuration for TheGathering App
 * Handles push notifications via Firebase Cloud Messaging (FCM)
 */

// VAPID Key for Web Push notifications - exported for use in other components
export const VAPID_KEY = 'BHjUaZ-epmkEbU-eh5ZZGY2OZdCOSY9PrpmKmICmpYkIXLUU3NpemNslMsdSVW6bgfQgTSFnTZ3vRKKeniAgaUg';

const firebaseConfig = {
  apiKey: "AIzaSyBy6maX_KVzYW4XNdBvFQPqMSW7p9Ua9lU",
  authDomain: "thegathering-42de7.firebaseapp.com",
  projectId: "thegathering-42de7",
  storageBucket: "thegathering-42de7.firebasestorage.app",
  messagingSenderId: "750913302010",
  appId: "1:750913302010:web:3ebd1ad0b3c31b9154c843",
  measurementId: "G-9X2CBD2KP6"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: Messaging | null = null;

/**
 * Initialize Firebase Messaging (only in browsers that support it)
 */
const initializeMessaging = async (): Promise<Messaging | null> => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      console.log('Firebase Messaging initialized successfully');
      return messaging;
    } else {
      console.warn('Firebase Messaging is not supported in this browser');
      return null;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

/**
 * Request notification permission and get FCM token
 * @returns FCM token string or null if permission denied
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Initialize messaging if not already done
    if (!messaging) {
      await initializeMessaging();
    }

    if (!messaging) {
      console.error('Firebase Messaging not available');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('FCM token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }

  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

/**
 * Setup foreground message listener
 * Handles notifications when the app is open
 */
export const setupForegroundMessageListener = (
  callback: (payload: any) => void
): (() => void) | null => {
  if (!messaging) {
    console.warn('Cannot setup message listener: messaging not initialized');
    return null;
  }

  const unsubscribe = onMessage(messaging, (payload: any) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });

  return unsubscribe;
};

/**
 * Get current FCM token (if already granted permission)
 */
export const getCurrentToken = async (): Promise<string | null> => {
  try {
    if (Notification.permission !== 'granted') {
      return null;
    }

    if (!messaging) {
      await initializeMessaging();
    }

    if (!messaging) {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    return token || null;
  } catch (error) {
    console.error('Error getting current token:', error);
    return null;
  }
};

export { app, messaging };
