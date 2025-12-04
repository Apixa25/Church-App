import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { PostType, MediaFile, CreatePostRequest } from '../types/Post';
import { createPost } from '../services/postApi';
import { useOrganization } from '../contexts/OrganizationContext';
import { useGroup } from '../contexts/GroupContext';
import { useUploadQueue } from '../contexts/UploadQueueContext';
import CameraCapture from './CameraCapture';
import './PostComposer.css';

// ============================================================================
// FEATURE FLAGS - Toggle these to show/hide post composer features
// ============================================================================
const SHOW_POST_TYPE_SELECTOR = false; // Set to true to enable different post types
// ============================================================================

interface PostComposerProps {
  onPostCreated?: (post: any) => void;
  onCancel?: () => void;
  placeholder?: string;
  replyTo?: {
    postId: string;
    authorName: string;
  };
  quoteTo?: {
    postId: string;
    authorName: string;
    content: string;
  };
  /** Initial media file to attach (e.g., from camera capture) */
  initialMediaFile?: File;
}

const PostComposer: React.FC<PostComposerProps> = ({
  onPostCreated,
  onCancel,
  placeholder = "Share what's happening in your community...",
  replyTo,
  quoteTo,
  initialMediaFile
}) => {
  // Multi-tenant contexts
  const { primaryMembership, allMemberships } = useOrganization();
  const { unmutedGroups } = useGroup();
  
  // 🚀 Background upload queue - allows users to navigate while uploads continue
  const { addUploadJob } = useUploadQueue();

  const [content, setContent] = useState('');
  const [selectedPostType, setSelectedPostType] = useState<PostType>(PostType.GENERAL);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Multi-tenant post targeting
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(
    primaryMembership?.organizationId
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref to hold the latest camera capture handler - ensures Portal always has fresh reference
  const cameraCallbackRef = useRef<((file: File) => void) | null>(null);
  
  // Track if we've processed the initial file to avoid duplicates
  const initialFileProcessedRef = useRef(false);

  const maxContentLength = 2000;
  const maxMediaFiles = 4;
  
  // Handle initial media file from camera capture (passed from App.tsx)
  useEffect(() => {
    if (initialMediaFile && !initialFileProcessedRef.current) {
      console.log('📸 PostComposer: Processing initial media file from props:', initialMediaFile.name);
      initialFileProcessedRef.current = true;
      
      // Create media file object
      const objectUrl = URL.createObjectURL(initialMediaFile);
      const mediaFile: MediaFile = {
        file: initialMediaFile,
        url: objectUrl,
        type: initialMediaFile.type.startsWith('image/') ? 'image' : 'video',
        name: initialMediaFile.name,
        size: initialMediaFile.size
      };
      
      setMediaFiles([mediaFile]);
      console.log('📸 PostComposer: Initial media file added successfully');
    }
  }, [initialMediaFile]);

  const postTypes = [
    { type: PostType.GENERAL, label: 'General Post', icon: '💬', description: 'Share thoughts with your community' },
    { type: PostType.PRAYER, label: 'Prayer Request', icon: '🙏', description: 'Share prayer needs' },
    { type: PostType.TESTIMONY, label: 'Testimony', icon: '✨', description: 'Share spiritual experiences' },
    { type: PostType.ANNOUNCEMENT, label: 'Announcement', icon: '📢', description: 'Church announcements' }
  ];

  const categories = [
    'Praise Report', 'Prayer Request', 'Bible Study', 'Youth Group',
    'Worship', 'Outreach', 'Fellowship', 'Ministry Update'
  ];

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxContentLength) {
      setContent(value);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (mediaFiles.length + files.length > maxMediaFiles) {
      setError(`Maximum ${maxMediaFiles} media files allowed`);
      return;
    }

    // Process each file
    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('Only image and video files are allowed');
        return;
      }

      // Validate file size (different limits for images vs videos)
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 75 * 1024 * 1024 : 20 * 1024 * 1024; // 75MB for videos, 20MB for images
      const maxSizeMB = isVideo ? 75 : 20;
      
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSizeMB}MB${isVideo ? ' for videos' : ' for images'}`);
        return;
      }

      // Create media file object
      const mediaFile: MediaFile = {
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
        size: file.size
      };

      setMediaFiles(prev => [...prev, mediaFile]);
    });

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // The actual camera capture handler - wrapped in useCallback for stability
  const handleCameraCapture = useCallback((file: File) => {
    console.log('📸 PostComposer: handleCameraCapture called');
    console.log('📸 PostComposer: File received:', file.name, file.type, file.size);
    
    // Validate the file object
    if (!file || !(file instanceof File)) {
      console.error('📸 PostComposer: Invalid file object received!');
      setError('Failed to capture media. Please try again.');
      return;
    }
    
    // Validate file has data
    if (file.size === 0) {
      console.error('📸 PostComposer: File is empty!');
      setError('Captured media is empty. Please try again.');
      return;
    }
    
    // Validate file count using functional check to avoid stale closure
    setMediaFiles(prev => {
      if (prev.length >= maxMediaFiles) {
        console.warn('📸 PostComposer: Max files reached');
        setError(`Maximum ${maxMediaFiles} media files allowed`);
        return prev; // Return unchanged
      }

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      console.log('📸 PostComposer: Created object URL:', objectUrl);

      // Create media file object
      const mediaFile: MediaFile = {
        file,
        url: objectUrl,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
        size: file.size
      };

      console.log('📸 PostComposer: Adding media file to state:', {
        name: mediaFile.name,
        type: mediaFile.type,
        size: mediaFile.size,
        url: mediaFile.url
      });
      
      const newFiles = [...prev, mediaFile];
      console.log('📸 PostComposer: Media files count after update:', newFiles.length);
      return newFiles;
    });
    
    // Close camera modal
    setShowCamera(false);
    
    console.log('📸 PostComposer: handleCameraCapture completed successfully');
  }, [maxMediaFiles]);
  
  // Keep the ref updated with the latest handler
  useEffect(() => {
    cameraCallbackRef.current = handleCameraCapture;
  }, [handleCameraCapture]);
  
  // Stable wrapper that always calls through the ref - survives Portal remounts
  const stableCameraCapture = useCallback((file: File) => {
    console.log('📸 PostComposer: stableCameraCapture called - routing through ref');
    if (cameraCallbackRef.current) {
      cameraCallbackRef.current(file);
    } else {
      console.error('📸 PostComposer: cameraCallbackRef.current is null!');
    }
  }, []);
  
  // DEBUG: Expose the capture function globally for testing
  useEffect(() => {
    console.log('📸 PostComposer: Registering global camera capture function');
    (window as any).__cameraCaptureCallback = handleCameraCapture;
    return () => {
      delete (window as any).__cameraCaptureCallback;
    };
  }, [handleCameraCapture]);

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newFiles[index].url);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && mediaFiles.length === 0) {
      setError('Please add some content or media to your post');
      return;
    }

    if (content.length > maxContentLength) {
      setError(`Post content cannot exceed ${maxContentLength} characters`);
      return;
    }

    setError('');

    // 🚀 BACKGROUND UPLOAD: If there are media files, use the upload queue
    // This allows users to navigate freely while uploads happen in the background
    if (mediaFiles.length > 0) {
      // Queue the upload job - this returns immediately!
      addUploadJob({
        content: content,
        mediaFiles: mediaFiles.map(mf => mf.file),
        mediaTypes: mediaFiles.map(mf => mf.type),
        postType: selectedPostType,
        category: category.trim() || undefined,
        location: location.trim() || undefined,
        isAnonymous: isAnonymous,
        organizationId: selectedOrganizationId,
        groupId: selectedGroupId
      });

      // Clean up object URLs immediately
      mediaFiles.forEach(mf => URL.revokeObjectURL(mf.url));
      
      // Clear form immediately - user is free to navigate!
      setContent('');
      setMediaFiles([]);
      setCategory('');
      setLocation('');
      setIsAnonymous(false);
      setSelectedPostType(PostType.GENERAL);

      // Close composer immediately - upload continues in background
      if (onCancel) {
        onCancel();
      }

      return; // Done! Upload continues in background with progress indicator
    }

    // 🔄 NO MEDIA: Use original synchronous flow (fast, no upload needed)
    setIsSubmitting(true);

    try {
      const postRequest: CreatePostRequest = {
        content: content.trim(),
        mediaUrls: [],
        mediaTypes: [],
        postType: selectedPostType,
        category: category.trim() || undefined,
        location: location.trim() || undefined,
        anonymous: isAnonymous,
        organizationId: selectedOrganizationId,
        groupId: selectedGroupId
      };

      const newPost = await createPost(postRequest);

      // Clear form
      setContent('');
      setMediaFiles([]);
      setCategory('');
      setLocation('');
      setIsAnonymous(false);
      setSelectedPostType(PostType.GENERAL);

      // Notify parent component
      if (onPostCreated) {
        onPostCreated(newPost);
      }

    } catch (error: any) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Clean up object URLs
    mediaFiles.forEach(mf => URL.revokeObjectURL(mf.url));
    setContent('');
    setMediaFiles([]);
    setError('');

    if (onCancel) {
      onCancel();
    }
  };

  const insertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);

      // Focus back to textarea and set cursor position
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  const characterCount = content.length;
  const isNearLimit = characterCount > maxContentLength * 0.9;

  return (
    <div className="post-composer">
      {/* Reply/Quote Header */}
      {(replyTo || quoteTo) && (
        <div className="composer-header">
          {replyTo && (
            <div className="reply-header">
              <span>Replying to @{replyTo.authorName}</span>
            </div>
          )}
          {quoteTo && (
            <div className="quote-header">
              <span>Quoting @{quoteTo.authorName}</span>
              <blockquote className="quoted-content">
                {quoteTo.content.length > 100
                  ? `${quoteTo.content.substring(0, 100)}...`
                  : quoteTo.content}
              </blockquote>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="composer-form">
        {/* Post Type Selector - Hidden by default, can be re-enabled with SHOW_POST_TYPE_SELECTOR flag */}
        {SHOW_POST_TYPE_SELECTOR && (
          <div className="post-type-selector">
            {postTypes.map(({ type, label, icon, description }) => (
              <button
                key={type}
                type="button"
                className={`post-type-button ${selectedPostType === type ? 'active' : ''}`}
                onClick={() => setSelectedPostType(type)}
                title={description}
              >
                <span className="post-type-icon">{icon}</span>
                <span className="post-type-label">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <div className="composer-content">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder={placeholder}
            className="composer-textarea"
            rows={4}
            maxLength={maxContentLength}
          />

          {/* Character Counter */}
          <div className={`character-counter ${isNearLimit ? 'near-limit' : ''}`}>
            {characterCount}/{maxContentLength}
          </div>
        </div>

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="media-preview">
            {mediaFiles.map((mediaFile, index) => (
              <div key={index} className="media-preview-item">
                {mediaFile.type === 'image' ? (
                  <img
                    src={mediaFile.url}
                    alt={mediaFile.name}
                    className="media-preview-image"
                  />
                ) : (
                  <video
                    src={mediaFile.url}
                    className="media-preview-video"
                    controls
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMediaFile(index)}
                  className="remove-media-button"
                  aria-label="Remove media"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="composer-toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="toolbar-button media-button"
              disabled={mediaFiles.length >= maxMediaFiles}
              title="Add media"
            >
              📎
            </button>

            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="toolbar-button camera-button"
              disabled={mediaFiles.length >= maxMediaFiles}
              title="Take photo/video"
            >
              📷
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="toolbar-button group-select-button"
              title="What group do you want to post to?"
            >
              What group do you want to post to?
            </button>
          </div>

          <div className="toolbar-right">
            <span className="media-count">
              {mediaFiles.length}/{maxMediaFiles} media
            </span>
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="advanced-options">
            {/* Multi-tenant: Organization selector */}
            <div className="option-group">
              <label htmlFor="organization">Post to Organization:</label>
              <select
                id="organization"
                value={selectedOrganizationId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  // If empty string (Global Feed), use the actual Global Organization UUID
                  setSelectedOrganizationId(
                    value === '' ? '00000000-0000-0000-0000-000000000001' : (value || undefined)
                  );
                  setSelectedGroupId(undefined); // Reset group when org changes
                }}
                className="organization-select"
              >
                <option value="">🌐 Global Feed (All Organizations)</option>
                {allMemberships.map(membership => (
                  <option key={membership.id} value={membership.organizationId}>
                    {membership.organizationName}
                    {membership.organizationId === primaryMembership?.organizationId ? ' (Primary)' : ' (Secondary)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-tenant: Group selector */}
            {unmutedGroups.length > 0 && (
              <div className="option-group">
                <label htmlFor="group">Post to Group (optional):</label>
                <select
                  id="group"
                  value={selectedGroupId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedGroupId(value || undefined);
                    // Clear organization when group is selected (group takes priority)
                    if (value) {
                      setSelectedOrganizationId(undefined);
                    }
                  }}
                  className="group-select"
                >
                  <option value="">No specific group</option>
                  {unmutedGroups.map(membership => (
                    <option key={membership.id} value={membership.groupId}>
                      {membership.groupName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category dropdown - Hidden for now, but keeping code for future use */}
            {/* <div className="option-group">
              <label htmlFor="category">Category:</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="category-select"
              >
                <option value="">Select category (optional)</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div> */}

            <div className="option-group">
              <label htmlFor="location">Location:</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="where was this?"
                className="location-input"
                maxLength={100}
              />
            </div>

            <div className="option-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                Post anonymously
              </label>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="composer-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
          >
            {isSubmitting ? 'Posting...' : replyTo ? 'Reply' : quoteTo ? 'Quote' : 'Post'}
          </button>
        </div>
      </form>

      {/* Camera Modal - Rendered via Portal to escape parent container */}
      {showCamera && ReactDOM.createPortal(
        <CameraCapture
          onCapture={stableCameraCapture}
          onClose={() => setShowCamera(false)}
        />,
        document.body
      )}
    </div>
  );
};

export default PostComposer;
