import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { profileAPI } from '../services/api';
import { UserProfile, ProfileCompletionStatus } from '../types/Profile';
import { useAuth } from '../contexts/AuthContext';
import ProfileEdit from './ProfileEdit';
import { Post } from '../types/Post';
import { getUserPosts, getBookmarkedPosts, getUserShareStats, followUser, unfollowUser, getFollowStatus, blockUser, unblockUser, getBlockStatus, recordProfileView } from '../services/postApi';
import FollowersList from './FollowersList';
import FollowingList from './FollowingList';
import ProfileAnalytics from './ProfileAnalytics';
import PostCard from './PostCard';
import RepliesList from './RepliesList';
import MediaGrid from './MediaGrid';
import { parseEventDate, formatBirthdayDate } from '../utils/dateUtils';
import chatApi from '../services/chatApi';
import OrganizationSelector from './OrganizationSelector';
import { useOrganization } from '../contexts/OrganizationContext';
import { Membership } from '../contexts/OrganizationContext';
import FamilyGroupCreateForm from './FamilyGroupCreateForm';
import './ProfileView.css';

interface ProfileViewProps {
  userId?: string;
  showEditButton?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId: propUserId, showEditButton = true }) => {
  const { user } = useAuth();
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = propUserId || paramUserId;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'bookmarks' | 'analytics'>('posts');
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsCount, setPostsCount] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [sharesReceived, setSharesReceived] = useState(0);

  // Bookmarks state
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bookmarksError, setBookmarksError] = useState<string | null>(null);
  const [bookmarksPage, setBookmarksPage] = useState(0);
  const [hasMoreBookmarks, setHasMoreBookmarks] = useState(true);

  // Direct message state
  const [creatingDM, setCreatingDM] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  
  // Block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Social score - hearts state
  const [heartsCount, setHeartsCount] = useState(0);
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(false);
  const [heartLoading, setHeartLoading] = useState(false);

  // Organization memberships state (for viewing other users' profiles)
  const [organizationMemberships, setOrganizationMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  const isOwnProfile = !userId || userId === user?.userId;
  const targetUserId = userId || user?.userId || '';
  
  // Get memberships from context for own profile
  const { allMemberships, familyPrimary, refreshMemberships } = useOrganization();
  
  // Family group creation state
  const [showCreateFamilyGroup, setShowCreateFamilyGroup] = useState(false);

  const loadShareStats = useCallback(async (targetId: string) => {
    try {
      const stats = await getUserShareStats(targetId);
      setSharesReceived(stats?.sharesReceived ?? 0);
    } catch (err) {
      console.error('Error loading share stats:', err);
      setSharesReceived(0);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSharesReceived(0);

      // If we have a specific userId and it's not our own profile, get that user's profile
      // Otherwise, get our own profile
      const response = (userId && userId !== user?.userId) 
        ? await profileAPI.getUserProfile(userId)
        : await profileAPI.getMyProfile();
      
      setProfile(response.data);
      setImageError(false); // Reset image error when profile loads
      // Set hearts data
      setHeartsCount(response.data.heartsCount || 0);
      setIsLikedByCurrentUser(response.data.isLikedByCurrentUser || false);

      if (targetUserId) {
        await loadShareStats(targetUserId);
      }

      // Check follow status if viewing another user's profile
      if (!isOwnProfile && user?.userId && userId) {
        try {
          const followStatus = await getFollowStatus(userId);
          setIsFollowing(followStatus.isFollowing);
        } catch (err) {
          console.error('Error checking follow status:', err);
        }

        // Check block status
        try {
          const blockStatus = await getBlockStatus(userId);
          setIsBlocked(blockStatus.isBlocked || false);
        } catch (err) {
          console.error('Error checking block status:', err);
          setIsBlocked(false);
        }

        // Fetch organization memberships for other user's profile
        try {
          setMembershipsLoading(true);
          const response = await profileAPI.getUserMemberships(userId);
          setOrganizationMemberships(response.data || []);
        } catch (err) {
          console.error('Error fetching organization memberships:', err);
          setOrganizationMemberships([]);
        } finally {
          setMembershipsLoading(false);
        }
      } else {
        // Reset memberships when viewing own profile (will use context)
        setOrganizationMemberships([]);
      }

      // Record profile view if viewing another user's profile
      if (!isOwnProfile && user?.userId && userId) {
        try {
          await recordProfileView(userId);
        } catch (err) {
          // Silently fail - don't show error for analytics
          console.debug('Error recording profile view:', err);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.userId, loadShareStats, targetUserId, isOwnProfile]);

  const loadUserPosts = useCallback(async (reset: boolean = false) => {
    if (!targetUserId) return;

    try {
      setPostsLoading(true);
      setPostsError(null);
      const pageToLoad = reset ? 0 : page;

      const response = await getUserPosts(targetUserId, pageToLoad, 20);

      if (reset) {
        setPosts(response.content);
        setPage(1);
        setPostsCount(response.totalElements);
      } else {
        setPosts(prev => [...prev, ...response.content]);
        setPage(prev => prev + 1);
      }

      setHasMorePosts(!response.last);
    } catch (err: any) {
      console.error('Error loading user posts:', err);
      setPostsError('Failed to load user posts');
    } finally {
      setPostsLoading(false);
    }
  }, [targetUserId, page]);

  const loadBookmarkedPosts = useCallback(async (reset: boolean = false) => {
    if (!isOwnProfile) return;

    try {
      setBookmarksLoading(true);
      setBookmarksError(null);

      const pageToLoad = reset ? 0 : bookmarksPage;
      const response = await getBookmarkedPosts(pageToLoad, 20);

      if (reset) {
        setBookmarkedPosts(response.content);
        setBookmarksPage(1);
      } else {
        setBookmarkedPosts(prev => [...prev, ...response.content]);
        setBookmarksPage(prev => prev + 1);
      }

      setHasMoreBookmarks(!response.last);
    } catch (err: any) {
      console.error('Error loading bookmarked posts:', err);
      setBookmarksError(err?.message || 'Failed to load bookmarks');
    } finally {
      setBookmarksLoading(false);
    }
  }, [isOwnProfile, bookmarksPage]);

  useEffect(() => {
    fetchProfile();
    if (isOwnProfile) {
      fetchCompletionStatus();
    }
  }, [userId, isOwnProfile, fetchProfile]);

  useEffect(() => {
    setBookmarkedPosts([]);
    setBookmarksError(null);
    setBookmarksPage(0);
    setHasMoreBookmarks(true);
  }, [targetUserId, isOwnProfile]);

  // Load posts when tab changes to posts
  useEffect(() => {
    if (activeTab === 'posts' && targetUserId && profile) {
      loadUserPosts(true);
    }
  }, [activeTab, targetUserId, profile, loadUserPosts]);

  // Load bookmarks when tab selected
  useEffect(() => {
    if (activeTab === 'bookmarks' && isOwnProfile && bookmarkedPosts.length === 0) {
      loadBookmarkedPosts(true);
    }
  }, [activeTab, isOwnProfile, bookmarkedPosts.length, loadBookmarkedPosts]);

  // Scroll to top when navigating from profile edit
  useEffect(() => {
    if (location.state && (location.state as any).scrollToTop) {
      // Use multiple scroll attempts to ensure it works after React renders
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 200);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
      // Clear the state to prevent scrolling on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const fetchCompletionStatus = async () => {
    try {
      const response = await profileAPI.getProfileCompletionStatus();
      setCompletionStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch completion status:', err);
    }
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setImageError(false); // Reset image error when profile updates
    setIsEditing(false);
    if (isOwnProfile) {
      fetchCompletionStatus();
    }
  };

  const handleBookmarkPostUpdate = useCallback((updatedPost: Post) => {
    if (!isOwnProfile) return;

    setBookmarkedPosts(prev => {
      const exists = prev.some(post => post.id === updatedPost.id);

      if (updatedPost.isBookmarkedByCurrentUser) {
        if (exists) {
          return prev.map(post => (post.id === updatedPost.id ? updatedPost : post));
        }
        return [updatedPost, ...prev];
      }

      return prev.filter(post => post.id !== updatedPost.id);
    });
  }, [isOwnProfile]);

  const handleBookmarkPostDelete = useCallback((postId: string) => {
    if (!isOwnProfile) return;
    setBookmarkedPosts(prev => prev.filter(post => post.id !== postId));
  }, [isOwnProfile]);

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    let shareDelta = 0;
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === updatedPost.id) {
          shareDelta = updatedPost.sharesCount - post.sharesCount;
          return updatedPost;
        }
        return post;
      })
    );

    if (shareDelta !== 0) {
      setSharesReceived(prev => Math.max(0, prev + shareDelta));
    }

    handleBookmarkPostUpdate(updatedPost);
  }, [handleBookmarkPostUpdate]);

  const handlePostDelete = useCallback((postId: string) => {
    // Remove deleted post from list
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    setPostsCount(prev => Math.max(0, prev - 1));
    handleBookmarkPostDelete(postId);
  }, [handleBookmarkPostDelete]);

  const handleFollowToggle = async () => {
    if (!user || !profile || followLoading || !userId) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        // Update follower counts
        setProfile(prev => prev ? { ...prev, followerCount: (prev.followerCount || 0) - 1 } : null);
      } else {
        await followUser(userId);
        setIsFollowing(true);
        // Update follower counts
        setProfile(prev => prev ? { ...prev, followerCount: (prev.followerCount || 0) + 1 } : null);
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      setError('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!user || !profile || blockLoading || !userId || isOwnProfile) return;

    const action = isBlocked ? 'unblock' : 'block';
    const confirmed = window.confirm(
      isBlocked 
        ? `Are you sure you want to unblock ${profile.name}? You will see their posts again and they will see yours.`
        : `Are you sure you want to block ${profile.name}? You will no longer see their posts, comments, or profile, and they will no longer see yours.`
    );

    if (!confirmed) return;

    try {
      setBlockLoading(true);

      if (isBlocked) {
        await unblockUser(userId);
        setIsBlocked(false);
      } else {
        await blockUser(userId);
        setIsBlocked(true);
        // If blocking, also unfollow if following
        if (isFollowing) {
          await unfollowUser(userId);
          setIsFollowing(false);
        }
      }
    } catch (err: any) {
      console.error(`Error ${action}ing user:`, err);
      setError(`Failed to ${action} user`);
    } finally {
      setBlockLoading(false);
    }
  };

  const loadMorePosts = () => {
    if (!postsLoading && hasMorePosts) {
      loadUserPosts(false);
    }
  };

  const loadMoreBookmarks = () => {
    if (!bookmarksLoading && hasMoreBookmarks) {
      loadBookmarkedPosts(false);
    }
  };

  const handleHeartClick = async () => {
    if (!userId || heartLoading || isLikedByCurrentUser) return;

    setHeartLoading(true);
    try {
      await profileAPI.likeUser(userId);
      setHeartsCount(prev => prev + 1);
      setIsLikedByCurrentUser(true);
    } catch (error) {
      console.error('Error liking user:', error);
      // Optionally show error message to user
    } finally {
      setHeartLoading(false);
    }
  };

  const handleMessageUser = async () => {
    if (!profile?.email || isOwnProfile) return;

    try {
      setCreatingDM(true);
      setError(null);

      // Create or get existing DM conversation
      const dmGroup = await chatApi.createDirectMessage(profile.email);

      // Navigate to the chat
      navigate(`/chats/${dmGroup.id}`);
    } catch (err: any) {
      console.error('Error starting direct message:', err);
      const errorMessage = err.response?.data?.error || 'Failed to start conversation';
      setError(`Could not message ${profile.name}: ${errorMessage}`);
    } finally {
      setCreatingDM(false);
    }
  };

  // Format date for "Joined" display
  const formatJoinedDate = (dateString: string | undefined): string => {
    if (!dateString) {
      return 'Unknown';
    }
    
    const date = parseEventDate(dateString);
    
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date format in formatJoinedDate:', dateString);
      return 'Unknown';
    }
    
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Format date for "Born" display - uses timezone-safe parsing
  const formatBirthday = (dateString: string | undefined): string => {
    // Use the timezone-safe formatBirthdayDate to prevent off-by-one-day bugs
    return formatBirthdayDate(dateString);
  };

  // Removed local formatDate function - now using robust dateUtils.formatFullDate

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      MEMBER: '👤 Member',
      MODERATOR: '⭐ Moderator',
      ADMIN: '👑 Administrator',
    };

    return roleMap[role as keyof typeof roleMap] || role;
  };

  const formatStructuredAddress = (userProfile: UserProfile) => {
    const segments: string[] = [];
    if (userProfile.addressLine1) {
      segments.push(userProfile.addressLine1);
    }
    if (userProfile.addressLine2) {
      segments.push(userProfile.addressLine2);
    }
    const cityStateParts: string[] = [];
    if (userProfile.city) {
      cityStateParts.push(userProfile.city);
    }
    if (userProfile.stateProvince) {
      cityStateParts.push(userProfile.stateProvince);
    }
    const localityParts: string[] = [];
    if (cityStateParts.length > 0) {
      localityParts.push(cityStateParts.join(', '));
    }
    if (userProfile.postalCode) {
      localityParts.push(userProfile.postalCode);
    }
    if (localityParts.length > 0) {
      segments.push(localityParts.join(' '));
    }
    if (userProfile.country) {
      segments.push(userProfile.country);
    }
    return segments.join(', ');
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error">
        <h3>⚠️ Error Loading Profile</h3>
        <p>{error}</p>
        <button onClick={fetchProfile} className="retry-button">
          🔄 Try Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-not-found">
        <h3>👤 Profile Not Found</h3>
        <p>The requested profile could not be found.</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <ProfileEdit
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const formattedAddress = formatStructuredAddress(profile);

  return (
    <div className="profile-view-container x-style">
      <div className="profile-view">
        {/* Top Navigation Bar */}
        <div className="profile-top-nav">
          <button
            onClick={() => navigate('/')}
            className="back-home-btn"
            title="Back to Dashboard"
          >
            🏠 Back Home
          </button>
          <div className="profile-top-nav-info">
            <h2>{profile.name}</h2>
            <span className="posts-count">{postsCount} posts</span>
          </div>
          <div className="profile-top-nav-actions">
            {isOwnProfile && (
              <button
                onClick={() => setIsEditing(true)}
                className="edit-profile-button-x"
                aria-label="Edit profile"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Banner */}
        <div className="profile-banner">
          {profile.bannerImageUrl ? (
            <img 
              src={profile.bannerImageUrl} 
              alt="Profile banner"
              className="banner-image"
            />
          ) : (
            <div className="banner-placeholder"></div>
          )}
        </div>

        {/* Profile Header Content */}
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profile.profilePicUrl && !imageError ? (
                <img 
                  src={profile.profilePicUrl} 
                  alt={profile.name}
                  className="profile-picture-display"
                  key={profile.profilePicUrl}
                  onError={() => {
                    console.error('Failed to load profile image:', profile.profilePicUrl);
                    setImageError(true);
                  }}
                  onLoad={() => setImageError(false)}
                />
              ) : (
                <div className="profile-picture-placeholder-large">
                  <span>{profile.name ? profile.name.charAt(0).toUpperCase() : '👤'}</span>
                </div>
              )}
              
              {/* Heart Button - positioned overlapping bottom-left */}
              <button
                onClick={handleHeartClick}
                disabled={heartLoading || isLikedByCurrentUser}
                className={`profile-heart-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                aria-label={isLikedByCurrentUser ? 'Already liked' : 'Give heart'}
                title={isLikedByCurrentUser ? 'Already liked' : 'Give heart'}
              >
                ❤️
              </button>
              
              {/* Hearts Count - overlapping bottom-left */}
              {heartsCount > 0 && (
                <div className="profile-hearts-count">
                  {heartsCount}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <div className="profile-org-selector-wrapper">
                <OrganizationSelector
                  onBrowseClick={() => navigate('/organizations')}
                />
              </div>
            )}
          </div>

          <div className="profile-info-x">
            <div className="profile-name-section">
              <div className="profile-name-row">
                <h1 className="profile-name-x">
                  {profile.name}
                  {profile.role === 'PLATFORM_ADMIN' && <span className="verified-badge-x">✓</span>}
                </h1>
                {!isOwnProfile && (
                  <>
                <button
                    onClick={handleFollowToggle}
                    disabled={followLoading || isBlocked}
                    className={`follow-btn-x ${isFollowing ? 'following' : ''}`}
                    title={isFollowing ? 'Unfollow user' : 'Follow user'}
                    aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
                >
                    {followLoading ? (
                        <span className="follow-spinner-x">...</span>
                    ) : isFollowing ? (
                        <>✓ Following</>
                    ) : (
                        <>👥 Follow</>
                    )}
                </button>
                <button
                    onClick={handleMessageUser}
                    disabled={creatingDM || isBlocked}
                    className="message-user-button"
                    title={`Send message to ${profile.name}`}
                    aria-label={`Send message to ${profile.name}`}
                >
                    <svg
                        className="message-icon"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    {creatingDM && <span className="message-loading">...</span>}
                </button>
                <button
                    onClick={handleBlockToggle}
                    disabled={blockLoading}
                    className={`block-btn-x ${isBlocked ? 'blocked' : ''}`}
                    title={isBlocked ? 'Unblock user' : 'Block user'}
                    aria-label={isBlocked ? 'Unblock user' : 'Block user'}
                >
                    {blockLoading ? (
                        <span className="block-spinner-x">...</span>
                    ) : isBlocked ? (
                        <>🚫 Blocked</>
                    ) : (
                        <>🚫 Block</>
                    )}
                </button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <p className="profile-username-x">@{profile.email.split('@')[0]}</p>
                {profile && (() => {
                  // Get the most relevant role to display
                  const getDisplayRole = () => {
                    // Platform roles take priority
                    if (profile.role === 'PLATFORM_ADMIN') {
                      return { label: 'ADMIN', color: '#ff6b6b' };
                    }
                    if (profile.role === 'MODERATOR') {
                      // Check if they're also an org admin
                      const memberships = isOwnProfile ? allMemberships : organizationMemberships;
                      const isOrgAdmin = memberships.some(m => m.role === 'ORG_ADMIN');
                      if (isOrgAdmin) {
                        return { label: 'ORG ADMIN', color: '#9b59b6' };
                      }
                      return { label: 'MOD', color: '#4ecdc4' };
                    }
                    // Check organization roles
                    const memberships = isOwnProfile ? allMemberships : organizationMemberships;
                    const orgAdmin = memberships.find(m => m.role === 'ORG_ADMIN');
                    if (orgAdmin) {
                      return { label: 'ORG ADMIN', color: '#9b59b6' };
                    }
                    const orgMod = memberships.find(m => m.role === 'MODERATOR');
                    if (orgMod) {
                      return { label: 'ORG MOD', color: '#3498db' };
                    }
                    // No special roles
                    return null;
                  };

                  const roleDisplay = getDisplayRole();
                  if (!roleDisplay) return null;

                  return (
                    <span 
                      className="role-pill"
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'white',
                        backgroundColor: roleDisplay.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        lineHeight: '1.2'
                      }}
                    >
                      {roleDisplay.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {profile.bio && (
              <p className="profile-bio-x">{profile.bio}</p>
            )}

            <div className="profile-meta-x">
              {profile.location && (
                <span className="meta-item-x">
                  <span className="meta-icon-x">📍</span>
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <span className="meta-item-x">
                  <span className="meta-icon-x">🔗</span>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </span>
              )}
              {profile.phoneNumber && (
                <span className="meta-item-x">
                  <span className="meta-icon-x">📞</span>
                  <a href={`tel:${profile.phoneNumber}`}>{profile.phoneNumber}</a>
                </span>
              )}
              {formattedAddress && (
                <span className="meta-item-x">
                  <span className="meta-icon-x">🏠</span>
                  {formattedAddress}
                </span>
              )}
              <span className="meta-item-x">
                <span className="meta-icon-x">📅</span>
                Joined {formatJoinedDate(profile.createdAt)}
              </span>
              {profile.birthday && (
                <span className="meta-item-x">
                  <span className="meta-icon-x">🎂</span>
                  Born {formatBirthday(profile.birthday)}
                </span>
              )}
            </div>

            {/* Spiritual Gifts */}
            {profile.spiritualGift && (() => {
              const spiritualGifts = profile.spiritualGift
                .split(',')
                .map(gift => gift.trim())
                .filter(Boolean);
              if (spiritualGifts.length === 0) {
                return null;
              }
              return (
                <div className="profile-spiritual-gift-x">
                  <div className="spiritual-gift-header">
                    <span className="spiritual-gift-icon">✨</span>
                    <span className="spiritual-gift-label">Spiritual Gifts</span>
                  </div>
                  <div className="spiritual-gift-badges">
                    {spiritualGifts.map(gift => (
                      <span key={gift} className="spiritual-gift-badge">
                        {gift}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Equipping Gifts */}
            {profile.equippingGifts && (() => {
              const equippingGifts = profile.equippingGifts
                .split(',')
                .map(gift => gift.trim())
                .filter(Boolean);
              if (equippingGifts.length === 0) {
                return null;
              }
              return (
                <div className="profile-spiritual-gift-x equipping-gifts-card">
                  <div className="spiritual-gift-header">
                    <span className="spiritual-gift-icon">🛠️</span>
                    <span className="spiritual-gift-label">Equipping Gifts</span>
                  </div>
                  <div className="spiritual-gift-badges">
                    {equippingGifts.map(gift => (
                      <span key={gift} className="spiritual-gift-badge">
                        {gift}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Interests */}
            {profile.interests && (() => {
              try {
                const interests = typeof profile.interests === 'string' 
                  ? JSON.parse(profile.interests) 
                  : profile.interests;
                return Array.isArray(interests) && interests.length > 0 ? (
                  <div className="profile-interests-x">
                    <div className="interests-label-x">Interests</div>
                    <div className="interests-tags-x">
                      {interests.map((interest: string, index: number) => (
                        <span key={index} className="interest-tag-x">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              } catch (e) {
                // If parsing fails, try to display as string
                return profile.interests ? (
                  <div className="profile-interests-x">
                    <div className="interests-label-x">Interests</div>
                    <div className="interests-tags-x">
                      <span className="interest-tag-x">{profile.interests}</span>
                    </div>
                  </div>
                ) : null;
              }
            })()}

            {/* Family Group Section - Only show on own profile */}
            {isOwnProfile && (
              <div className="profile-family-group-section">
                {familyPrimary ? (
                  <div className="family-group-info-card">
                    <span className="family-group-icon">🏠</span>
                    <div className="family-group-content">
                      <span className="family-group-label">Your Family Group</span>
                      <div className="family-group-name">{familyPrimary.organizationName}</div>
                      <button 
                        onClick={() => navigate(`/organizations/${familyPrimary.organizationId}`)}
                        className="view-family-group-button"
                      >
                        View Family Group →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="create-family-group-card">
                    <span className="family-group-icon">🏠</span>
                    <div className="family-group-content">
                      <span className="family-group-label">Create Your Family Group</span>
                      <p className="family-group-description">
                        Connect with your extended family! Perfect for families with multiple last names. 
                        Use text or emojis as your family name.
                      </p>
                      <button 
                        onClick={() => setShowCreateFamilyGroup(true)}
                        className="create-family-group-button"
                      >
                        Create Family Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="profile-stats-x">
              <div 
                className="stat-item-x clickable-stat-x"
                onClick={() => setShowFollowingModal(true)}
                title="View following"
              >
                <span className="stat-number-x">{(profile as any).followingCount || 0}</span>
                <span className="stat-label-x">Following</span>
              </div>
              <div 
                className="stat-item-x clickable-stat-x"
                onClick={() => setShowFollowersModal(true)}
                title="View followers"
              >
                <span className="stat-number-x">{(profile as any).followerCount || 0}</span>
                <span className="stat-label-x">Followers</span>
              </div>
              <div className="stat-item-x">
                <span className="stat-number-x">{sharesReceived}</span>
                <span className="stat-label-x">Post Shares</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-navigation-tabs">
          <button
            className={`nav-tab-x ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`nav-tab-x ${activeTab === 'replies' ? 'active' : ''}`}
            onClick={() => setActiveTab('replies')}
          >
            Replies
          </button>
          <button
            className={`nav-tab-x ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
          <button
            className={`nav-tab-x ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => isOwnProfile && setActiveTab('bookmarks')}
            disabled={!isOwnProfile}
            title={!isOwnProfile ? 'Bookmarks are private' : undefined}
          >
            Bookmarks
          </button>
          {isOwnProfile && (
            <button
              className={`nav-tab-x ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Analytics
            </button>
          )}
        </div>

        {/* Posts Feed */}
        {activeTab === 'posts' && (
          <div className="profile-posts-feed">
            {postsLoading && posts.length === 0 ? (
              <div className="posts-loading">
                <div className="loading-spinner"></div>
                <span>Loading posts...</span>
              </div>
            ) : postsError ? (
              <div className="posts-error">
                <p>{postsError}</p>
                <button onClick={() => loadUserPosts(true)} className="retry-button">
                  Try Again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-posts-x">
                <div className="empty-icon-x">📝</div>
                <h3>No posts yet</h3>
                <p>{isOwnProfile ? 'Share your first post with the community!' : `${profile.name} hasn't posted anything yet.`}</p>
              </div>
            ) : (
              <>
                <div className="posts-list-x">
                  {posts.map(post => (
                    <div key={post.id} className="post-item-x">
                      <PostCard
                        post={post}
                        onPostUpdate={handlePostUpdate}
                        onPostDelete={handlePostDelete}
                        showComments={false}
                      />
                    </div>
                  ))}
                </div>

                {hasMorePosts && (
                  <div className="load-more-section-x">
                    <button
                      onClick={loadMorePosts}
                      disabled={postsLoading}
                      className="load-more-btn-x"
                    >
                      {postsLoading ? (
                        <>
                          <div className="load-spinner"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Posts'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="profile-posts-feed">
            {!isOwnProfile ? (
              <div className="empty-posts-x">
                <div className="empty-icon-x">🔒</div>
                <h3>Bookmarks are private</h3>
                <p>This member keeps their saved posts just for themselves.</p>
              </div>
            ) : bookmarksLoading && bookmarkedPosts.length === 0 ? (
              <div className="posts-loading">
                <div className="loading-spinner"></div>
                <span>Loading bookmarks...</span>
              </div>
            ) : bookmarksError ? (
              <div className="posts-error">
                <p>{bookmarksError}</p>
                <button onClick={() => loadBookmarkedPosts(true)} className="retry-button" disabled={bookmarksLoading}>
                  Try Again
                </button>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="empty-posts-x">
                <div className="empty-icon-x">🔖</div>
                <h3>No bookmarks yet</h3>
                <p>Tap the bookmark icon on posts to build your personal collection.</p>
              </div>
            ) : (
              <>
                <div className="posts-list-x">
                  {bookmarkedPosts.map(post => (
                    <div key={post.id} className="post-item-x">
                      <PostCard
                        post={post}
                        onPostUpdate={handleBookmarkPostUpdate}
                        onPostDelete={handleBookmarkPostDelete}
                        showComments={false}
                      />
                    </div>
                  ))}
                </div>

                {hasMoreBookmarks && (
                  <div className="load-more-section-x">
                    <button
                      onClick={loadMoreBookmarks}
                      disabled={bookmarksLoading}
                      className="load-more-btn-x"
                    >
                      {bookmarksLoading ? (
                        <>
                          <div className="load-spinner"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Bookmarks'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && isOwnProfile && (
          <div className="profile-analytics-container">
            <ProfileAnalytics userId={targetUserId} isOwnProfile={isOwnProfile} />
          </div>
        )}

        {activeTab === 'replies' && (
          <div className="profile-tab-content">
            <RepliesList userId={targetUserId} isOwnProfile={isOwnProfile} />
          </div>
        )}

        {activeTab === 'media' && (
          <div className="profile-tab-content">
            <MediaGrid userId={targetUserId} isOwnProfile={isOwnProfile} />
          </div>
        )}
      </div>

      {/* Followers and Following Modals */}
      {profile && (
        <>
          <FollowersList
            userId={profile.userId}
            userName={profile.name}
            isOpen={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
          />
          <FollowingList
            userId={profile.userId}
            userName={profile.name}
            isOpen={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
          />
        </>
      )}

      {/* Family Group Creation Modal */}
      {showCreateFamilyGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateFamilyGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <FamilyGroupCreateForm
              onSuccess={async (org) => {
                setShowCreateFamilyGroup(false);
                // Refresh organization memberships to show the new family group
                await refreshMemberships();
                // Show success message or navigate
                if (org?.id) {
                  navigate(`/organizations/${org.id}`);
                }
              }}
              onCancel={() => setShowCreateFamilyGroup(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;