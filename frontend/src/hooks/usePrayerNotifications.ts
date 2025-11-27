import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
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

// LocalStorage key for prayer notifications (user-specific)
const getStorageKey = (userId: string | undefined) => 
  userId ? `prayer_notifications_${userId}` : null;

// Load notifications from localStorage
const loadNotificationsFromStorage = (userId: string | undefined): PrayerNotification[] => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) return [];
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error loading prayer notifications from localStorage:', error);
  }
  return [];
};

// Save notifications to localStorage
const saveNotificationsToStorage = (userId: string | undefined, notifications: PrayerNotification[]) => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) return;
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving prayer notifications to localStorage:', error);
  }
};

// Calculate unread count from notifications array
const calculateUnreadCount = (notifications: PrayerNotification[]): number => {
  return notifications.filter(n => !n.read).length;
};

export const usePrayerNotifications = () => {
  const { user } = useAuth();
  const { isConnected, ensureConnection } = useWebSocket();
  
  // Initialize state from localStorage
  const [notifications, setNotifications] = useState<PrayerNotification[]>(() => 
    loadNotificationsFromStorage(user?.userId)
  );
  const [unreadCount, setUnreadCount] = useState(() => 
    calculateUnreadCount(loadNotificationsFromStorage(user?.userId))
  );

  const addNotification = useCallback((notification: PrayerNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      
      // Add new notification at the beginning
      const updated = [notification, ...prev].slice(0, 50); // Keep only last 50 notifications
      
      // Save to localStorage
      saveNotificationsToStorage(user?.userId, updated);
      
      // Update unread count based on actual notifications
      const newUnreadCount = calculateUnreadCount(updated);
      setUnreadCount(newUnreadCount);
      
      return updated;
    });
  }, [user?.userId]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      );
      
      // Save to localStorage
      saveNotificationsToStorage(user?.userId, updated);
      
      // Update unread count based on actual notifications
      const newUnreadCount = calculateUnreadCount(updated);
      setUnreadCount(newUnreadCount);
      
      return updated;
    });
  }, [user?.userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, read: true }));
      
      // Save to localStorage
      saveNotificationsToStorage(user?.userId, updated);
      
      // Update unread count
      setUnreadCount(0);
      
      return updated;
    });
  }, [user?.userId]);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notificationId);
      
      // Save to localStorage
      saveNotificationsToStorage(user?.userId, filtered);
      
      // Update unread count based on actual notifications
      const newUnreadCount = calculateUnreadCount(filtered);
      setUnreadCount(newUnreadCount);
      
      return filtered;
    });
  }, [user?.userId]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    
    // Clear from localStorage
    const storageKey = getStorageKey(user?.userId);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Error clearing prayer notifications from localStorage:', error);
      }
    }
  }, [user?.userId]);

  // Load notifications from localStorage when user changes
  useEffect(() => {
    if (user?.userId) {
      const loadedNotifications = loadNotificationsFromStorage(user.userId);
      setNotifications(loadedNotifications);
      setUnreadCount(calculateUnreadCount(loadedNotifications));
    } else {
      // Clear notifications if user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.userId]);

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
    if (!user) {
      return;
    }

    let unsubscribePrayerRequests: (() => void) | null = null;
    let unsubscribeUserNotifications: (() => void) | null = null;
    let setupTimeout: NodeJS.Timeout | null = null;

    const setupSubscriptions = async () => {
      try {
        // Use shared WebSocket context to ensure connection
        await ensureConnection();

        // Double-check connection is ready before subscribing
        if (!webSocketService.isWebSocketConnected()) {
          console.warn('⚠️ WebSocket not connected after ensureConnection, retrying...');
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!webSocketService.isWebSocketConnected()) {
            console.error('❌ WebSocket still not connected after retry');
            return;
          }
        }

        // Subscribe to general prayer request updates
        unsubscribePrayerRequests = webSocketService.subscribeToPrayerRequests(handlePrayerRequestUpdate);
        
        // Subscribe to user-specific prayer notifications
        unsubscribeUserNotifications = webSocketService.subscribeToUserPrayerNotifications(handleUserPrayerNotification);

        console.log('✅ Prayer notifications WebSocket subscriptions established');
      } catch (error) {
        console.error('❌ Failed to establish prayer notification subscriptions:', error);
        // Retry after a delay if connection failed
        if (setupTimeout) clearTimeout(setupTimeout);
        setupTimeout = setTimeout(() => {
          if (webSocketService.isWebSocketConnected()) {
            setupSubscriptions();
          }
        }, 2000);
      }
    };

    // Setup subscriptions when WebSocket is connected, or try to connect if not
    if (isConnected) {
      setupSubscriptions();
    } else {
      // If not connected, try to ensure connection and then setup
      ensureConnection()
        .then(() => {
          setupSubscriptions();
        })
        .catch((error) => {
          console.error('❌ Failed to ensure connection for prayer notifications:', error);
        });
    }

    return () => {
      if (setupTimeout) clearTimeout(setupTimeout);
      if (unsubscribePrayerRequests) {
        unsubscribePrayerRequests();
      }
      if (unsubscribeUserNotifications) {
        unsubscribeUserNotifications();
      }
    };
  }, [user, isConnected, ensureConnection, handlePrayerRequestUpdate, handleUserPrayerNotification]);

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