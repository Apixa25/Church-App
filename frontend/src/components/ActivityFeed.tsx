import React from 'react';
import { DashboardActivityItem } from '../services/dashboardApi';

interface ActivityFeedProps {
  activities: DashboardActivityItem[];
  isLoading?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, isLoading }) => {
  const getActivityIcon = (iconType: string) => {
    const iconMap: Record<string, string> = {
      user_plus: '👤➕',
      user_edit: '✏️👤',
      prayer: '🙏',
      chat: '💬',
      church: '⛪',
      megaphone: '📢',
      announcement: '📢',
      calendar: '📅',
      event: '🎉',
      rsvp: '✅',
      system: '⚙️',
      create: '➕'
    };
    return iconMap[iconType] || '📝';
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
      <div className="activity-feed loading">
        <h3>📊 Recent Activity</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <h3>📊 Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="empty-state">
          <p>🌟 No recent activity to show</p>
          <p>Your church community activity will appear here</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.iconType)}
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <h4>{activity.title}</h4>
                  <span className="activity-time">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
                <p className="activity-description">{activity.description}</p>
                {activity.userDisplayName && (
                  <div className="activity-user">
                    {activity.userProfilePicUrl && (
                      <img 
                        src={activity.userProfilePicUrl} 
                        alt={activity.userDisplayName}
                        className="activity-user-pic"
                      />
                    )}
                    <span className="activity-username">{activity.userDisplayName}</span>
                  </div>
                )}
              </div>
              {activity.actionUrl && activity.actionUrl !== '/dashboard' && (
                <div className="activity-action">
                  <button 
                    className="action-btn"
                    onClick={() => window.location.href = activity.actionUrl!}
                  >
                    View
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;