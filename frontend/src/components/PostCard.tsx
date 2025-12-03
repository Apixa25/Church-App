import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Post, PostType, Comment, SharePostRequest } from '../types/Post';
import { likePost, unlikePost, addComment, bookmarkPost, unbookmarkPost, deletePost, recordPostView, blockUser, unblockUser, getBlockStatus, followUser, unfollowUser, getFollowStatus, reportContent } from '../services/postApi';
import CommentThread from './CommentThread';
import { formatRelativeDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { useFeedFilter } from '../contexts/FeedFilterContext';
import ShareModal from './ShareModal';
import ReportModal from './ReportModal';
import PostStatsModal from './PostStatsModal';
import ClickableAvatar from './ClickableAvatar';
import MediaViewer from './MediaViewer';
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
  const navigate = useNavigate();
  const location = useLocation();
  const { setFilter } = useFeedFilter();
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarkedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [sharesCount, setSharesCount] = useState(post.sharesCount);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportPostModal, setShowReportPostModal] = useState(false);
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPostStatsModal, setShowPostStatsModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  useEffect(() => {
    setIsLiked(post.isLikedByCurrentUser || false);
    setIsBookmarked(post.isBookmarkedByCurrentUser || false);
    setLikesCount(post.likesCount);
    setCommentsCount(post.commentsCount);
    setSharesCount(post.sharesCount);
  }, [
    post.id,
    post.isLikedByCurrentUser,
    post.isBookmarkedByCurrentUser,
    post.likesCount,
    post.commentsCount,
    post.sharesCount
  ]);

  // Record post view when post is displayed
  useEffect(() => {
    const recordView = async () => {
      try {
        await recordPostView(post.id);
      } catch (err) {
        // Silently fail - don't show error for analytics
        console.debug('Error recording post view:', err);
      }
    };
    recordView();
  }, [post.id]);

  // Check block/follow status when post changes
  useEffect(() => {
    const checkStatus = async () => {
      if (user && post.userId && post.userId !== user.userId && post.userId !== user.id) {
        try {
          const [blockStatus, followStatus] = await Promise.all([
            getBlockStatus(post.userId),
            getFollowStatus(post.userId)
          ]);
          setIsBlocked(blockStatus.isBlocked);
          setIsFollowing(followStatus.isFollowing);
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }
    };
    checkStatus();
  }, [post.userId, user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as Element).closest('.post-more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  // Check if current user can delete this post (owner, admin, or moderator)
  const canDelete = user && (
    user.userId === post.userId || 
    user.id === post.userId || 
    user.role === 'PLATFORM_ADMIN' || 
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

  const handleShareSuccess = async (_request: SharePostRequest) => {
    setSharesCount(prev => {
      const next = prev + 1;
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          sharesCount: next
        });
      }
      return next;
    });
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

      const updatedBookmarksCount = Math.max(
        0,
        (post.bookmarksCount || 0) + (wasBookmarked ? -1 : 1)
      );

      // Update parent component if callback provided
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          bookmarksCount: updatedBookmarksCount,
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
      user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR'
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

  const handleBlockToggle = async () => {
    if (!user || !post.userId || (post.userId === user.userId || post.userId === user.id) || blockLoading) return;

    const action = isBlocked ? 'unblock' : 'block';
    const confirmed = window.confirm(
      isBlocked
        ? `Are you sure you want to unblock ${post.userName}? You will see their posts again and they will see yours.`
        : `Are you sure you want to block ${post.userName}? You will no longer see their posts, comments, or profile, and they will no longer see yours.`
    );

    if (!confirmed) return;

    try {
      setBlockLoading(true);
      if (isBlocked) {
        await unblockUser(post.userId);
        setIsBlocked(false);
      } else {
        await blockUser(post.userId);
        setIsBlocked(true);
        if (isFollowing) {
          await unfollowUser(post.userId);
          setIsFollowing(false);
        }
      }
      setShowMoreMenu(false);
    } catch (err: any) {
      console.error(`Error ${action}ing user:`, err);
      alert(`Failed to ${action} user. Please try again.`);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !post.userId || (post.userId === user.userId || post.userId === user.id)) return;

    try {
      if (isFollowing) {
        await unfollowUser(post.userId);
        setIsFollowing(false);
      } else {
        await followUser(post.userId);
        setIsFollowing(true);
      }
      setShowMoreMenu(false);
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status. Please try again.');
    }
  };

  const handleReportPost = async (reason: string, description: string) => {
    await reportContent('POST', post.id, reason, description);
    alert('Thank you for your report. Our moderation team will review it.');
  };

  const handleReportUser = async (reason: string, description: string) => {
    await reportContent('USER', post.userId, reason, description);
    alert('Thank you for your report. Our moderation team will review it.');
  };

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowMoreMenu(false);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link. Please try again.');
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

  const handleMediaClick = (index: number, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      if (e.type === 'click') {
        e.preventDefault();
      }
    }
    setMediaViewerIndex(index);
    setShowMediaViewer(true);
  };

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    const mediaCount = post.mediaUrls.length;

    // Single image - full width with natural aspect ratio
    if (mediaCount === 1) {
      const mediaType = post.mediaTypes?.[0] || 'image';
      const isImage = mediaType.startsWith('image');
      
      return (
        <div className="post-media">
          <div 
            className="media-item media-item-single"
            onClick={(e) => handleMediaClick(0, e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMediaClick(0, e);
              }
            }}
            aria-label={`View full ${isImage ? 'image' : 'video'}`}
          >
            {isImage ? (
              <img
                src={post.mediaUrls[0]}
                alt="Post media"
                className="media-image"
                loading="lazy"
              />
            ) : (
              <video
                src={post.mediaUrls[0]}
                controls
                className="media-video"
                preload="metadata"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLVideoElement).getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const videoHeight = rect.height;
                  if (clickY < videoHeight * 0.75) {
                    handleMediaClick(0, e);
                  }
                }}
              />
            )}
          </div>
        </div>
      );
    }

    // Multiple images - grid layout
    return (
      <div className="post-media post-media-grid">
        <div className={`media-grid media-grid-${Math.min(mediaCount, 4)}`}>
          {post.mediaUrls.slice(0, 4).map((url, index) => {
            const mediaType = post.mediaTypes?.[index] || 'image';
            const isImage = mediaType.startsWith('image');
            const isLastVisible = index === 3 && mediaCount > 4;
            const remainingCount = mediaCount - 4;

            return (
              <div 
                key={index} 
                className={`media-item media-item-grid ${isLastVisible ? 'media-item-overlay' : ''}`}
                onClick={(e) => handleMediaClick(index, e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMediaClick(index, e);
                  }
                }}
                aria-label={`View image ${index + 1} of ${mediaCount}`}
              >
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
                    controls={false}
                    className="media-video"
                    preload="metadata"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMediaClick(index, e);
                    }}
                  />
                )}
                {isLastVisible && (
                  <div className="media-overlay-count">
                    +{remainingCount} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`post-card ${compact ? 'compact' : ''}`}>
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author">
          <ClickableAvatar
            userId={post.userId}
            profilePicUrl={post.userProfilePicUrl}
            userName={post.userName}
            size="medium"
            isAnonymous={post.isAnonymous}
          />
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
              {/* Organization/Group Label - Priority: Group takes precedence over organization */}
              {(post.group || post.organization) && (
                <span 
                  className="post-context-name clickable"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      console.log('🔍 Filtering feed - Group:', post.group?.name, 'Organization:', post.organization?.name);
                      if (post.group) {
                        // Filter feed to show only posts from this group
                        console.log('📌 Setting filter to SELECTED_GROUPS with group ID:', post.group.id);
                        if (location.pathname !== '/dashboard') {
                          navigate('/dashboard');
                          // Wait a bit for navigation to complete
                          await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        await setFilter('SELECTED_GROUPS', [post.group.id]);
                        console.log('✅ Filter set successfully for group:', post.group.name);
                      } else if (post.organization) {
                        // Filter feed to show only posts from this organization
                        console.log('📌 Setting filter to PRIMARY_ONLY with organization ID:', post.organization.id);
                        if (location.pathname !== '/dashboard') {
                          navigate('/dashboard');
                          // Wait a bit for navigation to complete
                          await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        await setFilter('PRIMARY_ONLY', [], post.organization.id);
                        console.log('✅ Filter set successfully for organization:', post.organization.name);
                      }
                    } catch (error) {
                      console.error('❌ Error filtering feed:', error);
                      alert('Failed to filter feed. Please try again.');
                    }
                  }}
                  title={post.group ? `Show posts from ${post.group.name}` : `Show posts from ${post.organization?.name}`}
                >
                  {post.group ? post.group.name : post.organization?.name}
                </span>
              )}
              <span className="timestamp">{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="post-header-actions">
          {canDelete && (
            <button
              className="post-delete-button"
              onClick={handleDelete}
              disabled={isLoading}
              title={user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR' ? 'Delete post (Admin)' : 'Delete post'}
            >
              🗑️
            </button>
          )}
          <div className="post-more-menu-container">
            <button
              className="post-more-button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="More actions"
            >
              ⋯
            </button>
            {showMoreMenu && (
              <div className="post-more-menu">
                {user && post.userId && (post.userId !== user.userId && post.userId !== user.id) && (
                  <>
                    <button
                      className="menu-item"
                      onClick={handleFollowToggle}
                      disabled={blockLoading}
                    >
                      {isFollowing ? '✓ Unfollow' : '👥 Follow'} {post.userName}
                    </button>
                    <button
                      className="menu-item danger"
                      onClick={handleBlockToggle}
                      disabled={blockLoading}
                    >
                      {blockLoading ? (
                        <span className="loading-spinner">...</span>
                      ) : isBlocked ? (
                        '🚫 Unblock'
                      ) : (
                        '🚫 Block'
                      )} {post.userName}
                    </button>
                  </>
                )}
                {user && (post.userId === user.userId || post.userId === user.id) && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowPostStatsModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    📊 View Stats
                  </button>
                )}
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowReportPostModal(true);
                    setShowMoreMenu(false);
                  }}
                >
                  🚨 Report Post
                </button>
                {user && post.userId && (post.userId !== user.userId && post.userId !== user.id) && (
                  <button
                    className="menu-item danger"
                    onClick={() => {
                      setShowReportUserModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    🚨 Report User
                  </button>
                )}
                <button
                  className="menu-item"
                  onClick={handleCopyLink}
                >
                  {copied ? '✓ Link Copied!' : '🔗 Copy Link'}
                </button>
              </div>
            )}
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
          onClick={() => setIsShareModalOpen(true)}
          aria-label="Share post"
        >
          🔄 {sharesCount > 0 && sharesCount}
        </button>
      </div>

      {/* Comment Thread */}
      {showCommentThread && (
        <div className="comment-thread-container">
          <CommentThread
            postId={post.id}
            currentUserId={user?.id}
            currentUserEmail={user?.email}
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

      <ShareModal
        post={post}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShare={handleShareSuccess}
      />

      {/* Report Modals */}
      <ReportModal
        isOpen={showReportPostModal}
        onClose={() => setShowReportPostModal(false)}
        onSubmit={handleReportPost}
        contentType="POST"
        contentName={post.content ? (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content) : 'Post'}
      />

      <ReportModal
        isOpen={showReportUserModal}
        onClose={() => setShowReportUserModal(false)}
        onSubmit={handleReportUser}
        contentType="USER"
        contentName={post.userName}
      />

      <PostStatsModal
        postId={post.id}
        isOpen={showPostStatsModal}
        onClose={() => setShowPostStatsModal(false)}
      />

      {/* Media Viewer */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <MediaViewer
          mediaUrls={post.mediaUrls}
          mediaTypes={post.mediaTypes || []}
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          initialIndex={mediaViewerIndex}
        />
      )}
    </div>
  );
};

export default PostCard;
