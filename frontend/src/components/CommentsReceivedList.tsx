import React from 'react';
import { formatRelativeDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import ClickableAvatar from './ClickableAvatar';
import { useCommentsReceived, CommentGroup } from '../hooks/useProfileData';
import './CommentsReceivedList.css';

interface CommentsReceivedListProps {
  userId: string;
  isOwnProfile?: boolean;
}

const CommentsReceivedList: React.FC<CommentsReceivedListProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();

  // Use React Query hook - data is cached for 5 minutes
  const { data, isLoading, error, refetch } = useCommentsReceived(userId, !!userId);

  const handleContentClick = (contentType: 'post' | 'prayer', contentId: string) => {
    if (contentType === 'post') {
      // Navigate to authenticated post detail page (not the public share preview)
      // Pass state so we can show "Back to Comments" button
      navigate(`/app/posts/${contentId}`, { state: { fromComments: true } });
    } else {
      navigate(`/prayers/${contentId}`, { state: { fromComments: true } });
    }
  };

  if (isLoading) {
    return (
      <div className="comments-received-loading">
        <div className="loading-spinner"></div>
        <span>Loading comments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comments-received-error">
        <p>Failed to load comments</p>
        <button onClick={() => refetch()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  const commentGroups = data?.groups || [];

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
        {commentGroups.map((group: CommentGroup) => (
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

      {/* Note: Load More pagination removed for simplicity.
          With React Query caching, initial page loads quickly and is cached.
          Can add infinite scroll later if needed. */}
    </div>
  );
};

export default CommentsReceivedList;
