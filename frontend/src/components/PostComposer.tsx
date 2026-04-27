import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { PostType, MediaFile, CreatePostRequest } from '../types/Post';
import { createPost } from '../services/postApi';
import { useOrganization } from '../contexts/OrganizationContext';
import { useGroup } from '../contexts/GroupContext';
import { useUploadQueue } from '../contexts/UploadQueueContext';
import CameraCapture from './CameraCapture';
import SocialMediaEmbedCard from './SocialMediaEmbedCard';
import { 
  isSupportedSocialMediaUrl, 
  normalizeForStorage, 
  detectPlatform,
  SocialMediaPlatform 
} from '../utils/socialMediaUtils';
import { createStableUploadFile, processImageForUpload } from '../utils/imageUtils';
import './PostComposer.css';

// ============================================================================
// FEATURE FLAGS - Toggle these to show/hide post composer features
// ============================================================================
const SHOW_POST_TYPE_SELECTOR = false; // Set to true to enable different post types
// ============================================================================

const isAndroidBrowser = (): boolean =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

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
  /** Default group to post to (pre-selects the group in dropdown) */
  defaultGroupId?: string;
}

const PostComposer: React.FC<PostComposerProps> = ({
  onPostCreated,
  onCancel,
  placeholder = "Share what's happening in your community...",
  replyTo,
  quoteTo,
  initialMediaFile,
  defaultGroupId
}) => {
  // Multi-tenant contexts - Dual Primary System
  const { primaryMembership, familyPrimary, allMemberships } = useOrganization();
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
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Social media embed state
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [detectedPlatform, setDetectedPlatform] = useState<SocialMediaPlatform | null>(null);

  // Multi-tenant post targeting - Priority: defaultGroupId > Family > Church > First Group > Global
  // Compute initial values based on priority
  const getInitialTarget = () => {
    // If defaultGroupId is provided, use it (from GroupPage)
    if (defaultGroupId) {
      return { orgId: undefined, groupId: defaultGroupId };
    }
    // Priority 1: Family Primary
    if (familyPrimary?.organizationId) {
      return { orgId: familyPrimary.organizationId, groupId: undefined };
    }
    // Priority 2: Church Primary
    if (primaryMembership?.organizationId) {
      return { orgId: primaryMembership.organizationId, groupId: undefined };
    }
    // Priority 3: First unmuted group (if user has groups but no orgs)
    if (unmutedGroups.length > 0) {
      return { orgId: undefined, groupId: unmutedGroups[0].groupId };
    }
    // Priority 4: Global feed
    return { orgId: '00000000-0000-0000-0000-000000000001', groupId: undefined };
  };

  const initialTarget = getInitialTarget();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(initialTarget.orgId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialTarget.groupId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref to hold the latest camera capture handler - ensures Portal always has fresh reference
  const cameraCallbackRef = useRef<((file: File) => void) | null>(null);
  
  // Track if we've processed the initial file to avoid duplicates
  const initialFileProcessedRef = useRef(false);

  const maxContentLength = 2000;
  const maxMediaFiles = 4;
  
  const prepareFileForUpload = useCallback(async (file: File): Promise<File> => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isAndroidImage = fileType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp') ||
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif');

    if (!isAndroidBrowser() || !isAndroidImage) {
      return file;
    }

    try {
      return await createStableUploadFile(file);
    } catch (err) {
      console.warn('⚠️ Android stable file copy failed, using original file:', err);
      return file;
    }
  }, []);

  // Handle initial media file from camera capture (passed from App.tsx)
  useEffect(() => {
    let isCancelled = false;

    const addInitialMediaFile = async () => {
      if (!initialMediaFile || initialFileProcessedRef.current) {
        return;
      }

      console.log('📸 PostComposer: Processing initial media file from props:', initialMediaFile.name);
      initialFileProcessedRef.current = true;

      const uploadFile = await prepareFileForUpload(initialMediaFile);

      if (isCancelled) {
        return;
      }

      // Create media file object
      const objectUrl = URL.createObjectURL(uploadFile);
      const mediaFile: MediaFile = {
        file: uploadFile,
        url: objectUrl,
        type: uploadFile.type.startsWith('image/') ? 'image' : 'video',
        name: uploadFile.name,
        size: uploadFile.size
      };

      setMediaFiles([mediaFile]);
      console.log('📸 PostComposer: Initial media file added successfully');
    };

    addInitialMediaFile();

    return () => {
      isCancelled = true;
    };
  }, [initialMediaFile, prepareFileForUpload]);

  // Sync selected organization when memberships load (Family Primary takes precedence)
  useEffect(() => {
    // Only update if no organization is currently selected and we have memberships
    if (!selectedOrganizationId && (familyPrimary || primaryMembership)) {
      const defaultOrgId = familyPrimary?.organizationId || primaryMembership?.organizationId;
      if (defaultOrgId) {
        setSelectedOrganizationId(defaultOrgId);
      }
    }
  }, [familyPrimary, primaryMembership, selectedOrganizationId]);

  const postTypes = [
    { type: PostType.GENERAL, label: 'General Post', icon: '💬', description: 'Share thoughts with your community' },
    { type: PostType.PRAYER, label: 'Prayer Request', icon: '🙏', description: 'Share prayer needs' },
    { type: PostType.TESTIMONY, label: 'Testimony', icon: '✨', description: 'Share spiritual experiences' },
    { type: PostType.ANNOUNCEMENT, label: 'Announcement', icon: '📢', description: 'Church announcements' }
  ];

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxContentLength) {
      setContent(value);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (mediaFiles.length + files.length > maxMediaFiles) {
      setError(`Maximum ${maxMediaFiles} media files allowed`);
      return;
    }

    // Process each file (async to handle HEIC conversion)
    for (const file of files) {
      // Validate file type - more permissive for mobile
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      const isVideo = fileType.startsWith('video/');
      const isImage = fileType.startsWith('image/') || 
        fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
        (fileType === '' && (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')));
      
      if (!isImage && !isVideo) {
        setError('Only image and video files are allowed');
        continue;
      }

      // Validate file size (different limits for images vs videos)
      const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024; // 500MB for videos, 100MB for images
      const maxSizeMB = isVideo ? 500 : 100;
      
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSizeMB}MB${isVideo ? ' for videos' : ' for images'}`);
        continue;
      }

      const uploadFile = await prepareFileForUpload(file);

      // Process image for upload (converts HEIC from iPhone, compresses large files)
      let processedFile = uploadFile;
      if (isImage) {
        try {
          console.log('📷 Processing image for post:', uploadFile.name);
          processedFile = await processImageForUpload(uploadFile, 1920, 1920, 5 * 1024 * 1024);
        } catch (err) {
          console.error('❌ Image processing failed, using original:', err);
        }
      }

      // Create media file object
      const mediaFile: MediaFile = {
        file: processedFile,
        url: URL.createObjectURL(processedFile),
        type: isImage ? 'image' : 'video',
        name: processedFile.name,
        size: processedFile.size
      };

      setMediaFiles(prev => [...prev, mediaFile]);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // The actual camera capture handler - wrapped in useCallback for stability
  const handleCameraCapture = useCallback(async (file: File) => {
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
    
    const uploadFile = await prepareFileForUpload(file);

    // Process image for upload (converts HEIC from iPhone, compresses large files)
    let processedFile = uploadFile;
    const isImage = file.type.startsWith('image/') || 
      file.name.toLowerCase().endsWith('.heic') || 
      file.name.toLowerCase().endsWith('.heif');
    
    if (isImage) {
      try {
        console.log('📸 PostComposer: Processing camera capture image...');
        processedFile = await processImageForUpload(uploadFile, 1920, 1920, 5 * 1024 * 1024);
        console.log('📸 PostComposer: Image processed successfully');
      } catch (err) {
        console.error('❌ PostComposer: Image processing failed, using original:', err);
      }
    }
    
    // Validate file count using functional check to avoid stale closure
    setMediaFiles(prev => {
      if (prev.length >= maxMediaFiles) {
        console.warn('📸 PostComposer: Max files reached');
        setError(`Maximum ${maxMediaFiles} media files allowed`);
        return prev; // Return unchanged
      }

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(processedFile);
      console.log('📸 PostComposer: Created object URL:', objectUrl);

      // Create media file object
      const mediaFile: MediaFile = {
        file: processedFile,
        url: objectUrl,
        type: isImage ? 'image' : 'video',
        name: processedFile.name,
        size: processedFile.size
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
  }, [maxMediaFiles, prepareFileForUpload]);
  
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
  
  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newFiles[index].url);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Handle external URL input and detection
  const handleExternalUrlChange = (url: string) => {
    setExternalUrl(url);
    
    if (url.trim()) {
      const normalized = normalizeForStorage(url.trim());
      if (isSupportedSocialMediaUrl(normalized)) {
        const platform = detectPlatform(normalized);
        setDetectedPlatform(platform);
        setError(''); // Clear any previous errors
      } else {
        setDetectedPlatform(null);
        if (url.trim().length > 0) {
          setError('Unsupported URL. Supported platforms: X (Twitter), Facebook Reels, Instagram Reels, YouTube');
        }
      }
    } else {
      setDetectedPlatform(null);
      setError('');
    }
  };

  const handleRemoveExternalUrl = () => {
    setExternalUrl('');
    setDetectedPlatform(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && mediaFiles.length === 0 && !externalUrl.trim()) {
      setError('Please add some content, media, or a social media link to your post');
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
        groupId: selectedGroupId,
        externalUrl: externalUrl.trim() ? normalizeForStorage(externalUrl.trim()) : undefined
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
      setExternalUrl('');
      setDetectedPlatform(null);

      // Close composer immediately - upload continues in background
      if (onCancel) {
        onCancel();
      }

      return; // Done! Upload continues in background with progress indicator
    }

    // 🔄 NO MEDIA: Use original synchronous flow (fast, no upload needed)
    setIsSubmitting(true);

    try {
      const normalizedExternalUrl = externalUrl.trim() ? normalizeForStorage(externalUrl.trim()) : undefined;
      console.log('📤 Creating post with externalUrl:', normalizedExternalUrl);
      
      const postRequest: CreatePostRequest = {
        content: content.trim(),
        mediaUrls: [],
        mediaTypes: [],
        postType: selectedPostType,
        category: category.trim() || undefined,
        location: location.trim() || undefined,
        anonymous: isAnonymous,
        organizationId: selectedOrganizationId,
        groupId: selectedGroupId,
        externalUrl: normalizedExternalUrl
      };

      console.log('📤 Post request:', { 
        hasContent: !!content.trim(), 
        externalUrl: normalizedExternalUrl,
        platform: detectedPlatform 
      });

      const newPost = await createPost(postRequest);
      
      console.log('✅ Post created:', {
        id: newPost.id,
        externalUrl: newPost.externalUrl,
        externalPlatform: newPost.externalPlatform,
        hasEmbedHtml: !!newPost.externalEmbedHtml
      });

      // Clear form
      setContent('');
      setMediaFiles([]);
      setCategory('');
      setLocation('');
      setIsAnonymous(false);
      setSelectedPostType(PostType.GENERAL);
      setExternalUrl('');
      setDetectedPlatform(null);

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
    setExternalUrl('');
    setDetectedPlatform(null);

    if (onCancel) {
      onCancel();
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
                    playsInline
                    crossOrigin="anonymous"
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

        {/* Social Media Embed Preview */}
        {externalUrl.trim() && detectedPlatform && (
          <div className="social-media-preview">
            <SocialMediaEmbedCard
              embedHtml="" // Will be populated by backend after post creation
              externalUrl={normalizeForStorage(externalUrl.trim())}
              platform={detectedPlatform}
              onRemove={handleRemoveExternalUrl}
            />
            <div className="embed-preview-note">
              💡 Preview will appear after posting. The embed will be fetched automatically.
            </div>
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

            {/* Combined Post To selector - shows organizations and groups */}
            <select
              value={selectedGroupId ? `group:${selectedGroupId}` : (selectedOrganizationId || 'global')}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'global') {
                  setSelectedOrganizationId('00000000-0000-0000-0000-000000000001');
                  setSelectedGroupId(undefined);
                } else if (value.startsWith('group:')) {
                  const groupId = value.replace('group:', '');
                  setSelectedGroupId(groupId);
                  setSelectedOrganizationId(undefined); // Groups take priority
                } else {
                  setSelectedOrganizationId(value);
                  setSelectedGroupId(undefined);
                }
              }}
              className="toolbar-organization-select"
              title="Choose where to post"
            >
              <option value="global">🌐 Global Feed</option>
              {allMemberships.length > 0 && (
                <optgroup label="Organizations">
                  {allMemberships.map(membership => (
                    <option key={membership.id} value={membership.organizationId}>
                      {membership.organizationType === 'FAMILY' ? '🏠' : '⛪'} {membership.organizationName}
                    </option>
                  ))}
                </optgroup>
              )}
              {unmutedGroups.length > 0 && (
                <optgroup label="My Groups">
                  {unmutedGroups.map(membership => (
                    <option key={membership.id} value={`group:${membership.groupId}`}>
                      👥 {membership.groupName}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="toolbar-right">
            <button
              type="button"
              onClick={() => setShowMoreOptions(true)}
              className="toolbar-button more-options-button"
              title="More options"
            >
              More Options
            </button>
          </div>
        </div>

        {/* More Options Modal */}
        {showMoreOptions && ReactDOM.createPortal(
          <div className="more-options-modal-overlay" onClick={() => setShowMoreOptions(false)}>
            <div className="more-options-modal" onClick={(e) => e.stopPropagation()}>
              <h3>⚙️ More Options</h3>

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

              {/* Social Media Embed Section */}
              <div className="option-group">
                <label htmlFor="externalUrl">
                  🔗 Share Social Media Content (X, Facebook, Instagram, YouTube):
                </label>
                <input
                  id="externalUrl"
                  type="text"
                  value={externalUrl}
                  onChange={(e) => handleExternalUrlChange(e.target.value)}
                  placeholder="Paste a link from X, Facebook, Instagram, or YouTube..."
                  className="external-url-input"
                />
                {detectedPlatform && (
                  <div className="url-detected-badge">
                    ✓ {detectedPlatform === SocialMediaPlatform.X_POST ? 'X' : detectedPlatform} link detected
                  </div>
                )}
                {externalUrl.trim() && !detectedPlatform && (
                  <div className="url-error-badge">
                    ⚠️ Unsupported URL format
                  </div>
                )}
              </div>

              <button
                type="button"
                className="close-modal-button"
                onClick={() => setShowMoreOptions(false)}
              >
                Close
              </button>
            </div>
          </div>,
          document.body
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
