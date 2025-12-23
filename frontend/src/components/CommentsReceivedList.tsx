import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types/Post';
import { PrayerInteraction } from '../types/Prayer';
import { getCommentsReceivedOnPosts } from '../services/postApi';
import { prayerInteractionAPI } from '../services/prayerApi';
import { formatRelativeDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import ClickableAvatar from './ClickableAvatar';
import './CommentsReceivedList.css';

interface CommentsReceivedListProps {
  userId: string;
  isOwnProfile?: boolean;
}

// Unified comment item that can represent both post comments and prayer comments
interface UnifiedCommentItem {
  id: string;
  type: 'post' | 'prayer';
  contentId: string; // postId or prayerRequestId
  contentPreview: string; // preview of the original content
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  content: string;
  createdAt: string;
  isAnonymous?: boolean;
  likesCount?: number;
}

// Group comments by the content they were made on
interface CommentGroup {
  contentId: string;
  contentType: 'post' | 'prayer';
  contentPreview: string;
  comments: UnifiedCommentItem[];
}

const CommentsReceivedList: React.FC<CommentsReceivedListProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();
  const [commentGroups, setCommentGroups] = useState<CommentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadComments = useCallback(async (reset: boolean = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const pageToLoad = reset ? 0 : page;

      // Fetch both post comments and prayer comments in parallel
      const [postCommentsResponse, prayerCommentsResponse] = await Promise.all([
        getCommentsReceivedOnPosts(userId, pageToLoad, 20),
        prayerInteractionAPI.getCommentsReceivedByUser(userId, pageToLoad, 20)
          .then(res => res.data)
          .catch(() => ({ content: [], totalPages: 0 }))
      ]);

      // Convert post comments to unified format
      const postCommentItems: UnifiedCommentItem[] = postCommentsResponse.content.map((comment: Comment) => ({
        id: comment.id,
        type: 'post' as const,
        contentId: comment.postId,
        contentPreview: comment.postContent || 'View post',
        userId: comment.userId,
        userName: comment.userName,
        userProfilePicUrl: comment.userProfilePicUrl,
        content: comment.content,
        createdAt: comment.createdAt,
        isAnonymous: comment.isAnonymous,
        likesCount: comment.likesCount
      }));

      // Convert prayer comments to unified format
      const prayerCommentItems: UnifiedCommentItem[] = (prayerCommentsResponse.content || []).map((interaction: PrayerInteraction) => ({
        id: interaction.id,
        type: 'prayer' as const,
        contentId: interaction.prayerRequestId,
        contentPreview: 'View prayer request',
        userId: interaction.userId,
        userName: interaction.userName,
        userProfilePicUrl: interaction.userProfilePicUrl,
        content: interaction.content || '',
        createdAt: Array.isArray(interaction.timestamp)
          ? new Date(interaction.timestamp[0], interaction.timestamp[1] - 1, interaction.timestamp[2],
              interaction.timestamp[3] || 0, interaction.timestamp[4] || 0).toISOString()
          : String(interaction.timestamp),
        isAnonymous: false
      }));

      // Combine all comments
      const allComments = [...postCommentItems, ...prayerCommentItems];

      // Group comments by content (post or prayer)
      const groupsMap = new Map<string, CommentGroup>();

      allComments.forEach(comment => {
        const key = `${comment.type}-${comment.contentId}`;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            contentId: comment.contentId,
            contentType: comment.type,
            contentPreview: comment.contentPreview,
            comments: []
          });
        }
        groupsMap.get(key)!.comments.push(comment);
      });

      // Sort comments within each group by date (newest first)
      groupsMap.forEach(group => {
        group.comments.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Convert to array and sort groups by most recent comment
      const groups = Array.from(groupsMap.values()).sort((a, b) => {
        const aLatest = new Date(a.comments[0]?.createdAt || 0).getTime();
        const bLatest = new Date(b.comments[0]?.createdAt || 0).getTime();
        return bLatest - aLatest;
      });

      if (reset) {
        setCommentGroups(groups);
        setPage(1);
      } else {
        setCommentGroups(prev => {
          // Merge new groups with existing, avoiding duplicates
          const existingKeys = new Set(prev.map(g => `${g.contentType}-${g.contentId}`));
          const newGroups = groups.filter(g => !existingKeys.has(`${g.contentType}-${g.contentId}`));
          return [...prev, ...newGroups];
        });
        setPage(prev => prev + 1);
      }

      // Check if there's more data
      const maxPages = Math.max(
        postCommentsResponse.totalPages || 0,
        prayerCommentsResponse.totalPages || 0
      );
      setHasMore(pageToLoad + 1 < maxPages);
    } catch (err: any) {
      console.error('Error loading comments received:', err);
      setError(err?.response?.data?.error || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    loadComments(true);
  }, [userId]);

  const handleContentClick = (contentType: 'post' | 'prayer', contentId: string) => {
    if (contentType === 'post') {
      navigate(`/posts/${contentId}`);
    } else {
      navigate(`/prayers/${contentId}`);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadComments(false);
    }
  };

  if (loading && commentGroups.length === 0) {
    return (
      <div className="comments-received-loading">
        <div className="loading-spinner"></div>
        <span>Loading comments...</span>
      </div>
    );
  }

  if (error && commentGroups.length === 0) {
    return (
      <div className="comments-received-error">
        <p>{error}</p>
        <button onClick={() => loadComments(true)} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (commentGroups.length === 0) {
    return (
      <div className="empty-comments-received">
        <div className="empty-icon">💬</div>
        <h3>No comments yet</h3>
        <p>
          {isOwnProfile
            ? "When people comment on your posts and prayers, you'll see them here."
            : "No comments have been received on this user's content yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="comments-received-container">
      <div className="comments-received-list">
        {commentGroups.map((group) => (
          <div key={`${group.contentType}-${group.contentId}`} className="comment-group">
            {/* Content header - what was commented on */}
            <div
              className="content-header"
              onClick={() => handleContentClick(group.contentType, group.contentId)}
            >
              <div className="content-type-badge">
                {group.contentType === 'post' ? '📝' : '🙏'}
                <span>{group.contentType === 'post' ? 'Your Post' : 'Your Prayer'}</span>
              </div>
              <p className="content-preview">
                {group.contentPreview.length > 100
                  ? `${group.contentPreview.substring(0, 100)}...`
                  : group.contentPreview}
              </p>
              <span className="view-content-link">
                View {group.contentType === 'post' ? 'Post' : 'Prayer'} →
              </span>
            </div>

            {/* Comments on this content */}
            <div className="comments-on-content">
              {group.comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <ClickableAvatar
                      userId={comment.userId}
                      userName={comment.userName}
                      profilePicUrl={comment.userProfilePicUrl}
                      size="medium"
                    />
                    <div className="comment-user-info">
                      <span className="comment-user-name">
                        {comment.isAnonymous ? 'Anonymous' : comment.userName}
                      </span>
                      <span className="comment-timestamp">
                        {formatRelativeDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="comment-content">
                    <p>{comment.content}</p>
                  </div>

                  {comment.likesCount !== undefined && comment.likesCount > 0 && (
                    <div className="comment-engagement">
                      <span className="comment-likes">
                        ❤️ {comment.likesCount}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="load-more-section">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="load-more-btn"
          >
            {loading ? (
              <>
                <div className="load-spinner"></div>
                Loading...
              </>
            ) : (
              'Load More Comments'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentsReceivedList;
