import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileAPI } from '../services/api';
import { UserProfile, ProfileCompletionStatus } from '../types/Profile';
import { useAuth } from '../contexts/AuthContext';
import ProfileEdit from './ProfileEdit';
import { Post } from '../types/Post';
import { getUserPosts } from '../services/postApi';
import PostCard from './PostCard';
import { parseEventDate } from '../utils/dateUtils';
import './ProfileView.css';

interface ProfileViewProps {
  userId?: string;
  showEditButton?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId: propUserId, showEditButton = true }) => {
  const { user } = useAuth();
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'highlights' | 'articles' | 'media' | 'likes'>('posts');
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsCount, setPostsCount] = useState(0);
  const [imageError, setImageError] = useState(false);

  const isOwnProfile = !userId || userId === user?.userId;
  const targetUserId = userId || user?.userId || '';

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If we have a specific userId and it's not our own profile, get that user's profile
      // Otherwise, get our own profile
      const response = (userId && userId !== user?.userId) 
        ? await profileAPI.getUserProfile(userId)
        : await profileAPI.getMyProfile();
      
      setProfile(response.data);
      setImageError(false); // Reset image error when profile loads
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.userId]);

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

  useEffect(() => {
    fetchProfile();
    if (isOwnProfile) {
      fetchCompletionStatus();
    }
  }, [userId, isOwnProfile, fetchProfile]);

  // Load posts when tab changes to posts
  useEffect(() => {
    if (activeTab === 'posts' && targetUserId && profile) {
      loadUserPosts(true);
    }
  }, [activeTab, targetUserId, profile, loadUserPosts]);

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

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  }, []);

  const handlePostDelete = useCallback((postId: string) => {
    // Remove deleted post from list
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    setPostsCount(prev => Math.max(0, prev - 1));
  }, []);

  const loadMorePosts = () => {
    if (!postsLoading && hasMorePosts) {
      loadUserPosts(false);
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

  // Format date for "Born" display
  const formatBirthday = (dateString: string | undefined): string => {
    if (!dateString) {
      return 'Unknown';
    }
    
    const date = parseEventDate(dateString);
    
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date format in formatBirthday:', dateString);
      return 'Unknown';
    }
    
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

  return (
    <div className="profile-view-container x-style">
      <div className="profile-view">
        {/* Top Navigation Bar */}
        <div className="profile-top-nav">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="back-button"
          >
            ←
          </button>
          <div className="profile-top-nav-info">
            <h2>{profile.name}</h2>
            <span className="posts-count">{postsCount} posts</span>
          </div>
          <div className="profile-top-nav-actions">
            {/* Search, notifications, and more options can go here */}
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
            </div>
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

          <div className="profile-info-x">
            <div className="profile-name-section">
              <h1 className="profile-name-x">
                {profile.name}
                {profile.role === 'ADMIN' && <span className="verified-badge-x">✓</span>}
              </h1>
              <p className="profile-username-x">@{profile.email.split('@')[0]}</p>
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
              {profile.address && (
                <span className="meta-item-x">
                  <span className="meta-icon-x">🏠</span>
                  {profile.address}
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

            {/* Spiritual Gift */}
            {profile.spiritualGift && (
              <div className="profile-spiritual-gift-x">
                <span className="spiritual-gift-icon">✨</span>
                <span className="spiritual-gift-label">Spiritual Gift:</span>
                <span className="spiritual-gift-value">{profile.spiritualGift}</span>
              </div>
            )}

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

            <div className="profile-stats-x">
              <div className="stat-item-x">
                <span className="stat-number-x">{(profile as any).followingCount || 0}</span>
                <span className="stat-label-x">Following</span>
              </div>
              <div className="stat-item-x">
                <span className="stat-number-x">{(profile as any).followerCount || 0}</span>
                <span className="stat-label-x">Followers</span>
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
            className={`nav-tab-x ${activeTab === 'highlights' ? 'active' : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            Highlights
          </button>
          <button
            className={`nav-tab-x ${activeTab === 'articles' ? 'active' : ''}`}
            onClick={() => setActiveTab('articles')}
          >
            Articles
          </button>
          <button
            className={`nav-tab-x ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
          <button
            className={`nav-tab-x ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            Likes
          </button>
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

        {/* Other tabs content (placeholder for now) */}
        {activeTab !== 'posts' && (
          <div className="profile-tab-content">
            <div className="tab-placeholder">
              <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab coming soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;