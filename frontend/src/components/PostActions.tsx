import React, { useState, useEffect } from 'react';
import { Post, SharePostRequest } from '../types/Post';
import { likePost, unlikePost, bookmarkPost, unbookmarkPost, blockUser, unblockUser, getBlockStatus, followUser, unfollowUser, getFollowStatus, reportContent } from '../services/postApi';
import { useAuth } from '../contexts/AuthContext';
import LikeButton from './LikeButton';
import ShareModal from './ShareModal';
import CommentForm from './CommentForm';
import ReportModal from './ReportModal';
import PostStatsModal from './PostStatsModal';
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportPostModal, setShowReportPostModal] = useState(false);
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPostStatsModal, setShowPostStatsModal] = useState(false);
  const { user } = useAuth();

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
      if (showMoreMenu && !(event.target as Element).closest('.quick-actions')) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  const handleBlockToggle = async () => {
    if (!user || !post.userId || (post.userId === user.userId || post.userId === user.id) || blockLoading) return;

    const action = isBlocked ? 'unblock' : 'block';
    const confirmed = window.confirm(
      isBlocked
        ? `Are you sure you want to unblock ${post.userName}? You will see their posts again.`
        : `Are you sure you want to block ${post.userName}? You will no longer see their posts, comments, or profile.`
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
        // If blocking, also unfollow if following
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
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            disabled={disabled}
            aria-label="More actions"
          >
            <span className="action-icon">⋯</span>
          </button>
          {showMoreMenu && (
            <div className="more-actions-menu">
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
