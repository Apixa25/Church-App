import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentToken } from '../config/firebase';
import { pushNotificationService } from '../services/pushNotificationService';
import api from '../services/api';

/**
 * Firebase Initializer Component
 * Auto-initializes Firebase Cloud Messaging when user is authenticated
 * Handles both web (Firebase) and mobile (Capacitor) platforms
 * Syncs FCM token with backend if permission is already granted
 */
const FirebaseInitializer: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const initializePushNotifications = async () => {
      if (!isAuthenticated) {
        return;
      }

      const isNative = Capacitor.isNativePlatform();
      console.log('[FirebaseInitializer] Platform:', Capacitor.getPlatform(), 'isNative:', isNative);

      if (isNative) {
        // Mobile: Use Capacitor push notification service
        try {
          console.log('[FirebaseInitializer] Initializing mobile push notifications...');
          await pushNotificationService.initialize();
          console.log('[FirebaseInitializer] Mobile push notifications initialized');
        } catch (error) {
          console.error('[FirebaseInitializer] Failed to initialize mobile push:', error);
        }
      } else {
        // Web: Use Firebase Cloud Messaging
        await initializeWebPush();
      }
    };

    const initializeWebPush = async () => {
      // Check if notification permission is already granted
      if (typeof Notification === 'undefined') {
        console.log('[FirebaseInitializer] Notifications not supported in this browser');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.log('[FirebaseInitializer] Notification permission not granted yet');
        return;
      }

      try {
        // Get current FCM token (will initialize Firebase messaging if needed)
        const token = await getCurrentToken();

        if (!token) {
          console.log('[FirebaseInitializer] No FCM token available');
          return;
        }

        console.log('[FirebaseInitializer] FCM token obtained, registering with backend...');

        // Register token with backend
        await api.post('/api/notifications/register-token', { token });

        console.log('[FirebaseInitializer] FCM token registered with backend successfully');
      } catch (error) {
        console.error('[FirebaseInitializer] Failed to initialize or register FCM token:', error);
      }
    };

    // Initialize after a short delay to ensure auth is fully ready
    const timer = setTimeout(() => {
      initializePushNotifications();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // This component doesn't render anything
  return null;
};

export default FirebaseInitializer;
