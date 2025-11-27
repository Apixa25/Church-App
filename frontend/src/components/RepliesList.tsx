import React, { useState, useEffect, useCallback } from 'react';
import { Comment, Post } from '../types/Post';
import { getUserComments, getPost } from '../services/postApi';
import { formatRelativeDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import ClickableAvatar from './ClickableAvatar';
import './RepliesList.css';

interface RepliesListProps {
  userId: string;
  isOwnProfile?: boolean;
}

interface CommentWithPost extends Comment {
  originalPost?: Post;
}

const RepliesList: React.FC<RepliesListProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentWithPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState<Set<string>>(new Set());

  const loadComments = useCallback(async (reset: boolean = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const pageToLoad = reset ? 0 : page;

      const response = await getUserComments(userId, pageToLoad, 20);

      // Fetch original posts for each comment
      const commentsWithPosts: CommentWithPost[] = [];
      const postIds = new Set<string>();
      
      response.content.forEach((comment: Comment) => {
        postIds.add(comment.postId);
        commentsWithPosts.push({ ...comment, originalPost: undefined });
      });

      // Fetch all unique posts in parallel
      const postPromises = Array.from(postIds).map(async (postId) => {
        try {
          const post = await getPost(postId);
          return { postId, post };
        } catch (err) {
          console.error(`Error fetching post ${postId}:`, err);
          return { postId, post: null };
        }
      });

      const postResults = await Promise.all(postPromises);
      const postMap = new Map<string, Post>();
      postResults.forEach(({ postId, post }) => {
        if (post) postMap.set(postId, post);
      });

      // Attach posts to comments
      commentsWithPosts.forEach((comment) => {
        comment.originalPost = postMap.get(comment.postId);
      });

      if (reset) {
        setComments(commentsWithPosts);
        setPage(1);
      } else {
        setComments(prev => [...prev, ...commentsWithPosts]);
        setPage(prev => prev + 1);
      }

      setHasMore(pageToLoad + 1 < response.totalPages);
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError(err?.response?.data?.error || 'Failed to load replies');
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    loadComments(true);
  }, [userId]);

  const handlePostClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadComments(false);
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="replies-loading">
        <div className="loading-spinner"></div>
        <span>Loading replies...</span>
      </div>
    );
  }

  if (error && comments.length === 0) {
    return (
      <div className="replies-error">
        <p>{error}</p>
        <button onClick={() => loadComments(true)} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="empty-replies">
        <div className="empty-icon">💬</div>
        <h3>No replies yet</h3>
        <p>{isOwnProfile ? "Your replies to posts will appear here." : "This user hasn't replied to any posts yet."}</p>
      </div>
    );
  }

  return (
    <div className="replies-list-container">
      <div className="replies-list">
        {comments.map((comment) => (
          <div key={comment.id} className="reply-item">
            <div className="reply-header">
              <ClickableAvatar
                userId={comment.userId}
                userName={comment.userName}
                profilePicUrl={comment.userProfilePicUrl}
                size="medium"
              />
              <div className="reply-user-info">
                <span className="reply-user-name">
                  {comment.isAnonymous ? 'Anonymous' : comment.userName}
                </span>
                <span className="reply-timestamp">
                  {formatRelativeDate(comment.createdAt)}
                </span>
              </div>
            </div>

            <div className="reply-content">
              <p>{comment.content}</p>
              {comment.mediaUrls && comment.mediaUrls.length > 0 && (
                <div className="reply-media">
                  {comment.mediaUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Media ${idx + 1}`}
                      className="reply-media-image"
                    />
                  ))}
                </div>
              )}
            </div>

            {comment.originalPost && (
              <div 
                className="original-post-preview"
                onClick={() => handlePostClick(comment.postId)}
              >
                <div className="original-post-header">
                  <ClickableAvatar
                    userId={comment.originalPost.userId}
                    userName={comment.originalPost.userName}
                    profilePicUrl={comment.originalPost.userProfilePicUrl}
                    size="small"
                  />
                  <div className="original-post-info">
                    <span className="original-post-author">
                      {comment.originalPost.isAnonymous 
                        ? 'Anonymous' 
                        : comment.originalPost.userName}
                    </span>
                    <span className="original-post-time">
                      {formatRelativeDate(comment.originalPost.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="original-post-content">
                  {comment.originalPost.content.length > 150
                    ? `${comment.originalPost.content.substring(0, 150)}...`
                    : comment.originalPost.content}
                </p>
                {comment.originalPost.mediaUrls && comment.originalPost.mediaUrls.length > 0 && (
                  <div className="original-post-media-preview">
                    <img
                      src={comment.originalPost.mediaUrls[0]}
                      alt="Post media"
                      className="original-post-media-thumbnail"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="reply-engagement">
              <span className="reply-likes">
                ❤️ {comment.likesCount}
              </span>
              {comment.repliesCount !== undefined && comment.repliesCount > 0 && (
                <span className="reply-replies-count">
                  💬 {comment.repliesCount}
                </span>
              )}
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
              'Load More Replies'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default RepliesList;

