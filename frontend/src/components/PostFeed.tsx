import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, FeedType, FeedResponse } from '../types/Post';
import { getFeed } from '../services/postApi';
import webSocketService, { PostUpdate, PostInteractionUpdate, CommentUpdate } from '../services/websocketService';
import PostCard from './PostCard';
import FeedFilters from './FeedFilters';
import EmptyFeedState from './EmptyFeedState';
import './PostFeed.css';

interface PostFeedProps {
  feedType: FeedType;
  maxPosts?: number;
  showFilters?: boolean;
  onFeedTypeChange?: (feedType: FeedType) => void;
  onPostUpdate?: (postId: string, updatedPost: Post) => void;
}

const PostFeed: React.FC<PostFeedProps> = ({
  feedType,
  maxPosts,
  showFilters = true,
  onFeedTypeChange,
  onPostUpdate
}) => {
  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [, setPage] = useState(0); // Page state kept for compatibility but tracked via ref

  // Refs
  const lastPostRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const wsSubscriptionsRef = useRef<(() => void)[]>([]);
  const pageRef = useRef(0); // Use ref to track page without causing re-renders
  const loadPostsRef = useRef<((reset: boolean) => Promise<void>) | undefined>(undefined);

  const POSTS_PER_PAGE = 20;

  // Function declarations (moved before useEffect hooks)
  const loadPosts = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPosts([]);
        setPage(0);
        pageRef.current = 0;
        setHasMore(true);
        setError('');
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 0 : pageRef.current;
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

      // Total posts tracking removed for simplicity
      setHasMore(response.content.length === POSTS_PER_PAGE && !maxPosts);
      const nextPage = currentPage + 1;
      setPage(nextPage);
      pageRef.current = nextPage;

    } catch (err: any) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedType, maxPosts]); // Stable dependencies

  // Update the ref whenever loadPosts changes
  loadPostsRef.current = loadPosts;

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || (maxPosts && posts.length >= maxPosts)) return;

    await loadPosts(false);
  }, [loadingMore, hasMore, maxPosts, posts.length, loadPosts]);

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

    } else if (update.type === 'post_deleted') {
      // Remove deleted post from feed
      setPosts(prevPosts => prevPosts.filter(post => post.id !== update.postId));
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
            case 'post_unbookmark':
              updatedPost.bookmarksCount = Math.max(0, updatedPost.bookmarksCount - 1);
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

    // Update comment count for the post
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === update.postId) {
          const updatedPost = { ...post };
          
          switch (update.type) {
            case 'comment_created':
              updatedPost.commentsCount += 1;
              break;
            case 'comment_deleted':
              updatedPost.commentsCount = Math.max(0, updatedPost.commentsCount - 1);
              break;
            // comment_updated doesn't change count
          }
          
          return updatedPost;
        }
        return post;
      })
    );
  }, []);


  const handleFeedTypeChange = (newFeedType: FeedType) => {
    // Call parent component's handler to update feed type
    if (onFeedTypeChange) {
      onFeedTypeChange(newFeedType);
    }
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

  const handlePostDelete = (postId: string) => {
    // Remove deleted post from feed
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [feedType, loadPosts]);

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
          // Use ref to avoid dependency issues
          if (loadPostsRef.current) {
            loadPostsRef.current(false);
          }
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
  }, [handleRealTimePostUpdate, handleRealTimeInteractionUpdate, handleRealTimeCommentUpdate]); // Removed loadPosts from dependencies

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !maxPosts) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, posts, loadMorePosts, maxPosts]);

  const handleRetry = () => {
    loadPosts(true);
  };

  // Filter posts if maxPosts is set
  const displayedPosts = maxPosts ? posts.slice(0, maxPosts) : posts;

  return (
    <div className="post-feed">
      {/* Feed Header */}
      {showFilters && (
        <div className="feed-header">
          <FeedFilters
            currentFeedType={feedType}
            onFeedTypeChange={handleFeedTypeChange}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="feed-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button onClick={handleRetry} className="retry-button">
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="feed-loading">
          <div className="loading-spinner"></div>
          <span>Loading posts...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && displayedPosts.length === 0 && (
        <EmptyFeedState feedType={feedType} />
      )}

      {/* Posts List */}
      {!loading && !error && displayedPosts.length > 0 && (
        <div className="posts-container">
          {displayedPosts.map((post, index) => (
            <div
              key={post.id}
              ref={index === displayedPosts.length - 1 ? lastPostRef : null}
              className="post-item"
            >
              <PostCard
                post={post}
                onPostUpdate={handlePostUpdate}
                onPostDelete={handlePostDelete}
              />
            </div>
          ))}

          {/* Load More Indicator */}
          {loadingMore && (
            <div ref={loadingRef} className="load-more-indicator">
              <div className="loading-spinner"></div>
              <span>Loading more posts...</span>
            </div>
          )}

          {/* End of Feed Indicator */}
          {!hasMore && displayedPosts.length > 0 && (
            <div className="end-of-feed">
              <span>🎉 You've reached the end!</span>
              <p>That's all the posts for now. Check back later for more updates!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostFeed;
