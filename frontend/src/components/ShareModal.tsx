import React, { useState } from 'react';
import { Post, ShareType, SharePostRequest } from '../types/Post';
import './ShareModal.css';

interface ShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onShare: (request: SharePostRequest) => Promise<void>;
}

const ShareModal: React.FC<ShareModalProps> = ({
  post,
  isOpen,
  onClose,
  onShare
}) => {
  const [shareType, setShareType] = useState<ShareType>(ShareType.REPOST);
  const [quoteText, setQuoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const maxQuoteLength = 500;

  const handleShare = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const shareRequest: SharePostRequest = {
        shareType
      };

      if (shareType === ShareType.QUOTE) {
        if (!quoteText.trim()) {
          setError('Please add a quote to share this post');
          setIsSubmitting(false);
          return;
        }
        if (quoteText.length > maxQuoteLength) {
          setError(`Quote cannot exceed ${maxQuoteLength} characters`);
          setIsSubmitting(false);
          return;
        }
        shareRequest.content = quoteText.trim();
      }

      await onShare(shareRequest);
      onClose();

      // Reset form
      setShareType(ShareType.REPOST);
      setQuoteText('');
    } catch (err: any) {
      setError(err.message || 'Failed to share post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const getPostTypeIcon = (type: string): string => {
    switch (type) {
      case 'PRAYER': return '🙏';
      case 'TESTIMONY': return '✨';
      case 'ANNOUNCEMENT': return '📢';
      default: return '💬';
    }
  };

  const getPostTypeColor = (type: string): string => {
    switch (type) {
      case 'PRAYER': return '#4caf50';
      case 'TESTIMONY': return '#ff9800';
      case 'ANNOUNCEMENT': return '#f44336';
      default: return '#2196f3';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="share-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="share-modal-container">
        {/* Header */}
        <div className="share-modal-header">
          <h2>Share Post</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close share modal"
          >
            ✕
          </button>
        </div>

        {/* Original Post Preview */}
        <div className="original-post-preview">
          <div className="post-header">
            <div className="post-author">
              {post.userProfilePicUrl ? (
                <img
                  src={post.userProfilePicUrl}
                  alt={post.userName}
                  className="author-avatar"
                />
              ) : (
                <div className="author-avatar-placeholder">
                  {post.userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="author-info">
                <span className="author-name">
                  {post.isAnonymous ? 'Anonymous' : post.userName}
                </span>
                <span className="post-type-badge" style={{
                  backgroundColor: getPostTypeColor(post.postType),
                  color: 'white'
                }}>
                  {getPostTypeIcon(post.postType)} {post.postType.toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="post-content">
            <p className="post-text">{post.content}</p>
          </div>

          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="post-media">
              <div className="media-count">
                📎 {post.mediaUrls.length} media file{post.mediaUrls.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Share Options */}
        <div className="share-options">
          <h3>How would you like to share this?</h3>

          <div className="share-type-selector">
            <label className="share-type-option">
              <input
                type="radio"
                value={ShareType.REPOST}
                checked={shareType === ShareType.REPOST}
                onChange={(e) => setShareType(e.target.value as ShareType)}
              />
              <div className="option-content">
                <div className="option-icon">🔄</div>
                <div className="option-text">
                  <strong>Repost</strong>
                  <span>Share this post with your followers</span>
                </div>
              </div>
            </label>

            <label className="share-type-option">
              <input
                type="radio"
                value={ShareType.QUOTE}
                checked={shareType === ShareType.QUOTE}
                onChange={(e) => setShareType(e.target.value as ShareType)}
              />
              <div className="option-content">
                <div className="option-icon">💭</div>
                <div className="option-text">
                  <strong>Quote Post</strong>
                  <span>Add your thoughts and share</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Quote Input */}
        {shareType === ShareType.QUOTE && (
          <div className="quote-input-section">
            <label htmlFor="quote-text">Add your thoughts:</label>
            <textarea
              id="quote-text"
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="What do you think about this post?"
              maxLength={maxQuoteLength}
              rows={3}
              className="quote-textarea"
            />
            <div className="character-count">
              {quoteText.length}/{maxQuoteLength}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="share-modal-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            className="share-button"
            onClick={handleShare}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="share-spinner"></div>
                Sharing...
              </>
            ) : shareType === ShareType.QUOTE ? (
              'Quote Post'
            ) : (
              'Repost'
            )}
          </button>
        </div>

        {/* Share Preview */}
        <div className="share-preview">
          <div className="preview-header">
            <span className="preview-label">Preview:</span>
          </div>
          <div className="preview-content">
            {shareType === ShareType.QUOTE ? (
              <>
                <p className="preview-quote">
                  {quoteText || 'Your quote will appear here...'}
                </p>
                <div className="original-post-quote">
                  <blockquote>
                    {post.content.length > 100
                      ? `${post.content.substring(0, 100)}...`
                      : post.content}
                  </blockquote>
                  <cite>— {post.isAnonymous ? 'Anonymous' : post.userName}</cite>
                </div>
              </>
            ) : (
              <div className="repost-preview">
                <div className="repost-indicator">
                  🔄 You reposted
                </div>
                <div className="original-post-content">
                  <strong>{post.isAnonymous ? 'Anonymous' : post.userName}:</strong>
                  <p>{post.content.length > 150
                    ? `${post.content.substring(0, 150)}...`
                    : post.content}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
