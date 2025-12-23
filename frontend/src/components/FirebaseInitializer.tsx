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

      if (isNative) {
        // Mobile: Use Capacitor push notification service
        try {
          await pushNotificationService.initialize();
        } catch (error) {
          console.error('Failed to initialize mobile push:', error);
        }
      } else {
        // Web: Use Firebase Cloud Messaging
        await initializeWebPush();
      }
    };

    const initializeWebPush = async () => {
      // Check if notification permission is already granted
      if (typeof Notification === 'undefined') {
        return;
      }

      if (Notification.permission !== 'granted') {
        return;
      }

      try {
        // Get current FCM token (will initialize Firebase messaging if needed)
        const token = await getCurrentToken();

        if (!token) {
          return;
        }

        // Register token with backend
        await api.post('/api/notifications/register-token', { token });
      } catch (error) {
        console.error('Failed to initialize or register FCM token:', error);
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
