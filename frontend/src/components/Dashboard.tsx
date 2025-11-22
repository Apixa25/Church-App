import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import dashboardApi, { DashboardResponse } from '../services/dashboardApi';
import ActivityFeed from './ActivityFeed';
import PostFeed from './PostFeed';
import PostComposer from './PostComposer';
import QuickActions from './QuickActions';
import DashboardStats from './DashboardStats';
import PrayerNotifications from './PrayerNotifications';
import EventNotifications from './EventNotifications';
import SearchComponent from './SearchComponent';
import QuickDonationWidget from './QuickDonationWidget';
import ClickableAvatar from './ClickableAvatar';
import FeedFilterSelector from './FeedFilterSelector';
import { FeedType } from '../types/Post';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { primaryMembership } = useOrganization();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  // Default to social feed - will be adjusted based on primary org status
  const [feedView, setFeedView] = useState<'activity' | 'social'>('social');
  const [feedType, setFeedType] = useState<FeedType>(FeedType.CHRONOLOGICAL); // Make feedType dynamic
  const [showComposer, setShowComposer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0); // Increment to trigger feed refresh

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
              addressLine1: freshUserData.addressLine1,
              addressLine2: freshUserData.addressLine2,
              city: freshUserData.city,
              stateProvince: freshUserData.stateProvince,
              postalCode: freshUserData.postalCode,
              country: freshUserData.country,
              latitude: freshUserData.latitude,
              longitude: freshUserData.longitude,
              geocodeStatus: freshUserData.geocodeStatus,
              birthday: freshUserData.birthday,
              spiritualGift: freshUserData.spiritualGift,
              equippingGifts: freshUserData.equippingGifts
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
    // The PostFeed component will handle refreshing itself via refreshKey
    setShowComposer(false);
    // Increment refreshKey to trigger PostFeed refresh
    setFeedRefreshKey(prev => prev + 1);
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

  // Check if user has primary organization
  const hasPrimaryOrg = primaryMembership !== null;

  // Ensure social-only users default to social feed
  useEffect(() => {
    if (!hasPrimaryOrg && feedView === 'activity') {
      setFeedView('social');
    }
  }, [hasPrimaryOrg, feedView]);

  // Determine if this is "The Gathering" global organization
  const isGatheringGlobal = primaryMembership?.organizationType === 'GLOBAL' || 
                            primaryMembership?.organizationName?.includes('The Gathering') ||
                            primaryMembership?.organizationName?.includes('Gathering Community');
  
  // Use organization logo as background if available and not The Gathering
  const bannerImageUrl = primaryMembership?.organizationLogoUrl && !isGatheringGlobal 
    ? primaryMembership.organizationLogoUrl 
    : '/dashboard-banner.jpg';

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        {/* Banner Image Background */}
        <div className="dashboard-banner-background">
          <img 
            src={bannerImageUrl} 
            alt={primaryMembership?.organizationName || 'Church banner'} 
            className="banner-bg-image"
            onError={(e) => {
              // Fallback to default banner if organization logo fails to load
              const target = e.target as HTMLImageElement;
              if (target.src !== '/dashboard-banner.jpg') {
                target.src = '/dashboard-banner.jpg';
              } else {
                target.style.display = 'none';
              }
            }}
          />
          <div className="banner-overlay"></div>
        </div>
        
        <div className="header-content">
          <div className="header-left">
            <h1>
              {isGatheringGlobal 
                ? `🌾 ${primaryMembership?.organizationName || 'The Gathrd'}`
                : primaryMembership?.organizationName || 'The Gathrd'
              }
            </h1>
            <div className="refresh-info">
              <span>Last updated: {formatLastRefresh()}</span>
              <button onClick={handleRefresh} className="refresh-btn" disabled={isLoading}>
                {isLoading ? '🔄' : '↻'} Refresh
              </button>
            </div>
          </div>
          <div className="user-info">
            <div className="user-details">
              <ClickableAvatar
                userId={user?.userId || user?.id}
                profilePicUrl={user?.profilePicUrl}
                userName={user?.name || 'User'}
                size="large"
                className="profile-pic-container"
                showConnectionStatus={true}
              />
              <div>
                <p className="user-name">👋 Welcome, {user?.name}!</p>
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
              <button
                onClick={() => navigate('/settings')}
                className="settings-button"
                title="App Settings"
              >
                ⚙️ Settings
              </button>
              {/* Only show prayer and event notifications if user has primary org */}
              {hasPrimaryOrg && (
                <>
                  <PrayerNotifications />
                  <EventNotifications />
                </>
              )}
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
              {/* Only show Activity Feed button if user has primary org */}
              {hasPrimaryOrg && (
                <button
                  className={`feed-toggle-btn ${feedView === 'activity' ? 'active' : ''}`}
                  onClick={() => handleFeedViewChange('activity')}
                >
                  📊 Activity Feed
                </button>
              )}
              {/* Multi-tenant feed filter */}
              {feedView === 'social' && <FeedFilterSelector />}
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
                  refreshKey={feedRefreshKey}
                  onFeedTypeChange={handleFeedTypeChange}
                  onPostUpdate={(postId, updatedPost) => {
                    // Handle post updates in dashboard context
                    console.log('Post updated in dashboard:', postId, updatedPost);
                  }}
                />
              ) : hasPrimaryOrg ? (
                <ActivityFeed
                  activities={dashboardData?.recentActivity || []}
                  isLoading={isLoading}
                />
              ) : (
                <PostFeed
                  feedType={feedType}
                  showFilters={true}
                  maxPosts={50}
                  refreshKey={feedRefreshKey}
                  onFeedTypeChange={handleFeedTypeChange}
                  onPostUpdate={(postId, updatedPost) => {
                    // Handle post updates in dashboard context
                    console.log('Post updated in dashboard:', postId, updatedPost);
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Column - Stats, Actions, Notifications */}
          <div className="dashboard-right">
            {/* Only show Community Stats if user has primary org */}
            {hasPrimaryOrg && (
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
            )}

            <div className="dashboard-card">
              <QuickActions 
                actions={dashboardData?.quickActions || []} 
                isLoading={isLoading} 
              />
            </div>

            {/* Only show Quick Giving if user has primary org */}
            {hasPrimaryOrg && (
              <div className="dashboard-card">
                <QuickDonationWidget />
              </div>
            )}
          </div>
        </div>

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