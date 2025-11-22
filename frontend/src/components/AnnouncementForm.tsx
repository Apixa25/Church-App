import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { 
  AnnouncementCreateRequest, 
  AnnouncementUpdateRequest, 
  Announcement,
  AnnouncementCategory
} from '../types/Announcement';
import { announcementAPI } from '../services/announcementApi';
import './AnnouncementForm.css';

interface AnnouncementFormProps {
  existingAnnouncement?: Announcement;
  onSuccess?: (announcement: Announcement) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

interface AnnouncementFormData {
  title: string;
  content: string;
  imageUrl?: string;
  category: AnnouncementCategory;
  isPinned?: boolean;
  isSystemWide?: boolean;
}

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  GENERAL: 'General',
  WORSHIP: 'Worship',
  EVENTS: 'Events',
  MINISTRY: 'Ministry',
  YOUTH: 'Youth',
  MISSIONS: 'Missions',
  PRAYER: 'Prayer',
  COMMUNITY: 'Community',
  URGENT: 'Urgent',
  CELEBRATION: 'Celebration'
};

const CATEGORY_DESCRIPTIONS: Record<AnnouncementCategory, string> = {
  GENERAL: 'General church announcements and updates',
  WORSHIP: 'Worship services, music, and liturgical announcements',
  EVENTS: 'Church events, gatherings, and special occasions',
  MINISTRY: 'Ministry updates, volunteer opportunities, and programs',
  YOUTH: 'Youth group activities and announcements',
  MISSIONS: 'Mission trips, outreach, and evangelism',
  PRAYER: 'Prayer requests, prayer meetings, and spiritual matters',
  COMMUNITY: 'Community outreach and fellowship activities',
  URGENT: 'Time-sensitive and important announcements',
  CELEBRATION: 'Celebrations, milestones, and joyful news'
};

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  existingAnnouncement,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const { user } = useAuth();
  const { primaryMembership, allMemberships } = useOrganization();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<AnnouncementFormData>({
    defaultValues: {
      title: existingAnnouncement?.title || '',
      content: existingAnnouncement?.content || '',
      imageUrl: existingAnnouncement?.imageUrl || '',
      category: existingAnnouncement?.category || 'GENERAL',
      isPinned: existingAnnouncement?.isPinned || false,
      isSystemWide: false // Default to org-scoped, PLATFORM_ADMIN can change
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    existingAnnouncement?.imageUrl || null
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check admin roles for pinning permissions
  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const isOrgAdmin = allMemberships.some(m => m.role === 'ORG_ADMIN');
  const canPin = isPlatformAdmin || isModerator || isOrgAdmin;
  
  // Check if user has primary organization (required to create, except for PLATFORM_ADMIN system-wide)
  const hasPrimaryOrg = primaryMembership !== null;

  const watchedImageUrl = watch('imageUrl');
  const watchedCategory = watch('category');
  const watchedIsSystemWide = watch('isSystemWide');

  useEffect(() => {
    if (watchedImageUrl && watchedImageUrl !== imagePreview) {
      setImagePreview(watchedImageUrl);
    }
  }, [watchedImageUrl, imagePreview]);

  // Check if user has primary organization (PLATFORM_ADMIN can create system-wide without primary org)
  useEffect(() => {
    if (mode === 'create' && !hasPrimaryOrg && !isPlatformAdmin) {
      setError('You must have a primary organization to create announcements. Please join a church first.');
    } else if (mode === 'create' && !hasPrimaryOrg && isPlatformAdmin && !watchedIsSystemWide) {
      setError('Please check "Make this announcement system-wide" to create an announcement without a primary organization.');
    } else {
      setError(null); // Clear error if conditions are met
    }
  }, [mode, hasPrimaryOrg, isPlatformAdmin, watchedIsSystemWide]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      // Create a local URL for preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Store the file - it will be uploaded when the form is submitted
      setSelectedImageFile(file);
      
    } catch (err: any) {
      console.error('Error processing image:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedImageFile(null);
    setValue('imageUrl', '');
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    // PLATFORM_ADMIN can create system-wide announcements without primary org
    if (mode === 'create' && !hasPrimaryOrg && !isPlatformAdmin) {
      setError('You must have a primary organization to create announcements. Please join a church first.');
      return;
    }
    
    // If PLATFORM_ADMIN doesn't have primary org, they must create system-wide announcement
    if (mode === 'create' && !hasPrimaryOrg && isPlatformAdmin && !data.isSystemWide) {
      setError('Please check "Make this announcement system-wide" to create an announcement without a primary organization.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result: Announcement;

      if (mode === 'create') {
        const createRequest: AnnouncementCreateRequest = {
          title: data.title.trim(),
          content: data.content.trim(),
          imageUrl: data.imageUrl?.trim() || undefined,
          category: data.category,
          isPinned: canPin ? data.isPinned : false, // Only admins/org admins can pin during creation
          isSystemWide: isPlatformAdmin ? (data.isSystemWide || false) : false // Only PLATFORM_ADMIN can create system-wide
        };

        // Use with-image endpoint if an image file was selected
        let response;
        if (selectedImageFile) {
          response = await announcementAPI.createAnnouncementWithImage(createRequest, selectedImageFile);
        } else {
          response = await announcementAPI.createAnnouncement(createRequest);
        }
        
        result = response.data;
        setSuccess('Announcement created successfully!');
      } else {
        if (!existingAnnouncement) {
          throw new Error('No existing announcement provided for edit mode');
        }

        const updateRequest: AnnouncementUpdateRequest = {
          title: data.title.trim(),
          content: data.content.trim(),
          imageUrl: data.imageUrl?.trim() || undefined,
          category: data.category,
          isPinned: canPin ? data.isPinned : existingAnnouncement.isPinned // Only admins/org admins can change pin status
        };

        const response = await announcementAPI.updateAnnouncement(existingAnnouncement.id, updateRequest);
        result = response.data;
        setSuccess('Announcement updated successfully!');
      }

      // Reset form after successful submission
      if (mode === 'create') {
        reset();
        setImagePreview(null);
        setSelectedImageFile(null);
      }

      // Call success callback
      if (onSuccess) {
        setTimeout(() => onSuccess(result), 1000);
      }

    } catch (err: any) {
      console.error('Error submitting announcement:', err);
      setError(err.response?.data?.error || `Failed to ${mode} announcement. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'create') {
      reset();
      setImagePreview(null);
    }
    setError(null);
    setSuccess(null);
    if (onCancel) {
      onCancel();
    }
  };

  // Show error if user doesn't have primary org (only for create mode, but PLATFORM_ADMIN can create system-wide)
  if (mode === 'create' && !hasPrimaryOrg && !isPlatformAdmin) {
    return (
      <div className="announcement-form-error">
        <div className="error-container">
          <h3>Primary Organization Required</h3>
          <p>You must have a primary organization to create announcements. Please join a church first.</p>
          <button onClick={onCancel} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="announcement-form">
      <div className="form-header">
        <h2>
          {mode === 'create' ? '📢 Create New Announcement' : '✏️ Edit Announcement'}
        </h2>
        <p>
          {mode === 'create' 
            ? 'Share important updates with the church community'
            : 'Update your announcement details'
          }
        </p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="announcement-form-content">
        {/* Title */}
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Title *
          </label>
          <input
            id="title"
            type="text"
            className={`form-input ${errors.title ? 'error' : ''}`}
            placeholder="Enter announcement title..."
            {...register('title', {
              required: 'Title is required',
              minLength: {
                value: 5,
                message: 'Title must be at least 5 characters long'
              },
              maxLength: {
                value: 200,
                message: 'Title cannot exceed 200 characters'
              }
            })}
          />
          {errors.title && (
            <span className="form-error">{errors.title.message}</span>
          )}
          <div className="form-hint">
            {watch('title')?.length || 0}/200 characters
          </div>
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Category *
          </label>
          <select
            id="category"
            className={`form-select ${errors.category ? 'error' : ''}`}
            {...register('category', { required: 'Category is required' })}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.category && (
            <span className="form-error">{errors.category.message}</span>
          )}
          <div className="form-hint">
            {CATEGORY_DESCRIPTIONS[watchedCategory]}
          </div>
        </div>

        {/* Content */}
        <div className="form-group">
          <label htmlFor="content" className="form-label">
            Content *
          </label>
          <textarea
            id="content"
            className={`form-textarea ${errors.content ? 'error' : ''}`}
            placeholder="Write your announcement content here..."
            rows={8}
            {...register('content', {
              required: 'Content is required',
              minLength: {
                value: 10,
                message: 'Content must be at least 10 characters long'
              },
              maxLength: {
                value: 5000,
                message: 'Content cannot exceed 5000 characters'
              }
            })}
          />
          {errors.content && (
            <span className="form-error">{errors.content.message}</span>
          )}
          <div className="form-hint">
            {watch('content')?.length || 0}/5000 characters
          </div>
        </div>

        {/* Image Upload */}
        <div className="form-group">
          <label className="form-label">
            Image (Optional)
          </label>
          <div className="image-upload-section">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="image-input"
              id="imageUpload"
              disabled={uploadingImage}
            />
            <label htmlFor="imageUpload" className="image-upload-button">
              {uploadingImage ? '⏳ Uploading...' : '📷 Choose Image'}
            </label>
            
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" className="preview-image" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="remove-image-btn"
                  title="Remove image"
                >
                  ❌
                </button>
              </div>
            )}
            
            <div className="form-hint">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </div>
          </div>
        </div>

        {/* System-Wide Option (PLATFORM_ADMIN Only) */}
        {isPlatformAdmin && mode === 'create' && (
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('isSystemWide')}
                className="form-checkbox"
              />
              <span className="checkbox-text">
                🌍 Make this announcement system-wide
              </span>
            </label>
            <div className="form-hint">
              System-wide announcements are visible to all organizations in the platform
            </div>
          </div>
        )}

        {/* Pin Option (Admin Only) */}
        {canPin && (
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('isPinned')}
                className="form-checkbox"
              />
              <span className="checkbox-text">
                📌 Pin this announcement
              </span>
            </label>
            <div className="form-hint">
              Pinned announcements appear at the top of the feed
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || uploadingImage}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              mode === 'create' ? '📢 Create Announcement' : '✏️ Update Announcement'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnnouncementForm;