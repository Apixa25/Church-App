import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { profileAPI } from '../services/api';
import { UserProfile, ProfileUpdateRequest, FileUploadResponse } from '../types/Profile';
import { useAuth } from '../contexts/AuthContext';

interface ProfileEditProps {
  profile?: UserProfile;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
  onCancel?: () => void;
}

interface ProfileFormData {
  name: string;
  bio: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ 
  profile, 
  onProfileUpdate, 
  onCancel 
}) => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: profile?.name || '',
      bio: profile?.bio || '',
      role: profile?.role || 'MEMBER',
    },
  });

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState(profile?.profilePicUrl || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        bio: profile.bio || '',
        role: profile.role,
      });
      setProfilePicUrl(profile.profilePicUrl || '');
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const updateData: ProfileUpdateRequest = {
        name: data.name,
        bio: data.bio || undefined,
        role: data.role,
        profilePicUrl: profilePicUrl || undefined,
      };

      const response = await profileAPI.updateMyProfile(updateData);
      const updatedProfile = response.data;

      setSuccess('Profile updated successfully! 🎉');
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);

      const response = await profileAPI.uploadProfilePicture(file);
      const uploadResponse: FileUploadResponse = response.data;

      if (uploadResponse.success && uploadResponse.fileUrl) {
        setProfilePicUrl(uploadResponse.fileUrl);
        setSuccess('Profile picture uploaded successfully! 📸');
      } else {
        throw new Error(uploadResponse.message);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload image';
      setError(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      setUploadingImage(true);
      await profileAPI.deleteProfilePicture();
      setProfilePicUrl('');
      setSuccess('Profile picture removed successfully! 🗑️');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete image';
      setError(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="profile-edit-container">
      <div className="profile-edit">
        {/* Navigation */}
        <div className="profile-navigation">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="back-home-button"
          >
            🏠 Back Home
          </button>
        </div>
        
        <h2>✏️ Edit Profile</h2>
        <p>Update your information and personalize your church community experience</p>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="profile-picture-section">
          <h3>📸 Profile Picture</h3>
          <div className="profile-picture-container">
            {profilePicUrl ? (
              <div className="profile-picture-preview">
                <img src={profilePicUrl} alt="Profile" className="profile-picture-large" />
                <div className="picture-controls">
                  <button
                    type="button"
                    className="change-picture-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? '⏳' : '🔄'} Change
                  </button>
                  <button
                    type="button"
                    className="delete-picture-button"
                    onClick={handleDeleteImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? '⏳' : '🗑️'} Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-profile-picture">
                <div className="profile-picture-placeholder">
                  <span>📷</span>
                </div>
                <button
                  type="button"
                  className="upload-picture-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? '⏳ Uploading...' : '📤 Upload Picture'}
                </button>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
                maxLength: {
                  value: 100,
                  message: 'Name must be less than 100 characters',
                },
              })}
              disabled={loading}
            />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Tell your church community a bit about yourself..."
              {...register('bio', {
                maxLength: {
                  value: 1000,
                  message: 'Bio must be less than 1000 characters',
                },
              })}
              disabled={loading}
            />
            {errors.bio && <span className="error">{errors.bio.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role">Church Role</label>
            <select
              id="role"
              {...register('role')}
              disabled={loading || user?.role !== 'ADMIN'}
            >
              <option value="MEMBER">👤 Member</option>
              <option value="MODERATOR">⭐ Moderator</option>
              <option value="ADMIN">👑 Admin</option>
            </select>
            {user?.role !== 'ADMIN' && (
              <small className="role-note">
                Only administrators can change user roles
              </small>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={loading || uploadingImage}>
              {loading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
            {onCancel && (
              <button
                type="button"
                className="cancel-button"
                onClick={onCancel}
                disabled={loading || uploadingImage}
              >
                ❌ Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;