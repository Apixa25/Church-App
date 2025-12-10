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
import { getImageUrlWithFallback } from '../utils/imageUrlUtils';
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
  const { setFilter, activeFilter, resetFilter } = useFeedFilter();
  
  // Legacy compatibility: primaryMembership maps to the currently active context
  const primaryMembership = activeMembership;
  
  // Track previous context to detect changes (for filter updates)
  const prevContextRef = useRef<string | null>(null);
  const prevOrgIdRef = useRef<string | null>(null);
  
  // Track previous context separately for dashboard re-fetch
  const prevDashboardContextRef = useRef<string | null>(null);
  const prevDashboardOrgIdRef = useRef<string | null>(null);
  
  // Track attempted banner fallbacks to prevent infinite loops
  const bannerFallbackAttemptedRef = useRef<Set<string>>(new Set());
  
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
      console.log('🔄 Dashboard: Received feedRefresh event - refreshing posts...');
      setFeedRefreshKey(prev => prev + 1);
    };

    window.addEventListener('feedRefresh', handleFeedRefresh);
    return () => window.removeEventListener('feedRefresh', handleFeedRefresh);
  }, []);

  // 🎯 Track last activeContext to detect changes
  const lastActiveContextRef = useRef<ActiveContextType>(activeContext);
  const lastActiveOrgIdRef = useRef<string | null>(activeOrganizationId);

  // 🎯 When context changes, trigger feed refresh
  useEffect(() => {
    // Only trigger if context actually changed (not initial mount)
    if (
      lastActiveContextRef.current !== activeContext ||
      lastActiveOrgIdRef.current !== activeOrganizationId
    ) {
      console.log('🔄 Dashboard: Context changed! Triggering feed refresh...', {
        from: { context: lastActiveContextRef.current, orgId: lastActiveOrgIdRef.current },
        to: { context: activeContext, orgId: activeOrganizationId }
      });
      
      // Increment refreshKey to trigger PostFeed refresh
      setFeedRefreshKey(prev => prev + 1);
      
      // Update refs
      lastActiveContextRef.current = activeContext;
      lastActiveOrgIdRef.current = activeOrganizationId;
    }
  }, [activeContext, activeOrganizationId]);

  // Debug: Log render conditions
  useEffect(() => {
    console.log('🔍 Dashboard Render Debug:', {
      feedView,
      hasPrimaryOrg: hasAnyPrimary,
      showContextSwitcher,
      activeContext,
      hasAnyPrimary
    });
  }, [feedView, hasAnyPrimary, showContextSwitcher, activeContext]);

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

  // 🖼️ DEBUG: Log profilePicUrl to identify OAuth image loading issue
  useEffect(() => {
    if (user?.profilePicUrl) {
      console.log('🔍 Dashboard - user.profilePicUrl:', user.profilePicUrl);
    } else {
      console.log('🔍 Dashboard - user.profilePicUrl: MISSING');
    }
  }, [user?.profilePicUrl]);

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

  // 🚀 React Query - Smart caching with stale-while-revalidate
  const { 
    data: dashboardData, 
    isLoading, 
    error: queryError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['dashboard', activeOrganizationId, hasPrimaryOrg],
    queryFn: async () => {
      console.log('📊 Dashboard.useQuery - activeOrganizationId:', activeOrganizationId);
      console.log('📊 Dashboard.useQuery - activeContext:', activeContext);
      console.log('📊 Dashboard.useQuery - hasPrimaryOrg:', hasPrimaryOrg);
      const data = await dashboardApi.getDashboardWithAll(hasPrimaryOrg, activeOrganizationId || undefined);
      console.log('📊 Dashboard.useQuery - received stats:', data.stats);
      console.log('📊 Dashboard.useQuery - received quickActions count:', data.quickActions?.length);
      return data;
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

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          // Filter change will trigger PostFeed refresh automatically via filter change effect
          // No need to manually refresh here - PostFeed listens to filter changes
          console.log('✅ Filter updated, PostFeed will refresh automatically');
        })
        .catch((error) => {
          console.error('Failed to update filter on context change:', error);
          // Only refresh if filter update fails (fallback)
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
    // Allow fetching even without organizationId (for admins or users without primary org)
    // But only if we're authenticated and not in a transitional state
    const shouldFetch = user && (
      // Has valid organizationId with church/family context
      (activeOrganizationId && (activeContext === 'church' || activeContext === 'family')) ||
      // Or in gathering context (no primary org) - still fetch for admin actions
      (activeContext === 'gathering' && !activeOrganizationId)
    );
    
    if (!shouldFetch) {
      console.log('🔄 Dashboard - Skipping fetch: conditions not met', { 
        activeOrganizationId, 
        activeContext, 
        hasUser: !!user 
      });
      // Update refs even when skipping to prevent false change detection on next render
      prevDashboardContextRef.current = activeContext || 'gathering';
      prevDashboardOrgIdRef.current = activeOrganizationId || null;
      return;
    }

    const currentContext = activeContext || 'gathering';
    const currentOrgId = activeOrganizationId || null;
    
    console.log('🔄 Dashboard - Context change useEffect triggered');
    console.log('🔄 Dashboard - prevDashboardContextRef.current:', prevDashboardContextRef.current);
    console.log('🔄 Dashboard - currentContext:', currentContext);
    console.log('🔄 Dashboard - prevDashboardOrgIdRef.current:', prevDashboardOrgIdRef.current);
    console.log('🔄 Dashboard - currentOrgId:', currentOrgId);
    
    // Handle initial mount - fetch data if we have a valid organizationId
    if (prevDashboardContextRef.current === null) {
      console.log('🔄 Dashboard - Initial mount, checking if we should fetch');
      prevDashboardContextRef.current = currentContext;
      prevDashboardOrgIdRef.current = currentOrgId;
      
      // Fetch data on initial mount if conditions are met
      // This handles the case when user first logs in and contexts are ready
      // Note: React Query will automatically fetch on mount, so this is mainly for logging
      if (shouldFetch) {
        console.log('🔄 Dashboard - Initial mount with valid conditions, React Query will fetch dashboard data');
      } else {
        console.log('🔄 Dashboard - Initial mount but conditions not met yet, will fetch when ready');
      }
      return;
    }

    // Check if context or organization actually changed
    const contextChanged = prevDashboardContextRef.current !== currentContext;
    const orgChanged = prevDashboardOrgIdRef.current !== currentOrgId;

    console.log('🔄 Dashboard - contextChanged:', contextChanged, 'orgChanged:', orgChanged);
    console.log('🔄 Dashboard - prevContext:', prevDashboardContextRef.current, 'currentContext:', currentContext);
    console.log('🔄 Dashboard - prevOrgId:', prevDashboardOrgIdRef.current, 'currentOrgId:', currentOrgId);

    if (contextChanged || orgChanged) {
      console.log('🔄 Context/Org changed, React Query will automatically refetch dashboard data for:', activeOrganizationId);
      // Update refs BEFORE fetching to prevent duplicate calls
      prevDashboardContextRef.current = currentContext;
      prevDashboardOrgIdRef.current = currentOrgId;
      // React Query automatically refetches when query key changes (activeOrganizationId)
      // Force a manual refetch to ensure fresh data
      refetchDashboard();
      // Note: Feed will refresh automatically when filter changes (handled in filter change effect above)
      // No need to manually refresh feed here - PostFeed uses React Query cache and will update when filter changes
    } else {
      console.log('🔄 Dashboard - No change detected');
      // Still update refs even if no fetch
      prevDashboardContextRef.current = currentContext;
      prevDashboardOrgIdRef.current = currentOrgId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContext, activeOrganizationId]);

  // Handle reset flag from Home button click - reset dashboard to initial state
  // NOTE: This is now only triggered by explicit double-tap, not regular navigation
  useEffect(() => {
    const resetState = (location.state as any)?.reset === true;
    if (resetState) {
      console.log('🔄 Dashboard reset triggered - restoring initial state (explicit refresh)');
      
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
  
  // 🖼️ DEBUG: Log banner image decision
  const userBannerImage = user?.bannerImageUrl;
  const hasUserBanner = userBannerImage && typeof userBannerImage === 'string' && userBannerImage.trim() !== '';
  
  // Get user banner with S3 fallback (like profile pictures)
  const userBannerUrls = userBannerImage ? getImageUrlWithFallback(userBannerImage) : null;
  
  // Determine banner image with priority (CORRECTED):
  // 1. User banner image takes priority when logged in (personal customization)
  // 2. Organization logo (if no user banner)
  // 3. Fallback to default banner
  const hasOrgLogo = activeOrganizationLogo && !isGatheringGlobal;
  const shouldUseUserBanner = hasUserBanner && userBannerUrls;
  const shouldUseOrgLogo = !shouldUseUserBanner && hasOrgLogo;
  
  console.log('🖼️ Banner Image Debug:', {
    activeContext,
    activeOrganizationLogo,
    activeOrganizationName,
    activeMembershipType: activeMembership?.organizationType,
    activeMembershipLogoUrl: activeMembership?.organizationLogoUrl,
    isGatheringGlobal,
    hasOrgLogo,
    hasUserBanner,
    shouldUseOrgLogo,
    shouldUseUserBanner
  });
  
  // Determine banner image with priority:
  // 1. User banner image (if logged in and has banner)
  // 2. Organization logo (if no user banner)
  // 3. Default banner
  const bannerImageUrl = shouldUseUserBanner && userBannerUrls
    ? userBannerUrls.primary
    : shouldUseOrgLogo
      ? activeOrganizationLogo
      : '/dashboard-banner.jpg';
  
  // Determine fallback order for error handling
  // In family context: user banner (CloudFront) → user banner (S3) → family org logo → default Gathering image
  const userBannerS3Fallback = userBannerUrls?.fallback && userBannerUrls.fallback !== userBannerUrls.primary
    ? userBannerUrls.fallback
    : null;
  const familyOrgFallback = activeContext === 'family' && activeOrganizationLogo && !isGatheringGlobal 
    ? activeOrganizationLogo 
    : null;
  
  // Reset fallback tracking when banner URL changes (context/user change)
  useEffect(() => {
    bannerFallbackAttemptedRef.current.clear();
  }, [bannerImageUrl, activeContext, activeOrganizationId]);
  
  const decision = shouldUseUserBanner ? 'USER_BANNER' : (shouldUseOrgLogo ? 'ORG_LOGO' : 'DEFAULT');
  console.log('🖼️ Final bannerImageUrl:', bannerImageUrl, '| Decision:', decision, '| Org logo available:', hasOrgLogo, '| User banner available:', hasUserBanner);
    
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
            // Only use crossOrigin in production - localhost has CORS issues with CloudFront
            {...(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
              ? {} 
              : { crossOrigin: 'anonymous' })}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const currentSrc = target.src;
              
              // Extract just the filename/unique ID from URLs for comparison (more reliable than full URL match)
              const getUrlId = (url: string) => {
                try {
                  const parts = url.split('/');
                  return parts[parts.length - 1] || url;
                } catch {
                  return url;
                }
              };
              
              const currentId = getUrlId(currentSrc);
              const userBannerPrimaryId = userBannerUrls?.primary ? getUrlId(userBannerUrls.primary) : '';
              const userBannerS3Id = userBannerS3Fallback ? getUrlId(userBannerS3Fallback) : '';
              const familyOrgId = familyOrgFallback ? getUrlId(familyOrgFallback) : '';
              
              const isUserBannerCloudFront = userBannerUrls?.primary && (currentSrc === userBannerUrls.primary || currentId === userBannerPrimaryId);
              const isUserBannerS3 = userBannerS3Fallback && (currentSrc === userBannerS3Fallback || currentId === userBannerS3Id);
              const isFamilyOrgLogo = familyOrgFallback && (currentSrc === familyOrgFallback || currentId === familyOrgId);
              const isDefault = currentSrc.includes('/dashboard-banner.jpg');
              
              // Check if we've already attempted this fallback to prevent infinite loops
              const hasAttemptedFallback = (fallbackUrl: string | null) => {
                if (!fallbackUrl) return false;
                const fallbackId = getUrlId(fallbackUrl);
                return bannerFallbackAttemptedRef.current.has(fallbackId);
              };
              
              // Mark current URL as attempted
              bannerFallbackAttemptedRef.current.add(currentId);
              
              console.warn('⚠️ Banner image failed to load:', {
                currentSrc,
                currentId,
                activeContext,
                isUserBannerCloudFront,
                isUserBannerS3,
                isFamilyOrgLogo,
                isDefault,
                userBannerPrimaryId,
                userBannerS3Id,
                familyOrgId,
                shouldUseUserBanner,
                attemptedFallbacks: Array.from(bannerFallbackAttemptedRef.current)
              });
              
              // Priority fallback order for family context:
              // 1. User banner CloudFront fails → try user banner S3
              // 2. User banner S3 fails → try family org logo
              // 3. Family org logo fails → use default Gathering image
              if (activeContext === 'family' && isUserBannerCloudFront && userBannerS3Fallback && !hasAttemptedFallback(userBannerS3Fallback)) {
                // User banner CloudFront failed, try S3 fallback
                console.warn('⚠️ User banner CloudFront URL failed, trying S3 fallback');
                bannerFallbackAttemptedRef.current.add(getUrlId(userBannerS3Fallback));
                target.src = userBannerS3Fallback;
              } else if (activeContext === 'family' && isUserBannerS3 && familyOrgFallback && !hasAttemptedFallback(familyOrgFallback)) {
                // User banner S3 also failed, try family org logo
                console.warn('⚠️ User banner S3 URL failed, trying family organization logo');
                bannerFallbackAttemptedRef.current.add(getUrlId(familyOrgFallback));
                target.src = familyOrgFallback;
              } else if (activeContext === 'family' && isFamilyOrgLogo && !hasAttemptedFallback('/dashboard-banner.jpg')) {
                // Family org logo also failed, use default
                console.warn('⚠️ Family organization logo failed, falling back to default Gathering image');
                bannerFallbackAttemptedRef.current.add('dashboard-banner.jpg');
                target.src = '/dashboard-banner.jpg';
              } else if (!isDefault && !hasAttemptedFallback('/dashboard-banner.jpg')) {
                // For other contexts or unexpected errors, use default
                console.warn('⚠️ Banner image failed, falling back to default');
                bannerFallbackAttemptedRef.current.add('dashboard-banner.jpg');
                target.src = '/dashboard-banner.jpg';
              } else {
                // All fallbacks exhausted or already attempted, hide the image to prevent infinite loop
                console.error('⚠️ All banner image fallbacks failed or already attempted, hiding image to prevent infinite loop');
                target.style.display = 'none';
                // Reset attempted fallbacks for next banner load
                bannerFallbackAttemptedRef.current.clear();
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
              <button onClick={handleLogout} className="logout-button">
                🚪
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Warning Banner - shows at top of dashboard if user has warnings */}
        <WarningBanner onViewWarnings={() => setShowWarningsSection(true)} />

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
              {/* Only show Activity Feed button if user has primary org AND not already on Activity Feed */}
              {hasPrimaryOrg && feedView !== 'activity' && (
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