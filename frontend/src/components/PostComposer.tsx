import React, { useState, useRef } from 'react';
import { PostType, MediaFile, CreatePostRequest } from '../types/Post';
import { createPost, uploadMedia } from '../services/postApi';
import { useOrganization } from '../contexts/OrganizationContext';
import { useGroup } from '../contexts/GroupContext';
import './PostComposer.css';

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
}

const PostComposer: React.FC<PostComposerProps> = ({
  onPostCreated,
  onCancel,
  placeholder = "What's happening in your church community?",
  replyTo,
  quoteTo
}) => {
  // Multi-tenant contexts
  const { primaryMembership, allMemberships } = useOrganization();
  const { unmutedGroups } = useGroup();

  const [content, setContent] = useState('');
  const [selectedPostType, setSelectedPostType] = useState<PostType>(PostType.GENERAL);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Multi-tenant post targeting
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(
    primaryMembership?.organizationId
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxContentLength = 2000;
  const maxMediaFiles = 4;

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

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
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

    setIsSubmitting(true);
    setError('');

    try {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];

      // Upload media files if any
      if (mediaFiles.length > 0) {
        const files = mediaFiles.map(mf => mf.file);
        mediaUrls = await uploadMedia(files);
        mediaTypes = mediaFiles.map(mf => mf.type);
      }

      // Create the post request
      const postRequest: CreatePostRequest = {
        content: content.trim(),
        mediaUrls,
        mediaTypes,
        postType: selectedPostType,
        category: category.trim() || undefined,
        location: location.trim() || undefined,
        anonymous: isAnonymous,
        // Multi-tenant fields
        organizationId: selectedOrganizationId,
        groupId: selectedGroupId
      };

      // Create the post
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
        {/* Post Type Selector */}
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
              className="toolbar-button"
              disabled={mediaFiles.length >= maxMediaFiles}
              title="Add media"
            >
              📎 Media
            </button>

            <button
              type="button"
              onClick={() => insertEmoji('🙏')}
              className="toolbar-button"
              title="Add prayer emoji"
            >
              🙏
            </button>

            <button
              type="button"
              onClick={() => insertEmoji('❤️')}
              className="toolbar-button"
              title="Add heart emoji"
            >
              ❤️
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="toolbar-button"
              title="Advanced options"
            >
              ⚙️ Advanced
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
                  setSelectedOrganizationId(e.target.value || undefined);
                  setSelectedGroupId(undefined); // Reset group when org changes
                }}
                className="organization-select"
              >
                <option value="">Global Feed (No Organization)</option>
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
                  onChange={(e) => setSelectedGroupId(e.target.value || undefined)}
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

            <div className="option-group">
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
            </div>

            <div className="option-group">
              <label htmlFor="location">Location:</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Church location or event venue"
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
    </div>
  );
};

export default PostComposer;
