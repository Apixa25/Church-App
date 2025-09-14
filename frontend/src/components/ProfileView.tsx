import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileAPI } from '../services/api';
import { UserProfile, ProfileCompletionStatus } from '../types/Profile';
import { useAuth } from '../contexts/AuthContext';
import ProfileEdit from './ProfileEdit';
import { formatFullDate } from '../utils/dateUtils';

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

  const isOwnProfile = !userId || userId === user?.userId;

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
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.userId]);

  useEffect(() => {
    fetchProfile();
    if (isOwnProfile) {
      fetchCompletionStatus();
    }
  }, [userId, isOwnProfile, fetchProfile]);

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
    setIsEditing(false);
    if (isOwnProfile) {
      fetchCompletionStatus();
    }
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
    <div className="profile-view-container">
      <div className="profile-view">
        {/* Navigation */}
        <div className="profile-navigation">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="back-home-button"
          >
            🏠 Back Home
          </button>
        </div>
        
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.profilePicUrl ? (
              <img 
                src={profile.profilePicUrl} 
                alt={profile.name}
                className="profile-picture-display"
              />
            ) : (
              <div className="profile-picture-placeholder-large">
                <span>👤</span>
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>{profile.name}</h1>
            <p className="profile-role">{getRoleDisplay(profile.role)}</p>
            <p className="profile-email">{profile.email}</p>
          </div>
          {showEditButton && isOwnProfile && (
            <div className="profile-actions">
              <button
                onClick={() => setIsEditing(true)}
                className="edit-profile-button"
              >
                ✏️ Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Profile Completion Status */}
        {isOwnProfile && completionStatus && (
          <div className="completion-status">
            <h3>📊 Profile Completion</h3>
            <div className="completion-bar">
              <div
                className="completion-fill"
                style={{ width: `${completionStatus.profileCompletionPercentage}%` }}
              />
            </div>
            <p className="completion-text">
              {completionStatus.profileCompletionPercentage}% Complete
            </p>
            {!completionStatus.isComplete && (
              <p className="completion-hint">
                💡 Complete your profile to help others get to know you better!
              </p>
            )}
          </div>
        )}

        {/* Profile Details */}
        <div className="profile-details">
          <div className="profile-section">
            <h3>📝 About</h3>
            {profile.bio ? (
              <p className="profile-bio">{profile.bio}</p>
            ) : (
              <p className="profile-bio-empty">
                {isOwnProfile 
                  ? "📝 Add a bio to tell others about yourself"
                  : "This user hasn't added a bio yet."
                }
              </p>
            )}
          </div>

          {/* Location */}
          {(profile as any).location && (
            <div className="profile-section">
              <h3>📍 Location</h3>
              <p>{(profile as any).location}</p>
            </div>
          )}

          {/* Website */}
          {(profile as any).website && (
            <div className="profile-section">
              <h3>🌐 Website</h3>
              <a href={(profile as any).website} target="_blank" rel="noopener noreferrer" className="profile-website">
                {(profile as any).website}
              </a>
            </div>
          )}

          {/* Interests */}
          {(profile as any).interests && (
            <div className="profile-section">
              <h3>🎯 Interests</h3>
              <div className="interests-tags">
                {(() => {
                  try {
                    const interests = typeof (profile as any).interests === 'string' 
                      ? JSON.parse((profile as any).interests) 
                      : (profile as any).interests;
                    return Array.isArray(interests) && interests.length > 0 
                      ? interests.map((interest: string, index: number) => (
                          <span key={index} className="interest-tag">
                            {interest}
                          </span>
                        ))
                      : null;
                  } catch (e) {
                    return <span className="interest-tag">{(profile as any).interests}</span>;
                  }
                })()}
              </div>
            </div>
          )}

          <div className="profile-section">
            <h3>📅 Member Since</h3>
            <p>{formatFullDate(profile.createdAt)}</p>
          </div>

          {profile.lastLogin && (
            <div className="profile-section">
              <h3>🕒 Last Active</h3>
              <p>{formatFullDate(profile.lastLogin)}</p>
            </div>
          )}

          {profile.updatedAt && profile.updatedAt !== profile.createdAt && (
            <div className="profile-section">
              <h3>✏️ Profile Updated</h3>
              <p>{formatFullDate(profile.updatedAt)}</p>
            </div>
          )}
        </div>

        {/* Quick Actions for Own Profile */}
        {isOwnProfile && (
          <div className="profile-quick-actions">
            <h3>⚡ Quick Actions</h3>
            <div className="action-buttons">
              <button
                onClick={() => setIsEditing(true)}
                className="action-button"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={fetchProfile}
                className="action-button"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;