import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, FeedType, FeedResponse } from '../types/Post';
import { getFeed } from '../services/postApi';
import webSocketService, { PostUpdate, PostInteractionUpdate, CommentUpdate } from '../services/websocketService';
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
  const wsSubscriptionsRef = useRef<(() => void)[]>([]);

  const POSTS_PER_PAGE = 20;

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [feedType]);

  // Set up WebSocket subscriptions for real-time updates
  useEffect(() => {
    const setupWebSocketSubscriptions = async () => {
      try {
        // Clean up existing subscriptions
        wsSubscriptionsRef.current.forEach(unsubscribe => unsubscribe());
        wsSubscriptionsRef.current = [];

        // Connect to WebSocket if not already connected
        if (!webSocketService.isWebSocketConnected()) {
          await webSocketService.connect();
        }

        // Subscribe to social feed updates
        const unsubscribePosts = webSocketService.subscribeToSocialFeed((update: PostUpdate) => {
          handleRealTimePostUpdate(update);
        });

        // Subscribe to social interactions
        const unsubscribeInteractions = webSocketService.subscribeToSocialInteractions((update: PostInteractionUpdate) => {
          handleRealTimeInteractionUpdate(update);
        });

        // Subscribe to comments
        const unsubscribeComments = webSocketService.subscribeToComments((update: CommentUpdate) => {
          handleRealTimeCommentUpdate(update);
        });

        wsSubscriptionsRef.current = [unsubscribePosts, unsubscribeInteractions, unsubscribeComments];

      } catch (error) {
        console.error('Failed to setup WebSocket subscriptions:', error);
        // Fall back to polling if WebSocket fails
        const pollInterval = setInterval(() => {
          loadPosts(false);
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(pollInterval);
      }
    };

    setupWebSocketSubscriptions();

    // Cleanup WebSocket subscriptions on unmount
    return () => {
      wsSubscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      wsSubscriptionsRef.current = [];
    };
  }, []);

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

  // Real-time update handlers
  const handleRealTimePostUpdate = useCallback((update: PostUpdate) => {
    console.log('Real-time post update:', update);

    if (update.type === 'post_created') {
      // Add new post to the beginning of the feed
      const newPost: Post = {
        id: update.postId,
        userId: update.userId,
        userName: update.userName || 'Unknown User',
        userProfilePicUrl: undefined,
        content: update.content || '',
        mediaUrls: [],
        mediaTypes: [],
        parentPostId: undefined,
        quotedPostId: undefined,
        isReply: false,
        isQuote: false,
        createdAt: update.timestamp,
        updatedAt: update.timestamp,
        postType: (update.postType as any) || 'GENERAL',
        isAnonymous: false,
        category: undefined,
        location: undefined,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        bookmarksCount: 0
      };

      setPosts(prevPosts => [newPost, ...prevPosts]);
      setTotalPosts(prev => prev + 1);

    } else if (update.type === 'post_deleted') {
      // Remove deleted post from feed
      setPosts(prevPosts => prevPosts.filter(post => post.id !== update.postId));
      setTotalPosts(prev => Math.max(0, prev - 1));
    }
  }, []);

  const handleRealTimeInteractionUpdate = useCallback((update: PostInteractionUpdate) => {
    console.log('Real-time interaction update:', update);

    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === update.postId) {
          const updatedPost = { ...post };

          switch (update.type) {
            case 'post_like':
              updatedPost.likesCount += 1;
              break;
            case 'post_unlike':
              updatedPost.likesCount = Math.max(0, updatedPost.likesCount - 1);
              break;
            case 'post_comment':
              updatedPost.commentsCount += 1;
              break;
            case 'post_share':
              updatedPost.sharesCount += 1;
              break;
            case 'post_bookmark':
              updatedPost.bookmarksCount += 1;
              break;
          }

          return updatedPost;
        }
        return post;
      })
    );
  }, []);

  const handleRealTimeCommentUpdate = useCallback((update: CommentUpdate) => {
    console.log('Real-time comment update:', update);

    if (update.type === 'comment_created') {
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === update.postId) {
            return {
              ...post,
              commentsCount: post.commentsCount + 1
            };
          }
          return post;
        })
      );
    }
  }, []);

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
