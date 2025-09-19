import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import webSocketService, { PrayerRequestUpdate, PrayerInteractionUpdate, WebSocketMessage } from '../services/websocketService';

export interface PrayerNotification {
  id: string;
  type: 'new_prayer' | 'prayer_interaction' | 'prayer_answered' | 'prayer_comment';
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
    console.log('🔥 handlePrayerRequestUpdate called with data:', data);
    console.log('🔥 Current user:', userRef.current);

    if (!userRef.current) {
      console.log('🔥 No user, returning early');
      return;
    }

    let notification: PrayerNotification | null = null;

    // Handle the new PrayerNotificationEvent format from backend
    if (data.type === 'NEW_PRAYER_REQUEST') {
      // Don't notify users of their own prayer requests
      if (data.userId === userRef.current.userId) return;
      
      notification = {
        id: `prayer-${data.prayerRequestId}-${Date.now()}`,
        type: 'new_prayer',
        title: 'New Prayer Request',
        message: `${data.userName || 'A community member'} submitted a new prayer request: "${data.title}"`,
        prayerRequestId: data.prayerRequestId,
        timestamp: data.timestamp,
        read: false,
        actionUrl: `/prayers/${data.prayerRequestId}`
      };
    }
    // Handle the old format for backward compatibility
    else if (data.type === 'prayer_request') {
      // Don't notify users of their own prayer requests
      if (data.userId === userRef.current.userId) return;
      
      notification = {
        id: `prayer-${data.prayerRequestId}-${Date.now()}`,
        type: 'new_prayer',
        title: 'New Prayer Request',
        message: 'A community member has submitted a new prayer request',
        prayerRequestId: data.prayerRequestId,
        timestamp: data.timestamp,
        read: false,
        actionUrl: `/prayers/${data.prayerRequestId}`
      };
    }
    else if (data.type === 'prayer_update') {
      notification = {
        id: `prayer-update-${data.prayerRequestId}-${Date.now()}`,
        type: 'prayer_answered',
        title: 'Prayer Update',
        message: 'A prayer request has been updated',
        prayerRequestId: data.prayerRequestId,
        timestamp: data.timestamp,
        read: false,
        actionUrl: `/prayers/${data.prayerRequestId}`
      };
    }

    if (notification) {
      console.log('🔥 Adding prayer notification:', notification);
      addNotificationRef.current(notification);
    } else {
      console.log('🔥 No notification created from data:', data);
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

    const setupSubscriptions = async () => {
      try {
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
        
        // Retry connection after a delay
        setTimeout(() => {
          setupSubscriptions();
        }, 3000);
      }
    };

    setupSubscriptions();

    return () => {
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