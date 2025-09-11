import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrayerNotifications, PrayerNotification } from '../hooks/usePrayerNotifications';

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

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch (error) {
      return '';
    }
  };

  const getNotificationIcon = (type: PrayerNotification['type']) => {
    const iconMap = {
      new_prayer: '🙏',
      prayer_interaction: '💙',
      prayer_answered: '✨',
      prayer_comment: '💬'
    };
    return iconMap[type] || '🔔';
  };

  return (
    <div className="prayer-notifications">
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

      {isExpanded && (
        <div className="notification-dropdown">
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
        </div>
      )}

      <style>{`
        .prayer-notifications {
          position: relative;
          display: inline-block;
        }

        .notification-bell {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s ease;
          position: relative;
        }

        .notification-bell:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .notification-bell.has-unread {
          animation: pulse 2s infinite;
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #e74c3c;
          color: white;
          border-radius: 10px;
          padding: 0.2rem 0.4rem;
          font-size: 0.7rem;
          font-weight: 700;
          min-width: 1.2rem;
          text-align: center;
          line-height: 1;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 350px;
          max-height: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border: 1px solid #e1e8ed;
          z-index: 1000;
          overflow: hidden;
        }

        .notification-header {
          padding: 1rem;
          border-bottom: 1px solid #e1e8ed;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
        }

        .notification-header h4 {
          margin: 0;
          color: #2c3e50;
          font-size: 1rem;
          font-weight: 600;
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .connection-status {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          border-radius: 10px;
          font-weight: 500;
        }

        .connection-status.connected {
          background: #d4edda;
          color: #155724;
        }

        .connection-status.disconnected {
          background: #f8d7da;
          color: #721c24;
        }

        .mark-all-read, .clear-all, .close-dropdown {
          background: none;
          border: none;
          padding: 0.25rem;
          border-radius: 4px;
          cursor: pointer;
          color: #6c757d;
          transition: all 0.2s ease;
        }

        .mark-all-read:hover, .clear-all:hover, .close-dropdown:hover {
          background: #e9ecef;
          color: #495057;
        }

        .notification-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .no-notifications {
          padding: 2rem;
          text-align: center;
          color: #6c757d;
        }

        .no-notifications p {
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .no-notifications small {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .notification-item {
          padding: 0.75rem;
          border-bottom: 1px solid #f1f3f4;
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          position: relative;
        }

        .notification-item:hover {
          background: #f8f9fa;
        }

        .notification-item.unread {
          background: #e3f2fd;
          border-left: 3px solid #2196f3;
        }

        .notification-item.unread:hover {
          background: #bbdefb;
        }

        .notification-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          color: #6c757d;
          font-size: 0.85rem;
          line-height: 1.4;
          margin-bottom: 0.25rem;
        }

        .notification-time {
          color: #adb5bd;
          font-size: 0.75rem;
        }

        .remove-notification {
          background: none;
          border: none;
          color: #adb5bd;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .remove-notification:hover {
          background: #f8d7da;
          color: #721c24;
        }

        .notification-footer {
          padding: 0.75rem;
          border-top: 1px solid #e1e8ed;
          background: #f8f9fa;
        }

        .view-all-prayers {
          width: 100%;
          background: #3498db;
          color: white;
          border: none;
          padding: 0.6rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .view-all-prayers:hover {
          background: #2980b9;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @media (max-width: 768px) {
          .notification-dropdown {
            width: 300px;
            right: -50px;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerNotifications;