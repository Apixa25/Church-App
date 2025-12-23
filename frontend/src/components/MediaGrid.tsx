import React, { useState } from 'react';
import { Post } from '../types/Post';
import { useNavigate } from 'react-router-dom';
import { useUserMedia } from '../hooks/useProfileData';
import './MediaGrid.css';

interface MediaGridProps {
  userId: string;
  isOwnProfile?: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();
  const [selectedMedia, setSelectedMedia] = useState<{ post: Post; mediaIndex: number } | null>(null);

  // Use React Query hook - data is cached for 5 minutes
  const { data, isLoading, error, refetch } = useUserMedia(userId, !!userId);

  const handlePostClick = (postId: string) => {
    // Navigate to authenticated post detail page
    navigate(`/app/posts/${postId}`, { state: { fromMedia: true } });
  };

  const handleMediaClick = (post: Post, mediaIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMedia({ post, mediaIndex });
  };

  const handleCloseMediaViewer = () => {
    setSelectedMedia(null);
  };

  const getMediaType = (mediaType: string): 'image' | 'video' => {
    return mediaType?.startsWith('video/') ? 'video' : 'image';
  };

  if (isLoading) {
    return (
      <div className="media-loading">
        <div className="loading-spinner"></div>
        <span>Loading media...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="media-error">
        <p>Failed to load media</p>
        <button onClick={() => refetch()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  const posts = data?.content || [];

  if (posts.length === 0) {
    return (
      <div className="empty-media">
        <div className="empty-icon">📷</div>
        <h3>No media yet</h3>
        <p>{isOwnProfile ? "Posts with photos or videos will appear here." : "This user hasn't shared any media yet."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="media-grid-container">
        <div className="media-grid">
          {posts.map((post: Post) => (
            <div
              key={post.id}
              className="media-item"
              onClick={() => handlePostClick(post.id)}
            >
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="media-item-content">
                  {post.mediaUrls.length === 1 ? (
                    // Single media item
                    getMediaType(post.mediaTypes[0]) === 'video' ? (
                      <video
                        src={post.mediaUrls[0]}
                        className="media-thumbnail"
                        onClick={(e) => handleMediaClick(post, 0, e)}
                      />
                    ) : (
                      <img
                        src={post.mediaUrls[0]}
                        alt="Post media"
                        className="media-thumbnail"
                        onClick={(e) => handleMediaClick(post, 0, e)}
                      />
                    )
                  ) : (
                    // Multiple media items - show first with count overlay
                    <div className="media-multi-container">
                      {getMediaType(post.mediaTypes[0]) === 'video' ? (
                        <video
                          src={post.mediaUrls[0]}
                          className="media-thumbnail"
                          onClick={(e) => handleMediaClick(post, 0, e)}
                        />
                      ) : (
                        <img
                          src={post.mediaUrls[0]}
                          alt="Post media"
                          className="media-thumbnail"
                          onClick={(e) => handleMediaClick(post, 0, e)}
                        />
                      )}
                      <div className="media-count-overlay">
                        📷 {post.mediaUrls.length}
                      </div>
                    </div>
                  )}
                  <div className="media-overlay">
                    <div className="media-stats">
                      <span>❤️ {post.likesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                      <span>🔄 {post.sharesCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Note: Load More pagination removed for simplicity.
            With React Query caching, initial page loads quickly and is cached.
            Can add infinite scroll later if needed. */}
      </div>

      {selectedMedia && (
        <div className="media-viewer-overlay" onClick={handleCloseMediaViewer}>
          <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="media-viewer-close" onClick={handleCloseMediaViewer}>
              ✕
            </button>
            {getMediaType(selectedMedia.post.mediaTypes[selectedMedia.mediaIndex]) === 'video' ? (
              <video
                src={selectedMedia.post.mediaUrls[selectedMedia.mediaIndex]}
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                className="media-viewer-media"
              />
            ) : (
              <img
                src={selectedMedia.post.mediaUrls[selectedMedia.mediaIndex]}
                alt="Media"
                className="media-viewer-media"
              />
            )}
            <div className="media-viewer-info">
              <p className="media-viewer-caption">{selectedMedia.post.content}</p>
              <div className="media-viewer-stats">
                <span>❤️ {selectedMedia.post.likesCount}</span>
                <span>💬 {selectedMedia.post.commentsCount}</span>
                <span>🔄 {selectedMedia.post.sharesCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaGrid;
