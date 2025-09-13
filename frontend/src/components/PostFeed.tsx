import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, FeedType, FeedResponse } from '../types/Post';
import { getFeed } from '../services/postApi';
import PostCard from './PostCard';
import FeedHeader from './FeedHeader';
import FeedFilters from './FeedFilters';
import EmptyFeedState from './EmptyFeedState';
import './PostFeed.css';

interface PostFeedProps {
  initialFeedType?: FeedType;
  showFilters?: boolean;
  showHeader?: boolean;
  maxPosts?: number;
  onPostUpdate?: (postId: string, updatedPost: Post) => void;
}

const PostFeed: React.FC<PostFeedProps> = ({
  initialFeedType = FeedType.CHRONOLOGICAL,
  showFilters = true,
  showHeader = true,
  maxPosts,
  onPostUpdate
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedType, setFeedType] = useState<FeedType>(initialFeedType);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);

  const observerRef = useRef<IntersectionObserver>();
  const lastPostRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const POSTS_PER_PAGE = 20;

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [feedType]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading || loadingMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, posts]);

  const loadPosts = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPosts([]);
        setPage(0);
        setHasMore(true);
        setError('');
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 0 : page;
      const response: FeedResponse = await getFeed(
        feedType === FeedType.CHRONOLOGICAL ? 'community' :
        feedType === FeedType.TRENDING ? 'trending' : 'community',
        currentPage,
        POSTS_PER_PAGE
      );

      if (reset) {
        setPosts(response.content);
      } else {
        setPosts(prev => [...prev, ...response.content]);
      }

      setTotalPosts(response.totalElements);
      setHasMore(response.content.length === POSTS_PER_PAGE && !maxPosts);
      setPage(currentPage + 1);

    } catch (err: any) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || (maxPosts && posts.length >= maxPosts)) return;

    await loadPosts(false);
  }, [loadingMore, hasMore, maxPosts, posts.length]);

  const handleFeedTypeChange = (newFeedType: FeedType) => {
    setFeedType(newFeedType);
  };

  const handleRefresh = () => {
    loadPosts(true);
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === updatedPost.id ? updatedPost : post
      )
    );

    if (onPostUpdate) {
      onPostUpdate(updatedPost.id, updatedPost);
    }
  };

  const handleRetry = () => {
    loadPosts(true);
  };

  // Filter posts if maxPosts is set
  const displayedPosts = maxPosts ? posts.slice(0, maxPosts) : posts;

  return (
    <div className="post-feed">
      {/* Feed Header */}
      {showHeader && (
        <FeedHeader
          feedType={feedType}
          totalPosts={totalPosts}
          onRefresh={handleRefresh}
          loading={loading}
        />
      )}

      {/* Feed Filters */}
      {showFilters && (
        <FeedFilters
          currentFeedType={feedType}
          onFeedTypeChange={handleFeedTypeChange}
          disabled={loading}
        />
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="feed-error">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && posts.length === 0 && (
        <div className="feed-loading">
          <div className="loading-skeleton">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton-post">
                <div className="skeleton-header">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-text"></div>
                </div>
                <div className="skeleton-content">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
                <div className="skeleton-actions">
                  <div className="skeleton-button"></div>
                  <div className="skeleton-button"></div>
                  <div className="skeleton-button"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts List */}
      {!loading && !error && (
        <>
          {displayedPosts.length === 0 ? (
            <EmptyFeedState feedType={feedType} />
          ) : (
            <div className="posts-list">
              {displayedPosts.map((post, index) => (
                <div
                  key={post.id}
                  ref={index === displayedPosts.length - 1 ? lastPostRef : null}
                  className="post-wrapper"
                >
                  <PostCard
                    post={post}
                    onPostUpdate={handlePostUpdate}
                    showComments={false} // Comments handled separately
                  />
                </div>
              ))}

              {/* Loading More Indicator */}
              {loadingMore && (
                <div ref={loadingRef} className="loading-more">
                  <div className="loading-spinner"></div>
                  <span>Loading more posts...</span>
                </div>
              )}

              {/* End of Feed Indicator */}
              {!hasMore && displayedPosts.length > 0 && (
                <div className="end-of-feed">
                  <div className="end-message">
                    <div className="end-icon">🎉</div>
                    <h4>You're all caught up!</h4>
                    <p>You've seen all the posts in this feed.</p>
                    <button onClick={handleRefresh} className="refresh-button">
                      🔄 Check for New Posts
                    </button>
                  </div>
                </div>
              )}

              {/* Max Posts Reached */}
              {maxPosts && posts.length >= maxPosts && (
                <div className="max-posts-reached">
                  <p>Showing {maxPosts} most recent posts</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostFeed;
