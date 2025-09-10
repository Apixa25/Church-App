import React, { useState } from 'react';
import { NotificationSummary } from '../services/dashboardApi';

interface NotificationCenterProps {
  notifications: NotificationSummary;
  isLoading?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      welcome: '👋',
      system: '⚙️',
      prayer: '🙏',
      announcement: '📢',
      chat: '💬',
      event: '📅'
    };
    return iconMap[type] || '🔔';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Handle different timestamp formats that might come from backend
      let date: Date;
      
      if (Array.isArray(timestamp)) {
        // Handle array format [year, month, day, hour, minute, second, nanosecond]
        const [year, month, day, hour = 0, minute = 0, second = 0] = timestamp as number[];
        date = new Date(year, month - 1, day, hour, minute, second); // Month is 0-indexed in Date constructor
      } else {
        // Handle string format (ISO-8601 or other)
        date = new Date(timestamp);
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp format:', timestamp);
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
      }
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="notification-center loading">
        <h3>🔔 Notifications</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-center">
      <div className="notification-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          🔔 Notifications 
          {notifications.totalUnread > 0 && (
            <span className="notification-badge">{notifications.totalUnread}</span>
          )}
        </h3>
        <button className="expand-btn">
          {isExpanded ? '⬆️' : '⬇️'}
        </button>
      </div>
      
      <div className="notification-summary">
        <div className="summary-grid">
          {notifications.prayerRequests > 0 && (
            <div className="summary-item">
              <span className="summary-icon">🙏</span>
              <span className="summary-count">{notifications.prayerRequests}</span>
              <span className="summary-label">Prayer</span>
            </div>
          )}
          {notifications.announcements > 0 && (
            <div className="summary-item">
              <span className="summary-icon">📢</span>
              <span className="summary-count">{notifications.announcements}</span>
              <span className="summary-label">News</span>
            </div>
          )}
          {notifications.chatMessages > 0 && (
            <div className="summary-item">
              <span className="summary-icon">💬</span>
              <span className="summary-count">{notifications.chatMessages}</span>
              <span className="summary-label">Chat</span>
            </div>
          )}
          {notifications.events > 0 && (
            <div className="summary-item">
              <span className="summary-icon">📅</span>
              <span className="summary-count">{notifications.events}</span>
              <span className="summary-label">Events</span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="notification-list">
          {notifications.previews.length === 0 ? (
            <div className="empty-notifications">
              <p>🌟 All caught up!</p>
              <p>No new notifications</p>
            </div>
          ) : (
            notifications.previews.map((notification, index) => (
              <div key={index} className="notification-item">
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <span className="notification-time">
                    {formatTimestamp(notification.timestamp)}
                  </span>
                </div>
                {notification.actionUrl && (
                  <button 
                    className="notification-action"
                    onClick={() => window.location.href = notification.actionUrl!}
                  >
                    View
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;