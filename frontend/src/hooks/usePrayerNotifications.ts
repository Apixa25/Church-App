import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import webSocketService, { PrayerRequestUpdate, PrayerInteractionUpdate, WebSocketMessage } from '../services/websocketService';

export interface PrayerNotification {
  id: string;
  type:
    | 'new_prayer'
    | 'prayer_interaction'
    | 'prayer_comment'
    | 'prayer_answered'
    | 'prayer_updated';
  title: string;
  message: string;
  prayerRequestId: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export const usePrayerNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PrayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const addNotification = useCallback((notification: PrayerNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      
      // Add new notification at the beginning
      const updated = [notification, ...prev].slice(0, 50); // Keep only last 50 notifications
      return updated;
    });
    
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notificationId);
      const removedNotification = prev.find(n => n.id === notificationId);
      
      if (removedNotification && !removedNotification.read) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
      
      return filtered;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Use refs to store current values to avoid stale closures
  const userRef = useRef(user);
  const addNotificationRef = useRef(addNotification);
  
  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
    addNotificationRef.current = addNotification;
  }, [user, addNotification]);

  // Handle prayer request updates - using useCallback with empty dependency array
  const handlePrayerRequestUpdate = useCallback((data: any) => {
    if (!userRef.current) {
      return;
    }

    const rawType = data.eventType || data.type;
    if (!rawType) {
      return;
    }

    const eventType = String(rawType).toLowerCase();
    const isOwnPrayer = data.userId && data.userId === userRef.current.userId;

    let notification: PrayerNotification | null = null;

    switch (eventType) {
      case 'new_prayer':
      case 'new_prayer_request':
      case 'prayer_request':
        if (isOwnPrayer) return;
        notification = {
          id: `prayer-${data.prayerRequestId}-${Date.now()}`,
          type: 'new_prayer',
          title: 'New Prayer Request',
          message: `${data.userName || 'A community member'} shared "${data.title ?? 'a new request'}"`,
          prayerRequestId: data.prayerRequestId,
          timestamp: data.timestamp,
          read: false,
          actionUrl: `/prayers/${data.prayerRequestId}`
        };
        break;
      case 'prayer_answered':
      case 'prayer_status_changed':
        notification = {
          id: `prayer-update-${data.prayerRequestId}-${Date.now()}`,
          type: 'prayer_answered',
          title: 'Prayer Answered',
          message:
            data.message ||
            `${data.userName || 'A community member'} marked "${data.title ?? 'a request'}" as answered`,
          prayerRequestId: data.prayerRequestId,
          timestamp: data.timestamp,
          read: false,
          actionUrl: `/prayers/${data.prayerRequestId}`
        };
        break;
      case 'prayer_update':
      case 'prayer_updated':
        notification = {
          id: `prayer-updated-${data.prayerRequestId}-${Date.now()}`,
          type: 'prayer_updated',
          title: 'Prayer Updated',
          message:
            data.message ||
            `${data.userName || 'A community member'} updated "${data.title ?? 'a prayer request'}"`,
          prayerRequestId: data.prayerRequestId,
          timestamp: data.timestamp,
          read: false,
          actionUrl: `/prayers/${data.prayerRequestId}`
        };
        break;
      default:
        break;
    }

    if (notification) {
      addNotificationRef.current(notification);
    }
  }, []); // Empty dependency array to prevent re-creation

  // Handle prayer interaction updates - using useCallback with empty dependency array
  const handlePrayerInteractionUpdate = useCallback((update: PrayerInteractionUpdate) => {
    if (!userRef.current) return;

    // Don't notify users of their own interactions
    if (update.userId === userRef.current.userId) return;

    const notification: PrayerNotification = {
      id: `interaction-${update.prayerRequestId}-${update.userId}-${Date.now()}`,
      type: update.interactionType === 'COMMENT' ? 'prayer_comment' : 'prayer_interaction',
      title: update.interactionType === 'COMMENT' ? 'New Prayer Comment' : 'Prayer Support',
      message: update.interactionType === 'COMMENT' 
        ? 'Someone commented on a prayer request'
        : 'Someone is praying for a request',
      prayerRequestId: update.prayerRequestId,
      timestamp: update.timestamp,
      read: false,
      actionUrl: `/prayers/${update.prayerRequestId}`
    };

    addNotificationRef.current(notification);
  }, []); // Empty dependency array to prevent re-creation

  // Handle user-specific prayer notifications - using useCallback with empty dependency array
  const handleUserPrayerNotification = useCallback((message: WebSocketMessage) => {
    if (!userRef.current) return;

    const notification: PrayerNotification = {
      id: `user-prayer-${Date.now()}`,
      type: 'prayer_interaction',
      title: 'Prayer Notification',
      message: message.content?.message || 'You have a new prayer notification',
      prayerRequestId: message.content?.prayerRequestId || '',
      timestamp: message.timestamp,
      read: false,
      actionUrl: message.content?.prayerRequestId ? `/prayers/${message.content.prayerRequestId}` : '/prayers'
    };

    addNotificationRef.current(notification);
  }, []); // Empty dependency array to prevent re-creation

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!user) return;

    let unsubscribePrayerRequests: (() => void) | null = null;
    let unsubscribeUserNotifications: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 3000;

    const setupSubscriptions = async () => {
      try {
        // Check if token exists before attempting connection
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.warn('No auth token available, waiting for authentication...');
          // Only retry if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            retryTimeout = setTimeout(() => {
              setupSubscriptions();
            }, RETRY_DELAY);
          } else {
            console.error('Max retries reached for prayer notification subscriptions');
          }
          return;
        }

        // Reset retry count on successful token check
        retryCount = 0;

        if (!webSocketService.isWebSocketConnected()) {
          await webSocketService.connect();
          // Wait a bit more for connection to be fully established
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setIsConnected(true);

        // Subscribe to general prayer request updates
        unsubscribePrayerRequests = webSocketService.subscribeToPrayerRequests(handlePrayerRequestUpdate);
        
        // Subscribe to user-specific prayer notifications
        unsubscribeUserNotifications = webSocketService.subscribeToUserPrayerNotifications(handleUserPrayerNotification);

        console.log('Prayer notifications WebSocket subscriptions established');
      } catch (error) {
        console.error('Failed to establish prayer notification subscriptions:', error);
        setIsConnected(false);
        
        // Check if error is due to missing token
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isAuthError = errorMessage.includes('Authentication required') || errorMessage.includes('no token found');
        
        // Only retry if we haven't exceeded max retries and token should be available
        if (retryCount < MAX_RETRIES) {
          const token = localStorage.getItem('authToken');
          // Only retry if token exists (meaning it's a connection issue, not auth issue)
          if (token || !isAuthError) {
            retryCount++;
            retryTimeout = setTimeout(() => {
              setupSubscriptions();
            }, RETRY_DELAY);
          } else {
            // If no token and auth error, wait longer and check again
            retryCount++;
            retryTimeout = setTimeout(() => {
              setupSubscriptions();
            }, RETRY_DELAY * 2); // Wait longer if it's an auth issue
          }
        } else {
          console.error('Max retries reached for prayer notification subscriptions');
        }
      }
    };

    setupSubscriptions();

    return () => {
      // Clear any pending retries
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (unsubscribePrayerRequests) {
        unsubscribePrayerRequests();
      }
      if (unsubscribeUserNotifications) {
        unsubscribeUserNotifications();
      }
      setIsConnected(false);
    };
  }, [user]); // Only depend on user to prevent re-subscriptions

  // Subscribe to specific prayer interactions when viewing a prayer
  const subscribeToSpecificPrayer = useCallback((prayerRequestId: string) => {
    if (!user || !webSocketService.isWebSocketConnected()) return null;

    try {
      return webSocketService.subscribeToPrayerInteractions(prayerRequestId, handlePrayerInteractionUpdate);
    } catch (error) {
      console.error('Failed to subscribe to prayer interactions:', error);
      return null;
    }
  }, [user, handlePrayerInteractionUpdate]);

  return {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    subscribeToSpecificPrayer
  };
};