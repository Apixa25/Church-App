// Notification Service for Church App
import api from './api';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  prayerRequests: boolean;
  announcements: boolean;
  comments: boolean;
  likes: boolean;
  follows: boolean;
  events: boolean;
  eventReminders?: boolean;
  mentions?: boolean;
  directMessages?: boolean;
  systemUpdates?: boolean;
  weeklyDigest?: boolean;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}

// Get user notification preferences
export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  try {
    const response = await api.get(`/notifications/preferences/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    // Return default preferences
    return {
      pushEnabled: true,
      emailEnabled: true,
      prayerRequests: true,
      announcements: true,
      comments: true,
      likes: false,
      follows: true,
      events: true
    };
  }
};

// Update user notification preferences
export const updateNotificationPreferences = async (
  userId: string, 
  preferences: NotificationPreferences
): Promise<void> => {
  try {
    await api.put(`/notifications/preferences/${userId}`, preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (
  userId: string,
  subscription: PushSubscription
): Promise<NotificationSubscription> => {
  try {
    const response = await api.post(`/notifications/subscribe/${userId}`, {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.getKey('p256dh') ? 
          btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))) : '',
        auth: subscription.getKey('auth') ? 
          btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))) : ''
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (
  userId: string,
  subscriptionId: string
): Promise<void> => {
  try {
    await api.delete(`/notifications/unsubscribe/${userId}/${subscriptionId}`);
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
};

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

// Get push subscription
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

// Create push subscription
export const createPushSubscription = async (vapidPublicKey: string): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    return subscription;
  } catch (error) {
    console.error('Error creating push subscription:', error);
    return null;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Send test notification
export const sendTestNotification = async (userId?: string): Promise<void> => {
  try {
    const endpoint = userId ? `/notifications/test/${userId}` : '/notifications/test';
    await api.post(endpoint);
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

// Export aliases for backward compatibility
export const subscribeToNotifications = subscribeToPushNotifications;
export const unsubscribeFromNotifications = unsubscribeFromPushNotifications;

export default {
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushNotificationSupported,
  requestNotificationPermission,
  getPushSubscription,
  createPushSubscription,
  sendTestNotification
};
