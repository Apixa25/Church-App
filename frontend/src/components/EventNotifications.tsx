import React, { useState, useEffect } from 'react';
import webSocketService, { EventUpdate, EventRsvpUpdate } from '../services/websocketService';
import './EventNotifications.css';

interface EventNotification {
  id: string;
  type: 'event' | 'rsvp';
  title: string;
  message: string;
  timestamp: Date;
  eventId: string;
}

const EventNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        if (!webSocketService.isWebSocketConnected()) {
          await webSocketService.connect();
        }

        // Subscribe to event updates
        const eventUnsubscribe = await webSocketService.subscribeToEventUpdates((update: EventUpdate) => {
          const notification: EventNotification = {
            id: `event-${update.eventId}-${Date.now()}`,
            type: 'event',
            title: getEventUpdateTitle(update),
            message: getEventUpdateMessage(update),
            timestamp: new Date(),
            eventId: update.eventId
          };

          addNotification(notification);
        });

        // Subscribe to RSVP updates
        const rsvpUnsubscribe = webSocketService.subscribeToRsvpUpdates((update: EventRsvpUpdate) => {
          const notification: EventNotification = {
            id: `rsvp-${update.eventId}-${update.userId}-${Date.now()}`,
            type: 'rsvp',
            title: 'RSVP Update',
            message: getRsvpUpdateMessage(update),
            timestamp: new Date(),
            eventId: update.eventId
          };

          addNotification(notification);
        });

        // Subscribe to personal event notifications
        const userEventUnsubscribe = webSocketService.subscribeToUserEventNotifications((notification) => {
          const eventNotification: EventNotification = {
            id: `user-event-${Date.now()}`,
            type: 'event',
            title: notification.type,
            message: notification.content || 'You have a new event notification',
            timestamp: new Date(),
            eventId: notification.userId || 'unknown'
          };

          addNotification(eventNotification);
        });

        console.log('✅ Event notifications WebSocket connected successfully');

        return () => {
          eventUnsubscribe();
          rsvpUnsubscribe();
          userEventUnsubscribe();
        };
      } catch (error) {
        console.error('❌ Failed to connect WebSocket for event notifications:', error);
        // Retry connection after a delay
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    connectWebSocket();

    return () => {
      // WebSocket subscriptions will be cleaned up automatically
    };
  }, []);

  const addNotification = (notification: EventNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 most recent
    setUnreadCount(prev => prev + 1);

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 10000);
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const getEventUpdateTitle = (update: EventUpdate): string => {
    switch (update.type) {
      case 'event_created':
        return '📅 New Event Created';
      case 'event_updated':
        return '✏️ Event Updated';
      case 'event_cancelled':
        return '❌ Event Cancelled';
      case 'event_deleted':
        return '🗑️ Event Deleted';
      default:
        return '📅 Event Update';
    }
  };

  const getEventUpdateMessage = (update: EventUpdate): string => {
    switch (update.type) {
      case 'event_created':
        return `New event "${update.eventTitle}" has been created`;
      case 'event_updated':
        return `Event "${update.eventTitle}" has been updated`;
      case 'event_cancelled':
        return `Event "${update.eventTitle}" has been cancelled`;
      case 'event_deleted':
        return `An event has been deleted`;
      default:
        return `Event "${update.eventTitle}" has been updated`;
    }
  };

  const getRsvpUpdateMessage = (update: EventRsvpUpdate): string => {
    const userName = update.userName || 'Someone';
    const eventTitle = update.eventTitle || 'an event';
    
    switch (update.response?.toLowerCase()) {
      case 'yes':
        return `${userName} is attending "${eventTitle}"`;
      case 'no':
        return `${userName} can't attend "${eventTitle}"`;
      case 'maybe':
        return `${userName} might attend "${eventTitle}"`;
      default:
        return `${userName} updated their RSVP for "${eventTitle}"`;
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      return `${diffInHours}h ago`;
    }
  };

  return (
    <div className="event-notifications">
      <button
        className="notification-toggle"
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications) markAsRead();
        }}
        title="Event Notifications - Click to view event updates and RSVPs"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Event Notifications</h3>
            <button
              className="close-btn"
              onClick={() => setShowNotifications(false)}
            >
              ✕
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No recent notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div key={notification.id} className={`notification-item ${notification.type}`}>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTimestamp(notification.timestamp)}</div>
                  </div>
                  <button
                    className="remove-notification"
                    onClick={() => removeNotification(notification.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="clear-all-btn"
                onClick={() => setNotifications([])}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventNotifications;