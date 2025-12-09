import React, { useState, useEffect, useCallback } from 'react';
import { Post } from '../types/Post';
import { getUserMediaPosts } from '../services/postApi';
import { useNavigate } from 'react-router-dom';
import './MediaGrid.css';

interface MediaGridProps {
  userId: string;
  isOwnProfile?: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ post: Post; mediaIndex: number } | null>(null);

  const loadMediaPosts = useCallback(async (reset: boolean = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const pageToLoad = reset ? 0 : page;

      const response = await getUserMediaPosts(userId, pageToLoad, 20);

      if (reset) {
        setPosts(response.content);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...response.content]);
        setPage(prev => prev + 1);
      }

      setHasMore(pageToLoad + 1 < response.totalPages);
    } catch (err: any) {
      console.error('Error loading media posts:', err);
      setError(err?.response?.data?.error || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    loadMediaPosts(true);
  }, [userId]);

  const handlePostClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  const handleMediaClick = (post: Post, mediaIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMedia({ post, mediaIndex });
  };

  const handleCloseMediaViewer = () => {
    setSelectedMedia(null);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMediaPosts(false);
    }
  };

  const getMediaType = (mediaType: string): 'image' | 'video' => {
    return mediaType?.startsWith('video/') ? 'video' : 'image';
  };

  if (loading && posts.length === 0) {
    return (
      <div className="media-loading">
        <div className="loading-spinner"></div>
        <span>Loading media...</span>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="media-error">
        <p>{error}</p>
        <button onClick={() => loadMediaPosts(true)} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

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
          {posts.map((post) => (
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
                'Load More'
              )}
            </button>
          </div>
        )}
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
