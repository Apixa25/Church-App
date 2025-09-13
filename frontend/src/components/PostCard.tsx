import React, { useState } from 'react';
import { Post, PostType, Comment } from '../types/Post';
import { likePost, unlikePost, addComment, bookmarkPost, unbookmarkPost } from '../services/postApi';
import './PostCard.css';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
  showComments?: boolean;
  maxComments?: number;
  compact?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdate,
  showComments = false,
  maxComments = 3,
  compact = false
}) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarkedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);

  const handleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const wasLiked = isLiked;

    try {
      // Optimistic update
      setIsLiked(!wasLiked);
      setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

      if (wasLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }

      // Update parent component if callback provided
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          likesCount: wasLiked ? likesCount - 1 : likesCount + 1,
          isLikedByCurrentUser: !wasLiked
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const wasBookmarked = isBookmarked;

    try {
      // Optimistic update
      setIsBookmarked(!wasBookmarked);

      if (wasBookmarked) {
        await unbookmarkPost(post.id);
      } else {
        await bookmarkPost(post.id);
      }

      // Update parent component if callback provided
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          isBookmarkedByCurrentUser: !wasBookmarked
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsBookmarked(wasBookmarked);
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const newComment = await addComment(post.id, {
        content: commentText.trim(),
        anonymous: false
      });

      setComments(prev => [newComment, ...prev]);
      setCommentsCount(prev => prev + 1);
      setCommentText('');
      setShowCommentForm(false);

      // Update parent component
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          commentsCount: commentsCount + 1
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPostTypeIcon = (postType: PostType): string => {
    switch (postType) {
      case PostType.PRAYER:
        return '🙏';
      case PostType.TESTIMONY:
        return '✨';
      case PostType.ANNOUNCEMENT:
        return '📢';
      default:
        return '💬';
    }
  };

  const getPostTypeLabel = (postType: PostType): string => {
    switch (postType) {
      case PostType.PRAYER:
        return 'Prayer Request';
      case PostType.TESTIMONY:
        return 'Testimony';
      case PostType.ANNOUNCEMENT:
        return 'Announcement';
      default:
        return 'Post';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;

    return date.toLocaleDateString();
  };

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    return (
      <div className="post-media">
        {post.mediaUrls.map((url, index) => {
          const mediaType = post.mediaTypes?.[index] || 'image';
          const isImage = mediaType.startsWith('image');

          return (
            <div key={index} className="media-item">
              {isImage ? (
                <img
                  src={url}
                  alt={`Post media ${index + 1}`}
                  className="media-image"
                  loading="lazy"
                />
              ) : (
                <video
                  src={url}
                  controls
                  className="media-video"
                  preload="metadata"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`post-card ${compact ? 'compact' : ''}`}>
      {/* Post Header */}
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
            <div className="author-name">
              {post.isAnonymous ? 'Anonymous' : post.userName}
              {post.postType !== PostType.GENERAL && (
                <span className="post-type-badge">
                  {getPostTypeIcon(post.postType)} {getPostTypeLabel(post.postType)}
                </span>
              )}
            </div>
            <div className="post-meta">
              {post.location && <span className="location">📍 {post.location}</span>}
              <span className="timestamp">{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="post-content">
        <p className="post-text">{post.content}</p>
        {post.category && (
          <span className="post-category">#{post.category}</span>
        )}
      </div>

      {/* Post Media */}
      {renderMedia()}

      {/* Post Actions */}
      <div className="post-actions">
        <button
          className={`action-button like-button ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={isLoading}
          aria-label={isLiked ? 'Unlike post' : 'Like post'}
        >
          ❤️ {likesCount > 0 && likesCount}
        </button>

        <button
          className="action-button comment-button"
          onClick={() => setShowCommentForm(!showCommentForm)}
          aria-label="Add comment"
        >
          💬 {commentsCount > 0 && commentsCount}
        </button>

        <button
          className={`action-button bookmark-button ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmark}
          disabled={isLoading}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
        >
          🔖
        </button>

        <button
          className="action-button share-button"
          onClick={() => {/* TODO: Implement share modal */}}
          aria-label="Share post"
        >
          🔄 {post.sharesCount > 0 && post.sharesCount}
        </button>
      </div>

      {/* Comment Form */}
      {showCommentForm && (
        <form className="comment-form" onSubmit={handleComment}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={1000}
            rows={3}
          />
          <div className="comment-form-actions">
            <button
              type="button"
              onClick={() => setShowCommentForm(false)}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!commentText.trim() || isLoading}
              className="submit-button"
            >
              {isLoading ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </form>
      )}

      {/* Comments Preview (if enabled) */}
      {showComments && comments.length > 0 && (
        <div className="comments-preview">
          {comments.slice(0, maxComments).map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-author">
                {comment.isAnonymous ? 'Anonymous' : comment.userName}
              </div>
              <div className="comment-content">{comment.content}</div>
            </div>
          ))}
          {commentsCount > maxComments && (
            <button className="view-more-comments">
              View all {commentsCount} comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
