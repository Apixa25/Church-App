import React, { useState } from 'react';
import { Post, SharePostRequest } from '../types/Post';
import { likePost, unlikePost, bookmarkPost, unbookmarkPost } from '../services/postApi';
import LikeButton from './LikeButton';
import ShareModal from './ShareModal';
import CommentForm from './CommentForm';
import './PostActions.css';

interface PostActionsProps {
  post: Post;
  onPostUpdate: (updatedPost: Post) => void;
  onCommentSubmit?: (postId: string, comment: any) => void;
  showLabels?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

const PostActions: React.FC<PostActionsProps> = ({
  post,
  onPostUpdate,
  onCommentSubmit,
  showLabels = false,
  compact = false,
  disabled = false
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);

  const handleLike = async () => {
    try {
      const wasLiked = post.isLikedByCurrentUser || false;

      if (wasLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }

      const updatedPost: Post = {
        ...post,
        isLikedByCurrentUser: !wasLiked,
        likesCount: wasLiked ? post.likesCount - 1 : post.likesCount + 1
      };

      onPostUpdate(updatedPost);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      const wasBookmarked = post.isBookmarkedByCurrentUser || false;

      if (wasBookmarked) {
        await unbookmarkPost(post.id);
      } else {
        await bookmarkPost(post.id);
      }

      const updatedPost: Post = {
        ...post,
        isBookmarkedByCurrentUser: !wasBookmarked,
        bookmarksCount: wasBookmarked ? post.bookmarksCount - 1 : post.bookmarksCount + 1
      };

      onPostUpdate(updatedPost);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleShare = async (_shareRequest: SharePostRequest) => {
    const updatedPost: Post = {
      ...post,
      sharesCount: post.sharesCount + 1
    };

    onPostUpdate(updatedPost);
  };

  const handleCommentSubmit = async (commentRequest: any) => {
    if (onCommentSubmit) {
      onCommentSubmit(post.id, commentRequest);
    }

    const updatedPost: Post = {
      ...post,
      commentsCount: post.commentsCount + 1
    };

    onPostUpdate(updatedPost);
    setIsCommentFormOpen(false);
  };

  const handleCommentCancel = () => {
    setIsCommentFormOpen(false);
  };

  return (
    <div className={`post-actions ${compact ? 'compact' : ''}`}>
      {/* Like Button */}
      <div className="action-group">
        <LikeButton
          isLiked={post.isLikedByCurrentUser || false}
          likesCount={post.likesCount}
          onLikeToggle={handleLike}
          size={compact ? 'small' : 'medium'}
          showCount={!compact}
          disabled={disabled}
        />
        {showLabels && (
          <span className="action-label">
            {post.isLikedByCurrentUser ? 'Liked' : 'Like'}
          </span>
        )}
      </div>

      {/* Comment Button */}
      <div className="action-group">
        <button
          className={`action-button comment-button ${isCommentFormOpen ? 'active' : ''}`}
          onClick={() => setIsCommentFormOpen(!isCommentFormOpen)}
          disabled={disabled}
          aria-label={`Comment on post (${post.commentsCount} comments)`}
        >
          <span className="action-icon">💬</span>
          {!compact && (
            <span className="action-count">
              {post.commentsCount > 0 ? post.commentsCount : ''}
            </span>
          )}
        </button>
        {showLabels && (
          <span className="action-label">Comment</span>
        )}
      </div>

      {/* Share Button */}
      <div className="action-group">
        <button
          className="action-button share-button"
          onClick={() => setIsShareModalOpen(true)}
          disabled={disabled}
          aria-label={`Share post (${post.sharesCount} shares)`}
        >
          <span className="action-icon">🔄</span>
          {!compact && (
            <span className="action-count">
              {post.sharesCount > 0 ? post.sharesCount : ''}
            </span>
          )}
        </button>
        {showLabels && (
          <span className="action-label">Share</span>
        )}
      </div>

      {/* Bookmark Button */}
      <div className="action-group">
        <button
          className={`action-button bookmark-button ${post.isBookmarkedByCurrentUser ? 'active' : ''}`}
          onClick={handleBookmark}
          disabled={disabled}
          aria-label={post.isBookmarkedByCurrentUser ? 'Remove bookmark' : 'Bookmark post'}
        >
          <span className="action-icon">
            {post.isBookmarkedByCurrentUser ? '🔖' : '📖'}
          </span>
          {!compact && (
            <span className="action-count">
              {post.bookmarksCount > 0 ? post.bookmarksCount : ''}
            </span>
          )}
        </button>
        {showLabels && (
          <span className="action-label">
            {post.isBookmarkedByCurrentUser ? 'Bookmarked' : 'Bookmark'}
          </span>
        )}
      </div>

      {/* Quick Actions Menu (for larger screens) */}
      {!compact && (
        <div className="action-group quick-actions">
          <button
            className="action-button more-button"
            onClick={() => {/* TODO: Implement more actions menu */}}
            disabled={disabled}
            aria-label="More actions"
          >
            <span className="action-icon">⋯</span>
          </button>
        </div>
      )}

      {/* Comment Form */}
      {isCommentFormOpen && (
        <div className="comment-form-container">
          <CommentForm
            onSubmit={handleCommentSubmit}
            onCancel={handleCommentCancel}
            placeholder={`Share your thoughts about this ${post.postType.toLowerCase()}...`}
            compact={compact}
            showAnonymousOption={true}
          />
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        post={post}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShare={handleShare}
      />

      {/* Action Stats (for detailed view) */}
      {!compact && (
        <div className="action-stats">
          <div className="stat-item">
            <span className="stat-icon">❤️</span>
            <span className="stat-count">{post.likesCount}</span>
            <span className="stat-label">likes</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💬</span>
            <span className="stat-count">{post.commentsCount}</span>
            <span className="stat-label">comments</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔄</span>
            <span className="stat-count">{post.sharesCount}</span>
            <span className="stat-label">shares</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔖</span>
            <span className="stat-count">{post.bookmarksCount}</span>
            <span className="stat-label">bookmarks</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostActions;
