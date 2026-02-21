import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useActiveContext, ActiveContextType } from '../contexts/ActiveContextContext';
import { useFeedFilter } from '../contexts/FeedFilterContext';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { profileAPI } from '../services/api';
import WarningBanner from './WarningBanner';
import WarningsSection from './WarningsSection';
import NotificationPermissionBanner from './NotificationPermissionBanner';
import { getBannerImageUrl, getBannerImageS3Fallback } from '../utils/imageUrlUtils';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  // Dual Primary System - use both organization context and active context
  const { churchPrimary, familyPrimary, hasChurchPrimary, hasFamilyPrimary } = useOrganization();
  const {
    activeContext,
    activeMembership,
    activeOrganizationName,
    activeOrganizationLogo,
    activeOrganizationId,
    activeGroupId,
    activeGroupDescription,
    activeGroupCreatorId,
    activeGroupCreatorName,
    hasAnyPrimary,
    showContextSwitcher
  } = useActiveContext();
  
  // Feed filter context - to auto-update filter when context changes
  const { setFilter, activeFilter, resetFilter } = useFeedFilter();
  
  // Legacy compatibility: primaryMembership maps to the currently active context
  const primaryMembership = activeMembership;
  
  const navigate = useNavigate();
  const location = useLocation();
  // Default to social feed - will be adjusted based on primary org status
  const [feedView, setFeedView] = useState<'activity' | 'social'>('social');
  const [feedType, setFeedType] = useState<FeedType>(FeedType.CHRONOLOGICAL); // Make feedType dynamic
  const [showComposer, setShowComposer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0); // Increment to trigger feed refresh
  const [showWarningsSection, setShowWarningsSection] = useState(false);

  // 🔄 Listen for feedRefresh event from BottomNav double-tap
  useEffect(() => {
    const handleFeedRefresh = () => {
      setFeedRefreshKey(prev => prev + 1);
    };

    window.addEventListener('feedRefresh', handleFeedRefresh);
    return () => window.removeEventListener('feedRefresh', handleFeedRefresh);
  }, []);

  // 🎯 CONSOLIDATED: Single ref to track context changes (prevents duplicate effects)
  // This replaces multiple overlapping refs and effects
  const contextStateRef = useRef<{
    context: string | null;
    orgId: string | null;
    initialized: boolean;
  }>({ context: null, orgId: null, initialized: false });

  // Social score - hearts state
  const [heartsCount, setHeartsCount] = useState(0);
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(false);
  const [heartLoading, setHeartLoading] = useState(false);

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


  // Refresh user data only when returning from profile page (not on every render!)
  // This prevents infinite loops while ensuring bannerImageUrl is current
  const prevPathnameRef = useRef<string>(location.pathname);
  const hasRefreshedRef = useRef<boolean>(false);
  
  useEffect(() => {
    const refreshUserData = async () => {
      if (user?.userId && updateUser && !hasRefreshedRef.current) {
        try {
          // Import profileAPI dynamically to avoid circular dependency
          const { profileAPI } = await import('../services/api');
          const response = await profileAPI.getMyProfile();
          const freshUserData = response.data;
          
          // Only update if data actually changed to prevent loops
          if (user.userId === freshUserData.userId && 
              user.bannerImageUrl !== freshUserData.bannerImageUrl) {
            hasRefreshedRef.current = true;
            updateUser({
              bannerImageUrl: freshUserData.bannerImageUrl
            });
            // Reset after a delay to allow future refreshes
            setTimeout(() => {
              hasRefreshedRef.current = false;
            }, 1000);
          }
        } catch (error) {
          console.error('Failed to refresh user data in Dashboard:', error);
        }
      }
    };

    // Only refresh when pathname changes from profile back to dashboard
    const wasOnProfile = prevPathnameRef.current.includes('/profile');
    const isOnDashboard = location.pathname === '/dashboard' || location.pathname === '/';
    
    if (wasOnProfile && isOnDashboard) {
      hasRefreshedRef.current = false; // Reset flag when navigating back
      refreshUserData();
    }
    
    prevPathnameRef.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Check if user has any primary organization (Church OR Family) - used to optimize API calls
  const hasPrimaryOrg = hasAnyPrimary;

  // Check for ?view=activity URL parameter (from Quick Actions navigation)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('view') === 'activity' && hasPrimaryOrg) {
      setFeedView('activity');
    }
  }, [location.search, hasPrimaryOrg]);

  // 🚀 React Query - Smart caching with stale-while-revalidate
  const { 
    data: dashboardData, 
    isLoading, 
    error: queryError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['dashboard', activeOrganizationId, hasPrimaryOrg],
    queryFn: async () => {
      return await dashboardApi.getDashboardWithAll(hasPrimaryOrg, activeOrganizationId || undefined);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    // This will:
    // 1. Check cache first - if data exists and is fresh, use it immediately (no loading!)
    // 2. Show cached data while fetching fresh data in background
    // 3. Only show loading if no cached data exists
  });

  // Convert query error to string for compatibility
  const error = queryError ? 'Failed to load dashboard data. Please try again.' : null;

  const handleFindOrganizations = () => {
    navigate('/organizations');
  };

  const handleRefresh = async () => {
    await refetchDashboard();
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

  // ============================================================================
  // 🎯 CONSOLIDATED CONTEXT CHANGE HANDLER (replaces 3 separate useEffects)
  // This single effect handles: filter updates, dashboard refetch, and feed refresh
  // ============================================================================
  useEffect(() => {
    const currentContext = activeContext || 'gathering';
    const currentOrgId = activeOrganizationId || null;
    const currentGroupId = activeGroupId || null;
    const prevState = contextStateRef.current;

    // Check if this is initial mount
    if (!prevState.initialized) {
      contextStateRef.current = {
        context: currentContext,
        orgId: currentOrgId,
        initialized: true
      };
      return; // Skip on initial mount - React Query handles initial fetch
    }

    // Check if context or organization actually changed
    const contextChanged = prevState.context !== currentContext;
    const orgChanged = prevState.orgId !== currentOrgId;

    // Exit early if nothing changed (most common case)
    if (!contextChanged && !orgChanged) {
      return;
    }

    // Update ref FIRST to prevent duplicate processing
    contextStateRef.current = {
      context: currentContext,
      orgId: currentOrgId,
      initialized: true
    };


    // Handle context change - do all updates in ONE place
    if (currentContext === 'group' && currentGroupId) {
      // Group context - filter to show only this group's posts
      setFilter('SELECTED_GROUPS', [currentGroupId]).catch((error) => {
        console.error('Failed to update filter on group context change:', error);
      });
    } else if (currentOrgId && (currentContext === 'church' || currentContext === 'family')) {
      // Organization context - filter to primary org
      setFilter('PRIMARY_ONLY', [], currentOrgId).catch((error) => {
        console.error('Failed to update filter on context change:', error);
      });

      // 2. Dashboard data will auto-refetch via React Query (queryKey includes activeOrganizationId)
      // No need to call refetchDashboard() - it's redundant!
    }

    // Note: We do NOT call setFeedRefreshKey here anymore!
    // PostFeed will refresh automatically when filter changes OR when queryKey changes
    // This eliminates the duplicate refresh problem

  }, [activeContext, activeOrganizationId, activeGroupId, setFilter]);

  // Handle reset flag from Home button click - reset dashboard to initial state
  // NOTE: This is now only triggered by explicit double-tap, not regular navigation
  useEffect(() => {
    const resetState = (location.state as any)?.reset === true;
    if (resetState) {
      
      // Reset all dashboard state to initial values (like fresh login)
      setFeedView('social');
      setFeedType(FeedType.CHRONOLOGICAL);
      setShowComposer(false);
      setShowSearch(false);
      setShowWarningsSection(false);
      
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset feed filter to default (EVERYTHING) - optional, can be removed if filters should persist
      resetFilter().catch(err => {
        console.error('Failed to reset feed filter:', err);
        // Continue with reset even if filter reset fails
      });
      
      // Force refresh of dashboard data (React Query will check if stale)
      refetchDashboard();
      
      // Force refresh of feed by incrementing refresh key (explicit user action)
      setFeedRefreshKey(prev => prev + 1);
      
      // Clear the reset flag from location state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, refetchDashboard, navigate, location.pathname, resetFilter]);

  // Determine if this is "The Gathering" global organization (no active context)
  const isGatheringGlobal = activeContext === 'gathering' ||
                            activeMembership?.organizationType === 'GLOBAL' || 
                            activeOrganizationName?.includes('The Gathering') ||
                            activeOrganizationName?.includes('Gathering Community');
  
  // 🎯 CONTEXT-AWARE banner image priority:
  // - CHURCH context: Organization controls the banner (church branding)
  // - FAMILY context: User controls the banner (personal preference)
  // - GATHERING context: Organization banner if available, else user's, else default
  const userBannerImage = user?.bannerImageUrl;
  const hasUserBanner = userBannerImage && typeof userBannerImage === 'string' && userBannerImage.trim() !== '';
  const hasOrgLogo = activeOrganizationLogo && !isGatheringGlobal;
  
  // Determine banner priority based on context type
  let bannerImageUrl: string;
  let s3FallbackUrl: string | null;
  
  if (activeContext === 'family') {
    // 🏠 FAMILY CONTEXT: User's personal image takes priority
    // Each family member sees their own preferred banner for personalization
    bannerImageUrl = hasUserBanner
      ? getBannerImageUrl(userBannerImage)
      : hasOrgLogo
        ? getBannerImageUrl(activeOrganizationLogo)
        : '/dashboard-banner.jpg';
    
    s3FallbackUrl = hasUserBanner
      ? getBannerImageS3Fallback(userBannerImage)
      : hasOrgLogo
        ? getBannerImageS3Fallback(activeOrganizationLogo)
        : null;
  } else {
    // ⛪ CHURCH CONTEXT (or Gathering): Organization image takes priority
    // Church controls what members see on their dashboard for branding consistency
    bannerImageUrl = hasOrgLogo
      ? getBannerImageUrl(activeOrganizationLogo)
      : hasUserBanner
        ? getBannerImageUrl(userBannerImage)
        : '/dashboard-banner.jpg';
    
    s3FallbackUrl = hasOrgLogo
      ? getBannerImageS3Fallback(activeOrganizationLogo)
      : hasUserBanner
        ? getBannerImageS3Fallback(userBannerImage)
        : null;
  }
  
  // Final fallback order: CloudFront -> S3 -> Org Logo -> Default
  const fallbackUrl = s3FallbackUrl || (hasOrgLogo ? getBannerImageUrl(activeOrganizationLogo) : '/dashboard-banner.jpg');
  
  // Debug logging to help diagnose banner issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ Dashboard Banner Selection:', {
        userBannerImage,
        hasUserBanner,
        activeOrganizationLogo,
        hasOrgLogo,
        bannerImageUrl,
        activeContext
      });
    }
  }, [userBannerImage, hasUserBanner, activeOrganizationLogo, hasOrgLogo, bannerImageUrl, activeContext]);
  
  // Get display name for header - uses active context
  const displayOrgName = activeOrganizationName || 'The Gathering';

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        {/* Banner Image Background */}
        <div className="dashboard-banner-background">
          <img 
            key={bannerImageUrl} // Force re-render when URL changes
            src={bannerImageUrl}
            alt={primaryMembership?.organizationName || 'Church banner'} 
            className="banner-bg-image"
            onError={(e) => {
              // Fallback chain: CloudFront -> S3 -> Org Logo -> Default
              const target = e.target as HTMLImageElement;
              const currentSrc = target.src;
              
              if (process.env.NODE_ENV === 'development') {
                console.error('❌ Banner image failed to load:', currentSrc);
              }
              
              // Check which fallback to try
              const isCloudFront = currentSrc.includes('cloudfront.net');
              const isS3 = currentSrc.includes('.s3.') && currentSrc.includes('.amazonaws.com');
              const isDefault = currentSrc.includes('/dashboard-banner.jpg');
              
              if (isCloudFront && s3FallbackUrl && !target.dataset.s3FallbackAttempted) {
                // CloudFront failed, try S3
                target.dataset.s3FallbackAttempted = 'true';
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔄 CloudFront failed, trying S3:', s3FallbackUrl);
                }
                target.src = s3FallbackUrl;
              } else if (isS3 && fallbackUrl && fallbackUrl !== s3FallbackUrl && !target.dataset.orgFallbackAttempted) {
                // S3 failed, try org logo or default
                target.dataset.orgFallbackAttempted = 'true';
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔄 S3 failed, trying fallback:', fallbackUrl);
                }
                target.src = fallbackUrl;
              } else if (!isDefault) {
                // Final fallback to default
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔄 Falling back to default banner');
                }
                target.src = '/dashboard-banner.jpg';
              }
            }}
            onLoad={() => {
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Banner image loaded successfully:', bannerImageUrl);
              }
            }}
          />
          <div className="banner-overlay"></div>
        </div>
        
        <div className="header-content">
          <div className="header-left">
            <h1>
              <img 
                src="/app-logo.png" 
                alt="The Gathering" 
                className="app-logo-header"
                onError={(e) => {
                  // Fallback to existing logo if app-logo.png doesn't exist
                  const target = e.target as HTMLImageElement;
                  if (target.src !== `${window.location.origin}/logo192.png`) {
                    target.src = '/logo192.png';
                  }
                }}
              />
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
                🔍
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="settings-button"
                title="App Settings"
              >
                ⚙️
              </button>
              {/* Only show prayer and event notifications if user has primary org */}
              {hasPrimaryOrg && (
                <>
                  <PrayerNotifications />
                  <EventNotifications />
                </>
              )}
              <button
                onClick={handleFindOrganizations}
                className="logout-button"
                title="Find Organizations"
                aria-label="Find Organizations"
              >
                🏛️
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Group Info Section - Only shows when viewing a group context */}
      {activeContext === 'group' && (activeGroupDescription || activeGroupCreatorName) && (
        <div className="group-info-section">
          {activeGroupDescription && (
            <p className="group-description">{activeGroupDescription}</p>
          )}
          {activeGroupCreatorName && (
            <p className="group-creator">
              Created by{' '}
              {activeGroupCreatorId ? (
                <span
                  className="creator-link"
                  onClick={() => navigate(`/profile/${activeGroupCreatorId}`)}
                >
                  {activeGroupCreatorName}
                </span>
              ) : (
                activeGroupCreatorName
              )}
            </p>
          )}
        </div>
      )}

      <main className="dashboard-content">
        {/* Warning Banner - shows at top of dashboard if user has warnings */}
        <WarningBanner onViewWarnings={() => setShowWarningsSection(true)} />

        {/* Notification Permission Banner - prompts user to enable push notifications */}
        <NotificationPermissionBanner />

        {/* Warnings Section Modal */}
        {showWarningsSection && (
          <div className="modal-overlay" onClick={() => setShowWarningsSection(false)}>
            <div className="modal-content warnings-modal" onClick={(e) => e.stopPropagation()}>
              <WarningsSection onClose={() => setShowWarningsSection(false)} />
            </div>
          </div>
        )}

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
              {/* Activity Feed button hidden - now accessible via Quick Actions */}
              {false && hasPrimaryOrg && feedView !== 'activity' && (
                <button
                  className="feed-toggle-btn"
                  onClick={() => handleFeedViewChange('activity')}
                >
                  📊 Activity Feed
                </button>
              )}
              {/* Multi-tenant feed filter - available in both feed views */}
              <FeedFilterSelector />
              {/* Context Switcher - only shows when user has both Church and Family primaries */}
              {showContextSwitcher && <ContextSwitcher />}
            </div>

            {/* Make Post Button - Desktop Only, between feed filter and feed navigation buttons */}
            {feedView === 'social' && (
              <div className="make-post-section">
                <button
                  className="make-post-btn"
                  onClick={() => setShowComposer(true)}
                  disabled={isLoading}
                >
                  Make Post
                </button>
              </div>
            )}

            {/* Create Post Button */}
            {feedView === 'social' && (
              <div className="create-post-section">
                <button
                  className="create-post-btn"
                  onClick={() => setShowComposer(true)}
                  disabled={isLoading}
                >
                  ✍️ Post Something
                </button>
              </div>
            )}

            {/* Post Composer Modal */}
            {showComposer && (
              <div className="composer-modal-overlay" onClick={() => setShowComposer(false)}>
                <div className="composer-modal-content" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
};

export default Dashboard;