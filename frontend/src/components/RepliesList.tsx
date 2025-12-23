import React from 'react';
import { Comment } from '../types/Post';
import { formatRelativeDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import ClickableAvatar from './ClickableAvatar';
import { useUserReplies } from '../hooks/useProfileData';
import './RepliesList.css';

interface RepliesListProps {
  userId: string;
  isOwnProfile?: boolean;
}

const RepliesList: React.FC<RepliesListProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();

  // Use React Query hook - data is cached for 5 minutes
  const { data, isLoading, error, refetch } = useUserReplies(userId, !!userId);

  const handlePostClick = (postId: string) => {
    // Navigate to authenticated post detail page
    navigate(`/app/posts/${postId}`, { state: { fromReplies: true } });
  };

  if (isLoading) {
    return (
      <div className="replies-loading">
        <div className="loading-spinner"></div>
        <span>Loading replies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="replies-error">
        <p>Failed to load replies</p>
        <button onClick={() => refetch()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  const comments = data?.content || [];

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
        {comments.map((comment: Comment) => (
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

            {/* Clickable link to view the original post */}
            <div
              className="original-post-preview"
              onClick={() => handlePostClick(comment.postId)}
            >
              <div className="original-post-link">
                <span className="view-post-text">View original post →</span>
              </div>
            </div>

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

      {/* Note: Load More pagination removed for simplicity.
          With React Query caching, initial page loads quickly and is cached.
          Can add infinite scroll later if needed. */}
    </div>
  );
};

export default RepliesList;
