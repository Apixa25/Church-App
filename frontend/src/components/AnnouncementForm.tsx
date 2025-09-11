import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
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
      isPinned: existingAnnouncement?.isPinned || false
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    existingAnnouncement?.imageUrl || null
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const canManageAnnouncements = isAdmin || isModerator;

  const watchedImageUrl = watch('imageUrl');
  const watchedCategory = watch('category');

  useEffect(() => {
    if (watchedImageUrl && watchedImageUrl !== imagePreview) {
      setImagePreview(watchedImageUrl);
    }
  }, [watchedImageUrl, imagePreview]);

  // Check permissions
  useEffect(() => {
    if (!canManageAnnouncements) {
      setError('You do not have permission to create announcements. Only admins and moderators can create announcements.');
    }
  }, [canManageAnnouncements]);

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
      // In a real app, you would upload to S3 here
      // For now, we'll create a local URL for preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // TODO: Implement actual S3 upload
      // const uploadedUrl = await uploadToS3(file);
      // setValue('imageUrl', uploadedUrl);
      
      // For demo purposes, set a placeholder URL
      setValue('imageUrl', `https://demo-s3-bucket.com/announcements/${Date.now()}-${file.name}`);
      
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setValue('imageUrl', '');
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    if (!canManageAnnouncements) {
      setError('You do not have permission to create announcements');
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
          isPinned: isAdmin ? data.isPinned : false // Only admins can pin during creation
        };

        const response = await announcementAPI.createAnnouncement(createRequest);
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
          isPinned: isAdmin ? data.isPinned : existingAnnouncement.isPinned // Only admins can change pin status
        };

        const response = await announcementAPI.updateAnnouncement(existingAnnouncement.id, updateRequest);
        result = response.data;
        setSuccess('Announcement updated successfully!');
      }

      // Reset form after successful submission
      if (mode === 'create') {
        reset();
        setImagePreview(null);
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

  if (!canManageAnnouncements) {
    return (
      <div className="announcement-form-error">
        <div className="error-container">
          <h3>Access Denied</h3>
          <p>You do not have permission to create announcements. Only admins and moderators can create announcements.</p>
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

        {/* Pin Option (Admin Only) */}
        {isAdmin && (
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