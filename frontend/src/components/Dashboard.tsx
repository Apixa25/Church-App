import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import dashboardApi, { DashboardResponse } from '../services/dashboardApi';
import ActivityFeed from './ActivityFeed';
import PostFeed from './PostFeed';
import PostComposer from './PostComposer';
import QuickActions from './QuickActions';
import DashboardStats from './DashboardStats';
import NotificationCenter from './NotificationCenter';
import PrayerNotifications from './PrayerNotifications';
import EventNotifications from './EventNotifications';
import NotificationSystem from './NotificationSystem';
import SearchComponent from './SearchComponent';
import { FeedType } from '../types/Post';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [feedView, setFeedView] = useState<'activity' | 'social'>('activity'); // Default to activity feed
  const [feedType, setFeedType] = useState<FeedType>(FeedType.CHRONOLOGICAL); // Make feedType dynamic
  const [showComposer, setShowComposer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Refresh user data when component mounts to ensure profile picture is current
  useEffect(() => {
    const refreshUserData = async () => {
      if (user && !user.profilePicUrl && updateUser) {
        try {
          // Import profileAPI dynamically to avoid circular dependency
          const { profileAPI } = await import('../services/api');
          const response = await profileAPI.getMyProfile();
          const freshUserData = response.data;
          
          // Update user data if profilePicUrl is now available
          if (freshUserData.profilePicUrl && user.userId === freshUserData.userId) {
            // Update the user context with fresh data
            updateUser({
              profilePicUrl: freshUserData.profilePicUrl,
              bio: freshUserData.bio,
              location: freshUserData.location,
              website: freshUserData.website,
              interests: freshUserData.interests,
              phoneNumber: freshUserData.phoneNumber,
              address: freshUserData.address,
              birthday: freshUserData.birthday,
              spiritualGift: freshUserData.spiritualGift
            });
          }
        } catch (error) {
          console.error('Failed to refresh user data in Dashboard:', error);
        }
      }
    };

    refreshUserData();
  }, [user, updateUser]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use enhanced dashboard service that includes all features (prayers, announcements, events)
      const data = await dashboardApi.getDashboardWithAll();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handlePostCreated = (newPost: any) => {
    // The PostFeed component will handle refreshing itself
    setShowComposer(false);
    // Could also refresh dashboard stats if needed
    fetchDashboardData();
  };

  const handleFeedViewChange = (view: 'activity' | 'social') => {
    setFeedView(view);
  };

  const handleFeedTypeChange = (newFeedType: FeedType) => {
    setFeedType(newFeedType);
  };

  const formatLastRefresh = () => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastRefresh.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 minute ago';
    return `${diffInMinutes} minutes ago`;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏛️ Church App</h1>
            <div className="refresh-info">
              <span>Last updated: {formatLastRefresh()}</span>
              <button onClick={handleRefresh} className="refresh-btn" disabled={isLoading}>
                {isLoading ? '🔄' : '↻'} Refresh
              </button>
            </div>
          </div>
          <div className="user-info">
            <div className="user-details">
              <div 
                className="profile-pic-container clickable" 
                onClick={() => navigate('/profile/edit')}
                title="Click to edit your profile and upload a profile picture"
              >
                {user?.profilePicUrl ? (
                  <img 
                    src={user.profilePicUrl} 
                    alt={user.name}
                    className="profile-pic"
                    key={user.profilePicUrl} // Force re-render when URL changes
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="profile-pic-placeholder">
                    {user?.name?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                )}
              </div>
              <div>
                <p className="user-name">👋 Welcome, {user?.name}!</p>
                <p className="user-role">Role: {user?.role}</p>
              </div>
            </div>
            <div className="header-actions">
              <button
                onClick={() => setShowSearch(true)}
                className="search-button"
                title="Search posts and community"
              >
                🔍 Search
              </button>
              <PrayerNotifications />
              <EventNotifications />
              <button onClick={handleLogout} className="logout-button">
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={handleRefresh}>Try Again</button>
          </div>
        )}

        <div className="dashboard-layout">
          {/* Left Column - Social Feed */}
          <div className="dashboard-left">
            {/* Feed View Toggle */}
            <div className="feed-view-toggle">
              <button
                className={`feed-toggle-btn ${feedView === 'social' ? 'active' : ''}`}
                onClick={() => handleFeedViewChange('social')}
              >
                🌟 Social Feed
              </button>
              <button
                className={`feed-toggle-btn ${feedView === 'activity' ? 'active' : ''}`}
                onClick={() => handleFeedViewChange('activity')}
              >
                📊 Activity Feed
              </button>
            </div>

            {/* Create Post Button */}
            {feedView === 'social' && (
              <div className="create-post-section">
                <button
                  className="create-post-btn"
                  onClick={() => setShowComposer(true)}
                  disabled={isLoading}
                >
                  ✍️ Share Something
                </button>
              </div>
            )}

            {/* Post Composer Modal */}
            {showComposer && (
              <div className="composer-modal-overlay" onClick={() => setShowComposer(false)}>
                <div className="composer-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="composer-close-btn"
                    onClick={() => setShowComposer(false)}
                    aria-label="Close composer"
                  >
                    ✕
                  </button>
                  <PostComposer
                    onPostCreated={handlePostCreated}
                    onCancel={() => setShowComposer(false)}
                    placeholder="Share what's happening in your church community..."
                  />
                </div>
              </div>
            )}

            {/* Feed Content */}
            <div className="dashboard-card">
              {feedView === 'social' ? (
                <PostFeed
                  feedType={feedType}
                  showFilters={true}
                  maxPosts={50}
                  onFeedTypeChange={handleFeedTypeChange}
                  onPostUpdate={(postId, updatedPost) => {
                    // Handle post updates in dashboard context
                    console.log('Post updated in dashboard:', postId, updatedPost);
                  }}
                />
              ) : (
                <ActivityFeed
                  activities={dashboardData?.recentActivity || []}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>

          {/* Right Column - Stats, Actions, Notifications */}
          <div className="dashboard-right">
            <div className="dashboard-card">
              <DashboardStats 
                stats={dashboardData?.stats || {
                  totalMembers: 0,
                  newMembersThisWeek: 0,
                  totalPrayerRequests: 0,
                  activePrayerRequests: 0,
                  answeredPrayerRequests: 0,
                  upcomingEvents: 0,
                  unreadAnnouncements: 0,
                  additionalStats: {}
                }} 
                isLoading={isLoading} 
              />
            </div>

            <div className="dashboard-card">
              <QuickActions 
                actions={dashboardData?.quickActions || []} 
                isLoading={isLoading} 
              />
            </div>

            <div className="dashboard-card">
              <NotificationCenter 
                notifications={dashboardData?.notifications || {
                  totalUnread: 0,
                  prayerRequests: 0,
                  announcements: 0,
                  chatMessages: 0,
                  events: 0,
                  previews: []
                }} 
                isLoading={isLoading} 
              />
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="status-banner">
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 1: Authentication</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 2: User Profiles</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 3: Home/Dashboard</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 4: Chats & Social Network</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 5: Prayer Requests</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 6: Announcements</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 7: Calendar/Events</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Phase 3: Social Feed Integration - COMPLETE!</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Phase 4: Advanced Features - COMPLETE!</span>
          </div>
          <div className="status-item current">
            <span className="status-icon">🎊</span>
            <span>🏆 CHURCH APP - PRODUCTION READY! 🏆</span>
          </div>
        </div>

        {/* Notification System */}
        <NotificationSystem
          position="top-right"
          maxNotifications={50}
          autoHideDelay={5000}
        />

        {/* Search Component */}
        <SearchComponent
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onPostSelect={(post) => {
            // Handle post selection from search
            console.log('Post selected from search:', post);
            // Could navigate to post detail or highlight in feed
          }}
        />
      </main>
    </div>
  );
};

export default Dashboard;