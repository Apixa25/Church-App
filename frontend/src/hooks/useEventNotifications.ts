import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useOrganization } from '../contexts/OrganizationContext';
import webSocketService, { EventUpdate } from '../services/websocketService';

export interface EventNotification {
  id: string;
  type: 'event_created' | 'event_updated' | 'event_cancelled' | 'chat_message_received';
  title: string;
  message: string;
  eventId?: string; // Optional for chat notifications
  chatGroupId?: string; // For chat notifications
  chatGroupName?: string; // For chat notifications
  senderId?: string; // For chat notifications
  senderName?: string; // For chat notifications
  messageId?: string; // For chat notifications
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// LocalStorage key for event notifications (user-specific)
const getStorageKey = (userId: string | undefined) => 
  userId ? `event_notifications_${userId}` : null;

// Load notifications from localStorage
const loadNotificationsFromStorage = (userId: string | undefined): EventNotification[] => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) return [];
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error loading event notifications from localStorage:', error);
  }
  return [];
};

// Save notifications to localStorage
const saveNotificationsToStorage = (userId: string | undefined, notifications: EventNotification[]) => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) return;
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving event notifications to localStorage:', error);
  }
};

// Calculate unread count from notifications array
const calculateUnreadCount = (notifications: EventNotification[]): number => {
  return notifications.filter(n => !n.read).length;
};

