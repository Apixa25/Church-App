import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useActiveContext } from '../contexts/ActiveContextContext';
import { useFeedFilter } from '../contexts/FeedFilterContext';
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
import ContextSwitcher from './ContextSwitcher';
import { FeedType } from '../types/Post';
import PullToRefresh from './PullToRefresh';
import { profileAPI } from '../services/api';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  // Dual Primary System - use both organization context and active context
  const { churchPrimary, familyPrimary, hasChurchPrimary, hasFamilyPrimary } = useOrganization();
  const { 
    activeContext, 
    activeMembership, 
    activeOrganizationName, 
    activeOrganizationLogo,
    activeOrganizationId,
    hasAnyPrimary,
    showContextSwitcher 
  } = useActiveContext();
  
  // Feed filter context - to auto-update filter when context changes
  const { setFilter, activeFilter } = useFeedFilter();
  
  // Legacy compatibility: primaryMembership maps to the currently active context
  const primaryMembership = activeMembership;
  
  // Track previous context to detect changes (for filter updates)
  const prevContextRef = useRef<string | null>(null);
  const prevOrgIdRef = useRef<string | null>(null);
  
  // Track previous context separately for dashboard re-fetch
  const prevDashboardContextRef = useRef<string | null>(null);
  const prevDashboardOrgIdRef = useRef<string | null>(null);
  
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default to social feed - will be adjusted based on primary org status
  const [feedView, setFeedView] = useState<'activity' | 'social'>('social');
  const [feedType, setFeedType] = useState<FeedType>(FeedType.CHRONOLOGICAL); // Make feedType dynamic
  const [showComposer, setShowComposer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0); // Increment to trigger feed refresh
  
  // Social score - hearts state
  const [heartsCount, setHeartsCount] = useState(0);
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(false);
  const [heartLoading, setHeartLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Load hearts data for current user
  useEffect(() => {
    const loadHeartsData = async () => {
      if (user?.userId) {
        try {
          const response = await profileAPI.getUserProfile(user.userId);
          setHeartsCount(response.data.heartsCount || 0);
          setIsLikedByCurrentUser(response.data.isLikedByCurrentUser || false);
        } catch (error) {
          console.error('Error loading hearts data:', error);
        }
      }
    };
    loadHeartsData();
  }, [user?.userId]);

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

  // Check if user has any primary organization (Church OR Family) - used to optimize API calls
  const hasPrimaryOrg = hasAnyPrimary;

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use enhanced dashboard service that includes all features (prayers, announcements, events)
      // Pass hasPrimaryOrg to avoid unnecessary 404 errors for users without a primary org
      // Pass activeOrganizationId to get context-specific data (Church or Family)
      console.log('📊 Dashboard.fetchDashboardData - activeOrganizationId:', activeOrganizationId);
      console.log('📊 Dashboard.fetchDashboardData - activeContext:', activeContext);
      console.log('📊 Dashboard.fetchDashboardData - hasPrimaryOrg:', hasPrimaryOrg);
      const data = await dashboardApi.getDashboardWithAll(hasPrimaryOrg, activeOrganizationId || undefined);
      console.log('📊 Dashboard.fetchDashboardData - received stats:', data.stats);
      console.log('📊 Dashboard.fetchDashboardData - received quickActions count:', data.quickActions?.length);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [hasPrimaryOrg, activeOrganizationId, activeContext]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    await fetchDashboardData();
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

  const handleHeartClick = async () => {
    if (!user?.userId || heartLoading || isLikedByCurrentUser) return;

    setHeartLoading(true);
    try {
      await profileAPI.likeUser(user.userId);
      setHeartsCount(prev => prev + 1);
      setIsLikedByCurrentUser(true);
    } catch (error) {
      console.error('Error liking user:', error);
    } finally {
      setHeartLoading(false);
    }
  };


  // Note: hasPrimaryOrg is defined earlier in the component for API optimization

  // Ensure social-only users default to social feed
  useEffect(() => {
    if (!hasPrimaryOrg && feedView === 'activity') {
      setFeedView('social');
    }
  }, [hasPrimaryOrg, feedView]);

  // Auto-refresh feed and update filter when context changes
  useEffect(() => {
    // Skip on initial mount (when prevContextRef is null)
    if (prevContextRef.current === null) {
      prevContextRef.current = activeContext || 'gathering';
      prevOrgIdRef.current = activeOrganizationId || null;
      return;
    }

    // Check if context or organization actually changed
    const contextChanged = prevContextRef.current !== (activeContext || 'gathering');
    const orgChanged = prevOrgIdRef.current !== (activeOrganizationId || null);

    if ((contextChanged || orgChanged) && activeOrganizationId && (activeContext === 'church' || activeContext === 'family')) {
      // Context changed - automatically set filter to PRIMARY_ONLY for the new organization
      console.log('🔄 Context changed, auto-updating filter to PRIMARY_ONLY for:', activeOrganizationId);
      
      setFilter('PRIMARY_ONLY', [], activeOrganizationId)
        .then(() => {
          // Force feed refresh after filter is updated
          setFeedRefreshKey(prev => prev + 1);
        })
        .catch((error) => {
          console.error('Failed to update filter on context change:', error);
          // Still refresh the feed even if filter update fails
          setFeedRefreshKey(prev => prev + 1);
        });
    }

    // Update refs for next comparison
    prevContextRef.current = activeContext || 'gathering';
    prevOrgIdRef.current = activeOrganizationId || null;
  }, [activeContext, activeOrganizationId, setFilter]);

  // Re-fetch dashboard data when active context or organization changes
  // Use activeOrganizationId as the primary trigger since it changes when context switches
  useEffect(() => {
    // Only fetch if we have a valid organizationId and context
    if (!activeOrganizationId || (activeContext !== 'church' && activeContext !== 'family')) {
      console.log('🔄 Dashboard - Skipping fetch: no orgId or invalid context', { activeOrganizationId, activeContext });
      return;
    }

    const currentContext = activeContext || 'gathering';
    const currentOrgId = activeOrganizationId || null;
    
    console.log('🔄 Dashboard - Context change useEffect triggered');
    console.log('🔄 Dashboard - prevDashboardContextRef.current:', prevDashboardContextRef.current);
    console.log('🔄 Dashboard - currentContext:', currentContext);
    console.log('🔄 Dashboard - prevDashboardOrgIdRef.current:', prevDashboardOrgIdRef.current);
    console.log('🔄 Dashboard - currentOrgId:', currentOrgId);
    
    // Skip on initial mount (when prevDashboardContextRef is null)
    if (prevDashboardContextRef.current === null) {
      console.log('🔄 Dashboard - Initial mount, setting refs and will fetch on next change');
      prevDashboardContextRef.current = currentContext;
      prevDashboardOrgIdRef.current = currentOrgId;
      return;
    }

    // Check if context or organization actually changed
    const contextChanged = prevDashboardContextRef.current !== currentContext;
    const orgChanged = prevDashboardOrgIdRef.current !== currentOrgId;

    console.log('🔄 Dashboard - contextChanged:', contextChanged, 'orgChanged:', orgChanged);
    console.log('🔄 Dashboard - prevContext:', prevDashboardContextRef.current, 'currentContext:', currentContext);
    console.log('🔄 Dashboard - prevOrgId:', prevDashboardOrgIdRef.current, 'currentOrgId:', currentOrgId);

    if (contextChanged || orgChanged) {
      console.log('🔄 Context/Org changed, re-fetching dashboard data for:', activeOrganizationId);
      // Update refs BEFORE fetching to prevent duplicate calls
      prevDashboardContextRef.current = currentContext;
      prevDashboardOrgIdRef.current = currentOrgId;
      // Force a fresh fetch - clear old data first to show loading state
      setDashboardData(null);
      fetchDashboardData();
    } else {
      console.log('🔄 Dashboard - No change detected');
      // Still update refs even if no fetch
      prevDashboardContextRef.current = currentContext;
      prevDashboardOrgIdRef.current = currentOrgId;
    }
  }, [activeContext, activeOrganizationId, fetchDashboardData]);

  // Determine if this is "The Gathering" global organization (no active context)
  const isGatheringGlobal = activeContext === 'gathering' ||
                            activeMembership?.organizationType === 'GLOBAL' || 
                            activeOrganizationName?.includes('The Gathering') ||
                            activeOrganizationName?.includes('Gathering Community');
  
  // Use active context's organization logo as background if available and not The Gathering
  const bannerImageUrl = activeOrganizationLogo && !isGatheringGlobal 
    ? activeOrganizationLogo 
    : '/dashboard-banner.jpg';
    
  // Get display name for header - uses active context
  const displayOrgName = activeOrganizationName || 'The Gathering';

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
              <span className="wheat-emoji">🌾</span>
              {displayOrgName}
            </h1>
          </div>
          <div className="user-info">
            <div className="user-details">
              <div className="dashboard-avatar-wrapper">
                <ClickableAvatar
                  userId={user?.userId || user?.id}
                  profilePicUrl={user?.profilePicUrl}
                  userName={user?.name || 'User'}
                  size="large"
                  className="profile-pic-container"
                  showConnectionStatus={true}
                />
                {/* Heart Button - positioned overlapping bottom-left */}
                <button
                  onClick={handleHeartClick}
                  disabled={heartLoading || isLikedByCurrentUser}
                  className={`dashboard-heart-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                  aria-label={isLikedByCurrentUser ? 'Already liked' : 'Give heart'}
                  title={isLikedByCurrentUser ? 'Already liked' : 'Give heart'}
                >
                  ❤️
                </button>
                
                {/* Hearts Count - overlapping bottom-left */}
                {heartsCount > 0 && (
                  <div className="dashboard-hearts-count">
                    {heartsCount}
                  </div>
                )}
              </div>
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
              {/* Only show Social Feed button when Activity Feed is selected (to switch back) */}
              {feedView !== 'social' && (
                <button
                  className="feed-toggle-btn"
                  onClick={() => handleFeedViewChange('social')}
                >
                  🌟 Social Feed
                </button>
              )}
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
              {/* Context Switcher - only shows when user has both Church and Family primaries */}
              {showContextSwitcher && <ContextSwitcher />}
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
                    placeholder="Share what's happening in your community..."
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
      
      {/* Pull to Refresh for Dashboard Widgets - Window Level */}
      <PullToRefresh onRefresh={handleRefresh} disabled={isLoading} useWindow={true}>
        <div style={{ display: 'none' }}></div>
      </PullToRefresh>
    </div>
  );
};

export default Dashboard;