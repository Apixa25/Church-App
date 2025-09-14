import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post } from '../types/Post';
import { getUserProfile, getUserPosts, followUser, unfollowUser } from '../services/postApi';
import { useAuth, User } from '../contexts/AuthContext';
import PostCard from './PostCard';
import './UserProfile.css';

interface UserProfileProps {
  userId?: string; // If not provided, uses current user
}

const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId: string }>();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'activity'>('posts');
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const POSTS_PER_PAGE = 12;
  const targetUserId = userId || routeUserId || currentUser?.id;

  // Load user profile
  useEffect(() => {
    if (targetUserId) {
      loadUserProfile();
    }
  }, [targetUserId]);

  // Load user posts when tab changes to posts
  useEffect(() => {
    if (activeTab === 'posts' && targetUserId) {
      loadUserPosts(true);
    }
  }, [activeTab, targetUserId]);

  const loadUserProfile = async () => {
    if (!targetUserId) return;

    try {
      setIsLoading(true);
      setError('');

      const profile = await getUserProfile(targetUserId);
      setProfileUser(profile);

      // Check if current user is following this user
      if (currentUser && currentUser.id !== targetUserId) {
        // This would need to be implemented in the API
        // setIsFollowing(await checkFollowStatus(currentUser.id, targetUserId));
      }
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPosts = async (reset: boolean = false) => {
    if (!targetUserId) return;

    try {
      setPostsLoading(true);
      const pageToLoad = reset ? 0 : page;

      const response = await getUserPosts(targetUserId, pageToLoad, POSTS_PER_PAGE);

      if (reset) {
        setUserPosts(response.content);
        setPage(0);
      } else {
        setUserPosts(prev => [...prev, ...response.content]);
        setPage(pageToLoad);
      }

      setHasMorePosts(!response.last);
    } catch (err: any) {
      console.error('Error loading user posts:', err);
      setError('Failed to load user posts');
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || followLoading) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        await unfollowUser(profileUser.id);
        setIsFollowing(false);
        // Update follower counts
        setProfileUser(prev => prev ? { ...prev, followerCount: (prev.followerCount || 0) - 1 } : null);
      } else {
        await followUser(profileUser.id);
        setIsFollowing(true);
        // Update follower counts
        setProfileUser(prev => prev ? { ...prev, followerCount: (prev.followerCount || 0) + 1 } : null);
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      setError('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setUserPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  }, []);

  const loadMorePosts = () => {
    if (!postsLoading && hasMorePosts) {
      loadUserPosts(false);
    }
  };

  if (isLoading) {
    return (
      <div className="user-profile loading">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="user-profile error">
        <div className="error-content">
          <div className="error-icon">👤</div>
          <h2>{error || 'Profile not found'}</h2>
          <p>This user profile could not be loaded.</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const joinDate = new Date(profileUser.createdAt || Date.now());
  const memberSince = joinDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="user-profile">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-background">
          <div className="profile-gradient"></div>
        </div>

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profileUser.profilePicUrl ? (
                <img
                  src={profileUser.profilePicUrl}
                  alt={profileUser.name}
                  className="avatar-image"
                  key={profileUser.profilePicUrl} // Force re-render when URL changes
                />
              ) : (
                <div className="avatar-placeholder">
                  {profileUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="profile-actions">
              {isOwnProfile ? (
                <button
                  onClick={handleEditProfile}
                  className="edit-profile-btn"
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`follow-btn ${isFollowing ? 'following' : ''}`}
                >
                  {followLoading ? (
                    <div className="follow-spinner"></div>
                  ) : isFollowing ? (
                    <>✓ Following</>
                  ) : (
                    <>👥 Follow</>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="profile-info">
            <h1 className="profile-name">
              {profileUser.name}
              {profileUser.isVerified && <span className="verified-badge">✓</span>}
            </h1>

            <p className="profile-username">@{profileUser.username || profileUser.name.toLowerCase().replace(/\s+/g, '')}</p>

            {profileUser.bio && (
              <p className="profile-bio">{profileUser.bio}</p>
            )}

            <div className="profile-meta">
              <span className="meta-item">
                <span className="meta-icon">📅</span>
                Member since {memberSince}
              </span>

              {profileUser.location && (
                <span className="meta-item">
                  <span className="meta-icon">📍</span>
                  {profileUser.location}
                </span>
              )}

              {profileUser.website && (
                <span className="meta-item">
                  <span className="meta-icon">🌐</span>
                  <a href={profileUser.website} target="_blank" rel="noopener noreferrer">
                    {profileUser.website.replace(/^https?:\/\//, '')}
                  </a>
                </span>
              )}
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-number">{profileUser.postsCount || 0}</span>
                <span className="stat-label">Posts</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{profileUser.followerCount || 0}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{profileUser.followingCount || 0}</span>
                <span className="stat-label">Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="profile-navigation">
        <button
          className={`nav-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          📝 Posts ({profileUser.postsCount || 0})
        </button>
        <button
          className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ About
        </button>
        <button
          className={`nav-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📊 Activity
        </button>
      </div>

      {/* Profile Content */}
      <div className="profile-main">
        {activeTab === 'posts' && (
          <div className="posts-section">
            {userPosts.length === 0 ? (
              <div className="empty-posts">
                <div className="empty-icon">📝</div>
                <h3>No posts yet</h3>
                <p>{isOwnProfile ? 'Share your first post with the community!' : `${profileUser.name} hasn't posted anything yet.`}</p>
              </div>
            ) : (
              <>
                <div className="posts-grid">
                  {userPosts.map(post => (
                    <div key={post.id} className="post-grid-item">
                      <PostCard
                        post={post}
                        onPostUpdate={handlePostUpdate}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>

                {hasMorePosts && (
                  <div className="load-more-section">
                    <button
                      onClick={loadMorePosts}
                      disabled={postsLoading}
                      className="load-more-btn"
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

        {activeTab === 'about' && (
          <div className="about-section">
            <div className="about-card">
              <h3>About {profileUser.name}</h3>

              {profileUser.bio ? (
                <div className="about-bio">
                  <h4>Bio</h4>
                  <p>{profileUser.bio}</p>
                </div>
              ) : (
                <div className="about-bio empty">
                  <p>No bio added yet.</p>
                </div>
              )}

              <div className="about-details">
                <div className="detail-item">
                  <span className="detail-label">Member Since:</span>
                  <span className="detail-value">{memberSince}</span>
                </div>

                {profileUser.location && (
                  <div className="detail-item">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{profileUser.location}</span>
                  </div>
                )}

                {profileUser.role && (
                  <div className="detail-item">
                    <span className="detail-label">Role:</span>
                    <span className="detail-value">{profileUser.role}</span>
                  </div>
                )}

                {profileUser.interests && profileUser.interests.length > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Interests:</span>
                    <div className="interests-tags">
                      {profileUser.interests.map((interest, index) => (
                        <span key={index} className="interest-tag">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-section">
            <div className="activity-card">
              <h3>Recent Activity</h3>
              <div className="activity-placeholder">
                <div className="activity-icon">📊</div>
                <p>Activity tracking coming soon!</p>
                <small>This will show recent posts, comments, and interactions.</small>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
