import React, { useState } from 'react';
import { Post, PostType, Comment } from '../types/Post';
import { likePost, unlikePost, addComment, bookmarkPost, unbookmarkPost, deletePost } from '../services/postApi';
import CommentThread from './CommentThread';
import { formatRelativeDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import './PostCard.css';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
  onPostDelete?: (postId: string) => void;
  showComments?: boolean;
  maxComments?: number;
  compact?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdate,
  onPostDelete,
  showComments = false,
  maxComments = 3,
  compact = false
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarkedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Check if current user can delete this post (owner, admin, or moderator)
  const canDelete = user && (
    user.userId === post.userId || 
    user.id === post.userId || 
    user.role === 'ADMIN' || 
    user.role === 'MODERATOR'
  );

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

  const handleDelete = async () => {
    if (!canDelete) return;
    
    const confirmed = window.confirm(
      user?.role === 'ADMIN' || user?.role === 'MODERATOR'
        ? 'Are you sure you want to delete this post as an administrator?'
        : 'Are you sure you want to delete this post?'
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deletePost(post.id);
      
      // Notify parent component
      if (onPostDelete) {
        onPostDelete(post.id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
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

  // Use the centralized date formatting utility
  const formatDate = (dateString: string): string => {
    return formatRelativeDate(dateString);
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
        {canDelete && (
          <button
            className="post-delete-button"
            onClick={handleDelete}
            disabled={isLoading}
            title={user?.role === 'ADMIN' || user?.role === 'MODERATOR' ? 'Delete post (Admin)' : 'Delete post'}
          >
            🗑️
          </button>
        )}
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
          onClick={() => setShowCommentThread(!showCommentThread)}
          aria-label="View comments"
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

      {/* Comment Thread */}
      {showCommentThread && (
        <div className="comment-thread-container">
          <CommentThread
            postId={post.id}
            initialComments={comments}
            onCommentCountChange={(count) => {
              setCommentsCount(count);
              // Update parent component if callback provided
              if (onPostUpdate) {
                onPostUpdate({
                  ...post,
                  commentsCount: count
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PostCard;
