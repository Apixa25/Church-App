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
      calendar: '📅',
      system: '⚙️'
    };
    return iconMap[iconType] || '📝';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
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