export const useEventNotifications = () => {
  const { user } = useAuth();
  const { isConnected, ensureConnection } = useWebSocket();
  const { churchPrimary, familyPrimary, groups } = useOrganization();
  
  // Initialize state from localStorage
  const [notifications, setNotifications] = useState<EventNotification[]>(() => 
    loadNotificationsFromStorage(user?.userId)
  );
  const [unreadCount, setUnreadCount] = useState(() => 
    calculateUnreadCount(loadNotificationsFromStorage(user?.userId))
  );

  // Get all organization IDs user belongs to (for filtering)
  const getUserOrganizationIds = useCallback((): string[] => {
    const orgIds: string[] = [];
    
    if (churchPrimary?.organizationId) {
      orgIds.push(churchPrimary.organizationId);
    }
    if (familyPrimary?.organizationId) {
      orgIds.push(familyPrimary.organizationId);
    }
    if (groups && groups.length > 0) {
      groups.forEach(group => {
        if (group.organizationId && !orgIds.includes(group.organizationId)) {
          orgIds.push(group.organizationId);
        }
      });
    }
    
    return orgIds;
  }, [churchPrimary, familyPrimary, groups]);

  const addNotification = useCallback((notification: EventNotification) => {
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
        console.error('Error clearing event notifications from localStorage:', error);
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
  const getUserOrganizationIdsRef = useRef(getUserOrganizationIds);
  
  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
    addNotificationRef.current = addNotification;
    getUserOrganizationIdsRef.current = getUserOrganizationIds;
  }, [user, addNotification, getUserOrganizationIds]);

  // Handle event updates - filter by user's organizations
  const handleEventUpdate = useCallback((update: EventUpdate) => {
    console.log('🔔 handleEventUpdate received:', update);

    if (!userRef.current) {
      console.log('⚠️ No user in ref, ignoring update');
      return;
    }

    const eventType = update.eventType || '';
    console.log('🔔 Event type:', eventType);

    // Handle chat message notifications
    if (eventType === 'chat_message_received') {
      console.log('💬 Processing chat_message_received notification:', update);
      // Don't notify users of their own messages
      if (update.senderId && update.senderId === userRef.current.userId) {
        console.log('🚫 Ignoring own message (senderId matches userId)');
        return;
      }

      // Don't notify if user's email matches sender (additional check)
      if (update.senderEmail && update.senderEmail === userRef.current.email) {
        console.log('🚫 Ignoring own message (senderEmail matches user email)');
        return;
      }

      console.log('✅ Creating chat notification for message from:', update.senderName);

      const notification: EventNotification = {
        id: `chat-${update.messageId || update.chatGroupId}-${Date.now()}`,
        type: 'chat_message_received',
        title: getChatNotificationTitle(update),
        message: getChatNotificationMessage(update),
        chatGroupId: update.chatGroupId,
        chatGroupName: update.chatGroupName,
        senderId: update.senderId,
        senderName: update.senderName,
        messageId: update.messageId,
        timestamp: update.timestamp || new Date().toISOString(),
        read: false,
        actionUrl: update.actionUrl || (update.chatGroupId ? `/chats/${update.chatGroupId}` : '/chats')
      };

      addNotificationRef.current(notification);
      return;
    }

    // Handle event notifications (event_created, event_updated, event_cancelled)
    if (!eventType || !['event_created', 'event_updated', 'event_cancelled'].includes(eventType)) {
      return;
    }

    // Filter by organization - only show events from user's organizations
    const userOrgIds = getUserOrganizationIdsRef.current();
    if (update.organizationId && !userOrgIds.includes(update.organizationId)) {
      return; // Skip if event is not from user's organization
    }

    // Don't notify users of their own events (optional - can remove this if you want)
    if (update.creatorId && update.creatorId === userRef.current.userId) {
      // Optional: uncomment to skip own events
      // return;
    }

    const notification: EventNotification = {
      id: `event-${update.eventId}-${Date.now()}`,
      type: eventType as 'event_created' | 'event_updated' | 'event_cancelled',
      title: getEventUpdateTitle(eventType),
      message: getEventUpdateMessage(update, eventType),
      eventId: update.eventId,
      timestamp: update.timestamp || new Date().toISOString(),
      read: false,
      actionUrl: update.actionUrl || '/calendar'
    };

    addNotificationRef.current(notification);
  }, []); // Empty dependency array to prevent re-creation

  // Helper functions for notification messages
  const getEventUpdateTitle = (eventType: string): string => {
    switch (eventType) {
      case 'event_created':
        return '📅 New Event Created';
      case 'event_updated':
        return '✏️ Event Updated';
      case 'event_cancelled':
        return '❌ Event Cancelled';
      default:
        return '📅 Event Update';
    }
  };

  const getEventUpdateMessage = (update: EventUpdate, eventType: string): string => {
    const eventTitle = update.eventTitle || 'an event';
    
    switch (eventType) {
      case 'event_created':
        return `New event "${eventTitle}" has been created`;
      case 'event_updated':
        return `Event "${eventTitle}" has been updated`;
      case 'event_cancelled':
        return `Event "${eventTitle}" has been cancelled`;
      default:
        return `Event "${eventTitle}" has been updated`;
    }
  };

  // Helper functions for chat notifications
  const getChatNotificationTitle = (update: EventUpdate): string => {
    const senderName = update.senderName || 'Someone';
    const groupName = update.chatGroupName || 'a chat';
    return `💬 New Message from ${senderName}`;
  };

  const getChatNotificationMessage = (update: EventUpdate): string => {
    const senderName = update.senderName || 'Someone';
    const groupName = update.chatGroupName || 'a chat';
    const messageContent = update.messageContent || '';
    
    // Truncate long messages
    const truncatedContent = messageContent.length > 50 
      ? messageContent.substring(0, 50) + '...' 
      : messageContent;
    
    if (update.messageType === 'IMAGE' || update.messageType === 'VIDEO') {
      return `${senderName} sent a ${update.messageType.toLowerCase()} in ${groupName}`;
    }
    
    return truncatedContent || `${senderName} sent a message in ${groupName}`;
  };

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!user) {
      return;
    }

    let eventUnsubscribe: (() => void) | null = null;
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

        // Subscribe to user-specific event notifications (including chat messages)
        // This subscribes to /user/queue/events which receives personalized notifications
        eventUnsubscribe = webSocketService.subscribeToUserEventNotifications(handleEventUpdate);

        console.log('✅ Event notifications WebSocket subscriptions established');
        console.log('🔔 Listening for user event notifications on /user/queue/events (including chat_message_received)');
      } catch (error) {
        console.error('❌ Failed to establish event notification subscriptions:', error);
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
          console.error('❌ Failed to ensure connection for event notifications:', error);
        });
    }

    return () => {
      if (setupTimeout) clearTimeout(setupTimeout);
      if (eventUnsubscribe) {
        eventUnsubscribe();
      }
    };
  }, [user, isConnected, ensureConnection, handleEventUpdate]);

  return {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  };
};

