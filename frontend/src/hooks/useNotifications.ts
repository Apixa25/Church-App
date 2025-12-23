import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  setupForegroundMessageListener,
  getCurrentToken
} from '../config/firebase';
import api from '../services/api';

/**
 * Custom hook for managing push notifications
 * Handles permission requests, token registration, and foreground message listening
 */
export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check current permission status
   */
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Register FCM token with backend
   */
  const registerToken = async (token: string): Promise<void> => {
    try {
      await api.post('/api/notifications/register-token', { token });
      setIsRegistered(true);
    } catch (err: any) {
      throw new Error('Failed to register notification token');
    }
  };

  /**
   * Request notification permission and register token
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await requestNotificationPermission();

      if (!token) {
        setPermission(Notification.permission);
        setError('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Register token with backend
      await registerToken(token);

      setPermission('granted');
      setIsRegistered(true);
      setIsLoading(false);
      return true;

    } catch (err: any) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Failed to enable notifications');
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Unregister FCM token from backend
   */
  const unregister = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.delete('/api/notifications/unregister-token');
      setIsRegistered(false);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to unregister FCM token:', err);
      setError(err.message || 'Failed to disable notifications');
      setIsLoading(false);
    }
  }, []);

  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      await api.post('/api/notifications/test');
      return true;
    } catch (err: any) {
      console.error('Failed to send test notification:', err);
      setError(err.response?.data?.error || 'Failed to send test notification');
      return false;
    }
  }, []);

  /**
   * Check if token is already registered
   */
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await api.get('/api/notifications/status');
        setIsRegistered(response.data.registered);
      } catch (err) {
        console.error('Failed to check notification status:', err);
      }
    };

    if (permission === 'granted') {
      checkRegistrationStatus();
    }
  }, [permission]);

  /**
   * Setup foreground message listener
   */
  useEffect(() => {
    if (permission !== 'granted') {
      return;
    }

    const unsubscribe = setupForegroundMessageListener((payload) => {
      // Show browser notification for foreground messages
      const { title, body } = payload.notification || {};

      if (title && body) {
        new Notification(title, {
          body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          data: payload.data
        });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [permission]);

  /**
   * Re-sync token on permission change (e.g., user re-enables in browser)
   */
  useEffect(() => {
    const syncToken = async () => {
      if (permission === 'granted' && !isRegistered) {
        const token = await getCurrentToken();
        if (token) {
          try {
            await registerToken(token);
          } catch (err) {
            console.error('Failed to sync FCM token:', err);
          }
        }
      }
    };

    syncToken();
  }, [permission, isRegistered]);

  return {
    permission,
    isRegistered,
    isLoading,
    error,
    requestPermission,
    unregister,
    sendTestNotification,
    isSupported: 'Notification' in window
  };
};

export default useNotifications;
