import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentToken } from '../config/firebase';
import api from '../services/api';

/**
 * Firebase Initializer Component
 * Auto-initializes Firebase Cloud Messaging when user is authenticated
 * Syncs FCM token with backend if permission is already granted
 */
const FirebaseInitializer: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const initializeFirebase = async () => {
      if (!isAuthenticated) {
        return;
      }

      // Check if notification permission is already granted
      if (typeof Notification === 'undefined') {
        console.log('[Firebase] Notifications not supported in this browser');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.log('[Firebase] Notification permission not granted yet');
        return;
      }

      try {
        // Get current FCM token (will initialize Firebase messaging if needed)
        const token = await getCurrentToken();

        if (!token) {
          console.log('[Firebase] No FCM token available');
          return;
        }

        console.log('[Firebase] FCM token obtained, registering with backend...');

        // Register token with backend
        await api.post('/api/notifications/register-token', { token });

        console.log('[Firebase] FCM token registered with backend successfully');
      } catch (error) {
        console.error('[Firebase] Failed to initialize or register FCM token:', error);
      }
    };

    // Initialize Firebase after a short delay to ensure auth is fully ready
    const timer = setTimeout(() => {
      initializeFirebase();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // This component doesn't render anything
  return null;
};

export default FirebaseInitializer;
