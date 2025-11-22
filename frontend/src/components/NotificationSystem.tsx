import React, { useState, useEffect, useRef } from 'react';
import webSocketService, { WebSocketMessage } from '../services/websocketService';
import { useWebSocket } from '../contexts/WebSocketContext';
import './NotificationSystem.css';

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'share' | 'mention' | 'follow' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  userAvatar?: string;
  metadata?: any;
}

interface NotificationSystemProps {
  onNotificationClick?: (notification: NotificationItem) => void;
  maxNotifications?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHideDelay?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  onNotificationClick,
  maxNotifications = 50,
  position = 'top-right',
  autoHideDelay = 5000
}) => {
  const { isConnected, ensureConnection } = useWebSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const wsUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Setup WebSocket connection for notifications
    const setupWebSocket = async () => {
      try {
        // Use shared WebSocket context to ensure connection
        await ensureConnection();

        // Subscribe to user social notifications
        const unsubscribe = await webSocketService.subscribeToUserSocialNotifications(
          (message: WebSocketMessage) => {
            handleWebSocketNotification(message);
          }
        );

        wsUnsubscribeRef.current = unsubscribe;
        console.log('✅ Notification system WebSocket subscription established');

      } catch (error) {
        console.error('❌ Failed to setup notification WebSocket:', error);
        // Don't retry here - the WebSocket context handles reconnection
      }
    };

    // Only setup subscriptions when WebSocket is connected
    if (isConnected) {
      setupWebSocket();
    }

    // Cleanup WebSocket subscription
    return () => {
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
        wsUnsubscribeRef.current = null;
      }
    };
  }, []);

  const handleWebSocketNotification = (message: WebSocketMessage) => {
    console.log('Received notification:', message);

    const notification: NotificationItem = {
      id: `${message.type}-${Date.now()}`,
      type: message.type as NotificationItem['type'],
      title: getNotificationTitle(message),
      message: message.content || getNotificationMessage(message),
      timestamp: new Date(),
      isRead: false,
      actionUrl: getActionUrl(message),
      metadata: message
    };

    addNotification(notification);
  };

  const getNotificationTitle = (message: WebSocketMessage): string => {
    switch (message.type) {
      case 'like':
        return 'Someone liked your post';
      case 'comment':
        return 'New comment on your post';
      case 'share':
        return 'Someone shared your post';
      case 'mention':
        return 'You were mentioned';
      case 'follow':
        return 'New follower';
      default:
        return 'Church App Notification';
    }
  };

  const getNotificationMessage = (message: WebSocketMessage): string => {
    switch (message.type) {
      case 'like':
        return 'Your post received appreciation from the community';
      case 'comment':
        return 'Someone shared their thoughts on your post';
      case 'share':
        return 'Your post was shared with more people';
      case 'mention':
        return 'You were mentioned in a conversation';
      case 'follow':
        return 'Someone new is following your journey';
      default:
        return message.content || 'You have a new notification';
    }
  };

  const getActionUrl = (message: WebSocketMessage): string | undefined => {
    // Generate appropriate URLs based on notification type
    if (message.type === 'like' || message.type === 'comment' || message.type === 'share') {
      return '/dashboard'; // Could be more specific with post ID
    }
    return '/dashboard';
  };

  const addNotification = (notification: NotificationItem) => {
    setNotifications(prev => {
      const updated = [notification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-hide after delay
    if (autoHideDelay > 0) {
      setTimeout(() => {
        markAsRead(notification.id);
      }, autoHideDelay);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    markAsRead(notification.id);

    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`notification-system ${position}`}>
      {/* Notification Bell/Button */}
      <div 
        className="notification-bell" 
        onClick={() => setShowPanel(!showPanel)}
        title="Community Notifications - Click to view likes, comments, shares, and mentions"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
        {!isConnected && (
          <span className="connection-indicator disconnected" title="Disconnected - Notifications may not work"></span>
        )}
        {isConnected && (
          <span className="connection-indicator connected" title="Connected - Real-time notifications active"></span>
        )}
      </div>

      {/* Notification Panel */}
      {showPanel && (
        <div className="notification-panel">
          <div className="panel-header">
            <h3>Notifications</h3>
            <div className="panel-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="clear-all-btn"
                  onClick={clearAllNotifications}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="panel-content">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <div className="empty-text">
                  <strong>All caught up!</strong>
                  <br />
                  You're connected to your church community.
                </div>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-content">
                      <div className="notification-header">
                        <div className="notification-title">
                          {notification.title}
                        </div>
                        <div className="notification-time">
                          {formatTimeAgo(notification.timestamp)}
                        </div>
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                    </div>

                    {!notification.isRead && (
                      <div className="unread-indicator"></div>
                    )}

                    <button
                      className="dismiss-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      aria-label="Dismiss notification"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-footer">
            <div className="connection-status">
              {isConnected ? (
                <span className="status-connected">
                  🟢 Connected to community
                </span>
              ) : (
                <span className="status-disconnected">
                  🔴 Reconnecting...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toasts (for immediate feedback) */}
      <div className="notification-toasts">
        {notifications
          .filter(n => !n.isRead)
          .slice(0, 3) // Show max 3 toasts
          .map(notification => (
            <div
              key={notification.id}
              className="notification-toast"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="toast-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="toast-content">
                <div className="toast-title">{notification.title}</div>
                <div className="toast-message">{notification.message}</div>
              </div>
              <button
                className="toast-dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

// Helper functions
const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const getNotificationIcon = (type: NotificationItem['type']): string => {
  switch (type) {
    case 'like': return '❤️';
    case 'comment': return '💬';
    case 'share': return '🔄';
    case 'mention': return '👤';
    case 'follow': return '👥';
    case 'system': return 'ℹ️';
    default: return '🔔';
  }
};

export default NotificationSystem;
