import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePrayerNotifications, PrayerNotification } from '../hooks/usePrayerNotifications';
import { formatRelativeDate } from '../utils/dateUtils';
import './PrayerNotifications.css';

const PrayerNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  } = usePrayerNotifications();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleNotificationClick = (notification: PrayerNotification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setIsExpanded(false);
  };

  const formatTimestamp = (timestamp: string | number[]) => {
    return formatRelativeDate(timestamp);
  };

  const getNotificationIcon = (type: PrayerNotification['type']) => {
    const iconMap = {
      new_prayer: '🙏',
      prayer_interaction: '💙',
      prayer_answered: '✨',
      prayer_comment: '💬',
      prayer_updated: '📝'
    };
    return iconMap[type] || '🔔';
  };

  return (
    <div className={`prayer-notifications ${isExpanded ? 'expanded' : ''}`}>
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Prayer Notifications"
      >
        🙏
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isExpanded && createPortal(
        <div className="notification-dropdown prayer-dropdown">
          <div className="notification-header">
            <h4>Prayer Notifications</h4>
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
                onClick={() => setIsExpanded(false)}
                className="close-dropdown"
              >
                ×
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No prayer notifications yet</p>
                <small>You'll be notified of new prayers and interactions</small>
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
                  navigate('/prayers');
                  setIsExpanded(false);
                }}
                className="view-all-prayers"
              >
                View All Prayers →
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default PrayerNotifications;