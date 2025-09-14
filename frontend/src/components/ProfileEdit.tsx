import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/Post';
import { UserProfile } from '../types/Profile';
import { updateUserProfile, uploadProfilePicture } from '../services/postApi';
import './ProfileEdit.css';

interface ProfileFormData {
  name: string;
  bio: string;
  location: string;
  website: string;
  interests: string[];
}

interface ProfileEditProps {
  profile?: UserProfile;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
  onCancel?: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ 
  profile: externalProfile, 
  onProfileUpdate, 
  onCancel 
}) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    bio: '',
    location: '',
    website: '',
    interests: []
  });

  const [isLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string>('');
  const [newInterest, setNewInterest] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current user data or external profile
  useEffect(() => {
    const profileToUse = externalProfile || user;
    if (profileToUse) {
      setFormData({
        name: profileToUse.name || '',
        bio: profileToUse.bio || '',
        location: (profileToUse as User).location || '',
        website: (profileToUse as User).website || '',
        interests: (() => {
          try {
            const interestsData = (profileToUse as User).interests;
            if (typeof interestsData === 'string') {
              return JSON.parse(interestsData);
            }
            return Array.isArray(interestsData) ? interestsData : [];
          } catch (e) {
            return [];
          }
        })()
      });

      if (profileToUse.profilePicUrl) {
        setProfilePicPreview(profileToUse.profilePicUrl);
      }
    }
  }, [user, externalProfile]);

  const handleInputChange = (field: keyof ProfileFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }

      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleAddInterest = () => {
    const trimmedInterest = newInterest.trim();
    if (trimmedInterest && !formData.interests.includes(trimmedInterest)) {
      if (formData.interests.length >= 10) {
        setError('You can add up to 10 interests');
        return;
      }

      handleInputChange('interests', [...formData.interests, trimmedInterest]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    handleInputChange('interests', formData.interests.filter(i => i !== interestToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (formData.name.length > 50) {
      setError('Name must be less than 50 characters');
      return false;
    }

    if (formData.bio && formData.bio.length > 200) {
      setError('Bio must be less than 200 characters');
      return false;
    }

    if (formData.website && !isValidUrl(formData.website)) {
      setError('Please enter a valid website URL');
      return false;
    }

    return true;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Upload profile picture if changed
      let profilePicUrl = user.profilePicUrl;
      if (profilePicFile) {
        const uploadResult = await uploadProfilePicture(profilePicFile);
        profilePicUrl = uploadResult;
      }

      // Update profile data - create API request object with correct types
      const updatedProfile = {
        ...formData,
        profilePicUrl,
        interests: JSON.stringify(formData.interests) // Convert array to JSON string for backend
      };

      const result = await updateUserProfile(user!.userId, updatedProfile);

      // Update local user state
      if (updateUser) {
        updateUser(result);
      }

      // Call external callback if provided
      if (onProfileUpdate && externalProfile) {
        const updatedUserProfile: UserProfile = {
          userId: externalProfile.userId,
          email: externalProfile.email,
          name: result.name,
          bio: result.bio,
          role: externalProfile.role,
          profilePicUrl: result.profilePicUrl,
          createdAt: externalProfile.createdAt,
          updatedAt: new Date().toISOString(),
          lastLogin: externalProfile.lastLogin
        };
        onProfileUpdate(updatedUserProfile);
        if (onCancel) onCancel();
        return;
      }

      setSuccess('Profile updated successfully!');

      // Navigate back to profile after a short delay
      setTimeout(() => {
        navigate(`/profile/${user.id}`);
      }, 2000);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`/profile/${user?.id}`);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicFile(null);
    setProfilePicPreview('');
  };

  if (isLoading) {
    return (
      <div className="profile-edit loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit">
      <div className="edit-container">
        {/* Header */}
        <div className="edit-header">
          <h1>Edit Profile</h1>
          <p>Update your church community profile</p>
        </div>

        {/* Profile Picture Section */}
        <div className="edit-section">
          <h2>Profile Picture</h2>
          <div className="profile-pic-section">
            <div className="current-pic">
              {profilePicPreview ? (
                <img
                  src={profilePicPreview}
                  alt="Profile preview"
                  className="pic-preview"
                />
              ) : (
                <div className="pic-placeholder">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="pic-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="pic-btn upload"
              >
                📷 Upload Photo
              </button>

              {profilePicPreview && (
                <button
                  type="button"
                  onClick={removeProfilePicture}
                  className="pic-btn remove"
                >
                  🗑️ Remove
                </button>
              )}
            </div>
          </div>

          <div className="pic-help">
            <small>Upload a square image (JPG, PNG) up to 5MB for best results</small>
          </div>
        </div>

        {/* Basic Information */}
        <div className="edit-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              maxLength={50}
              className="form-input"
            />
            <small className="char-count">{formData.name.length}/50</small>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell the community about yourself, your faith journey, or your interests..."
              maxLength={200}
              rows={4}
              className="form-textarea"
            />
            <small className="char-count">{formData.bio.length}/200</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State/Country"
                maxLength={100}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://your-website.com"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="edit-section">
          <h2>Interests & Hobbies</h2>
          <p className="section-desc">
            Share your interests to connect with others who share similar passions
          </p>

          <div className="interests-section">
            <div className="add-interest">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add an interest (e.g., Bible Study, Music, Community Service)"
                maxLength={30}
                className="interest-input"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                disabled={!newInterest.trim()}
                className="add-interest-btn"
              >
                Add
              </button>
            </div>

            <div className="interests-list">
              {formData.interests.map((interest, index) => (
                <div key={index} className="interest-tag">
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="remove-interest"
                    aria-label={`Remove ${interest}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {formData.interests.length === 0 && (
              <div className="no-interests">
                <p>No interests added yet. Add some to help others connect with you!</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="message error">
            <span className="message-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="message success">
            <span className="message-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Actions */}
        <div className="edit-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-btn"
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="save-btn"
          >
            {isSaving ? (
              <>
                <div className="save-spinner"></div>
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;