import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventNotifications, EventNotification } from '../hooks/useEventNotifications';
import { formatRelativeDate } from '../utils/dateUtils';
import { useWebSocket } from '../contexts/WebSocketContext';
import './EventNotifications.css';

const EventNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  } = useEventNotifications();

  const [showNotifications, setShowNotifications] = useState(false);

  const handleNotificationClick = (notification: EventNotification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.chatGroupId) {
      // Fallback navigation for chat notifications
      navigate(`/chats/${notification.chatGroupId}`);
    } else if (notification.eventId) {
      // Fallback navigation for event notifications
      navigate('/calendar');
    }
    setShowNotifications(false);
  };

  const formatTimestamp = (timestamp: string) => {
    return formatRelativeDate(timestamp);
  };

  const getNotificationIcon = (type: EventNotification['type']) => {
    const iconMap = {
      event_created: '📅',
      event_updated: '✏️',
      event_cancelled: '❌',
      chat_message_received: '💬'
    };
    return iconMap[type] || '🔔';
  };

  return (
    <div className={`event-notifications ${showNotifications ? 'expanded' : ''}`}>
      <button
        className={`notification-toggle ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        title="Event & Chat Notifications - Click to view updates and messages"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Event & Chat Notifications</h3>
            <div className="notification-actions">
              {isConnected ? (
                <span className="connection-status connected">🟢 Live</span>
              ) : (
                <span className="connection-status disconnected">🔴 Offline</span>
              )}
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="mark-all-read"
                  title="Mark all as read"
                >
                  ✓
                </button>
              )}
              <button 
                onClick={clearAllNotifications}
                className="clear-all"
                title="Clear all notifications"
              >
                🗑️
              </button>
              <button 
                onClick={() => setShowNotifications(false)}
                className="close-dropdown"
              >
                ×
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet</p>
                <small>You'll be notified of new events, updates, and messages</small>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTimestamp(notification.timestamp)}</div>
                  </div>

                  <button
                    className="remove-notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    title="Remove notification"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button 
                onClick={() => {
                  navigate('/calendar');
                  setShowNotifications(false);
                }}
                className="view-all-events"
              >
                View Calendar →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventNotifications;
