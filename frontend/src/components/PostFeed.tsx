import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Post, FeedType, FeedResponse } from '../types/Post';
import { getFeed } from '../services/postApi';
import webSocketService, { PostUpdate, PostInteractionUpdate, CommentUpdate } from '../services/websocketService';
import PostCard from './PostCard';
import FeedFilters from './FeedFilters';
import EmptyFeedState from './EmptyFeedState';
import { useFeedFilter } from '../contexts/FeedFilterContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import LoadingSpinner from './LoadingSpinner';
import './PostFeed.css';

interface PostFeedProps {
  feedType: FeedType;
  maxPosts?: number;
  showFilters?: boolean;
  onFeedTypeChange?: (feedType: FeedType) => void;
  onPostUpdate?: (postId: string, updatedPost: Post) => void;
  refreshKey?: number; // Increment this to trigger feed refresh
}

const PostFeed: React.FC<PostFeedProps> = ({
  feedType,
  maxPosts,
  showFilters = true,
  onFeedTypeChange,
  onPostUpdate,
  refreshKey
}) => {
  // Feed filter context - to refresh feed when filter changes
  const { activeFilter, selectedGroupIds } = useFeedFilter();
  // WebSocket context - for shared connection management
  const { isConnected, ensureConnection } = useWebSocket();
  const queryClient = useQueryClient();

  // Build query key for React Query caching
  const feedTypeString = feedType === FeedType.FOLLOWING ? 'following' : feedType === FeedType.TRENDING ? 'trending' : 'community';
  const queryKey = ['posts', feedTypeString, activeFilter, selectedGroupIds?.join(',') || ''];

  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [, setPage] = useState(0); // Page state kept for compatibility but tracked via ref
  const [hasNewContent, setHasNewContent] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Refs
  const lastPostRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const wsSubscriptionsRef = useRef<(() => void)[]>([]);
  const pageRef = useRef(0); // Use ref to track page without causing re-renders
  const loadPostsRef = useRef<((reset: boolean) => Promise<void>) | undefined>(undefined);
  const pullStartY = useRef<number>(0);
  const isAtTopRef = useRef<boolean>(true);
  const lastFetchTimeRef = useRef<number>(0);

  const POSTS_PER_PAGE = 20;
  const PULL_THRESHOLD = 80; // pixels to pull before triggering refresh

  // 🚀 React Query for caching posts - only fetch when explicitly requested
  const { 
    data: cachedPosts, 
    isLoading: queryLoading,
    refetch: refetchPosts 
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const response: FeedResponse = await getFeed(
        feedTypeString,
        0, // Always start from page 0 for refresh
        POSTS_PER_PAGE
      );
      lastFetchTimeRef.current = Date.now();
      return response.content;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    enabled: false, // Don't auto-fetch - only fetch when explicitly requested
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Function declarations (moved before useEffect hooks)
  const loadPosts = useCallback(async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : pageRef.current;
      
      if (reset) {
        setLoading(true);
        setPage(0);
        pageRef.current = 0;
        setHasMore(true);
        setError('');
        setHasNewContent(false);
      } else {
        setLoadingMore(true);
      }
      
      const response: FeedResponse = await getFeed(
        feedTypeString,
        currentPage,
        POSTS_PER_PAGE
      );

      if (reset) {
        setPosts(response.content);
        // Update React Query cache
        queryClient.setQueryData(queryKey, response.content);
        lastFetchTimeRef.current = Date.now();
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
  }, [feedType, maxPosts, feedTypeString, queryKey, queryClient]); // Stable dependencies

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

  // Check for new content periodically (only when at top of page)
  const checkForNewContent = useCallback(async () => {
    if (window.scrollY > 100 || posts.length === 0) return; // Only check when near top and have posts
    
    try {
      const response: FeedResponse = await getFeed(
        feedTypeString,
        0,
        1 // Just check first post
      );
      
      // Compare with cached posts
      if (response.content.length > 0 && posts.length > 0) {
        const newestPost = response.content[0];
        const cachedNewestPost = posts[0];
        
        if (newestPost.id !== cachedNewestPost.id) {
          console.log('🆕 New content detected!');
          setHasNewContent(true);
        }
      }
    } catch (err) {
      console.error('Error checking for new content:', err);
    }
  }, [feedTypeString, posts]);

  // Initialize from cache on mount if available, otherwise fetch
  const initializedRef = useRef(false);
  useEffect(() => {
    // Only initialize once per query key change
    if (initializedRef.current) return;
    
    const cachedData = queryClient.getQueryData<Post[]>(queryKey);
    if (cachedData && cachedData.length > 0) {
      // Only log if not already initialized to reduce console spam
      if (!initializedRef.current) {
        console.log('📦 PostFeed: Loading from cache', cachedData.length, 'posts');
      }
      setPosts(cachedData);
      setLoading(false);
      initializedRef.current = true;
    } else {
      // No cache, fetch fresh data
      if (!initializedRef.current) {
        console.log('📥 PostFeed: No cache, fetching fresh data');
      }
      // Use ref to avoid dependency on loadPosts function reference
      if (loadPostsRef.current) {
        loadPostsRef.current(true);
      }
      initializedRef.current = true;
    }
  }, [queryKey, queryClient]); // Only run when query key changes, not loadPosts
  
  // Reset initialization flag when query key changes
  useEffect(() => {
    initializedRef.current = false;
  }, [queryKey]);

  // Load posts when refreshKey changes (explicit refresh)
  // Track last processed refreshKey to prevent infinite loops
  const lastProcessedRefreshKeyRef = useRef<number>(0);
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0 && refreshKey !== lastProcessedRefreshKeyRef.current) {
      console.log('🔄 PostFeed: refreshKey changed, fetching fresh data', refreshKey);
      lastProcessedRefreshKeyRef.current = refreshKey;
      // Use ref to avoid dependency on loadPosts function reference
      if (loadPostsRef.current) {
        loadPostsRef.current(true);
      }
    }
  }, [refreshKey]); // Only depend on refreshKey, not loadPosts

  // Refresh feed when filter changes
  // Track last filter state to prevent duplicate refreshes
  const lastFilterRef = useRef<string>('');
  useEffect(() => {
    const filterKey = `${activeFilter}-${JSON.stringify(selectedGroupIds)}`;
    if (filterKey === lastFilterRef.current) {
      return; // Filter hasn't actually changed
    }
    lastFilterRef.current = filterKey;
    console.log('🔄 PostFeed: Filter changed - activeFilter:', activeFilter, 'selectedGroupIds:', selectedGroupIds);
    if (loadPostsRef.current) {
      console.log('📥 PostFeed: Triggering feed refresh due to filter change');
      loadPostsRef.current(true);
    } else {
      console.warn('⚠️ PostFeed: loadPostsRef.current is not set, cannot refresh feed');
    }
  }, [activeFilter, selectedGroupIds]);

  // Set up WebSocket subscriptions for real-time updates
  useEffect(() => {
    const setupWebSocketSubscriptions = async () => {
      try {
        // Use shared WebSocket context to ensure connection
        await ensureConnection();

        // Clean up existing subscriptions
        wsSubscriptionsRef.current.forEach(unsubscribe => unsubscribe());
        wsSubscriptionsRef.current = [];

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

        console.log('✅ PostFeed WebSocket subscriptions established');

      } catch (error) {
        console.error('❌ Failed to setup WebSocket subscriptions for PostFeed:', error);
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

    // Only setup subscriptions when WebSocket is connected
    if (isConnected) {
      setupWebSocketSubscriptions();
    }

    // Cleanup WebSocket subscriptions on unmount
    return () => {
      wsSubscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      wsSubscriptionsRef.current = [];
    };
  }, [isConnected, ensureConnection, handleRealTimePostUpdate, handleRealTimeInteractionUpdate, handleRealTimeCommentUpdate]);

  // Monitor scroll position to track when at top
  useEffect(() => {
    const handleScroll = () => {
      isAtTopRef.current = window.scrollY === 0;
      // If user scrolls down, hide new content notification
      if (window.scrollY > 50) {
        setHasNewContent(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for new content periodically when at top
  useEffect(() => {
    if (posts.length === 0) return;

    const interval = setInterval(() => {
      if (window.scrollY < 100) {
        checkForNewContent();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [posts, checkForNewContent]);

  // 🎯 Pull-to-refresh handler - ONLY works when scrollY === 0
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // CRITICAL: Only activate if user is EXACTLY at the top
      if (window.scrollY === 0) {
        pullStartY.current = e.touches[0].clientY;
        isAtTopRef.current = true;
      } else {
        pullStartY.current = 0;
        isAtTopRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Only allow pull if we started at the top
      if (window.scrollY === 0 && pullStartY.current > 0 && isAtTopRef.current) {
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - pullStartY.current);
        
        if (distance > 0) {
          setIsPulling(true);
          setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
          // Prevent default scrolling when pulling
          if (distance > 10) {
            e.preventDefault();
          }
        }
      } else {
        // Reset if user scrolled away from top
        if (window.scrollY > 0) {
          setIsPulling(false);
          setPullDistance(0);
          pullStartY.current = 0;
          isAtTopRef.current = false;
        }
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistance >= PULL_THRESHOLD && isAtTopRef.current && window.scrollY === 0) {
        console.log('🔄 Pull-to-refresh triggered!');
        // Trigger refresh
        await loadPosts(true);
      }
      
      setIsPulling(false);
      setPullDistance(0);
      pullStartY.current = 0;
      isAtTopRef.current = true; // Reset for next time
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, loadPosts]);

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

  const handleRefresh = async () => {
    await loadPosts(true);
  };

  // Filter posts if maxPosts is set
  const displayedPosts = maxPosts ? posts.slice(0, maxPosts) : posts;

  return (
    <div className="post-feed">
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div 
          className="pull-to-refresh-indicator"
          style={{ 
            transform: `translateY(${Math.min(pullDistance, PULL_THRESHOLD)}px)`,
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
          }}
        >
          {pullDistance >= PULL_THRESHOLD ? '🔄 Release to refresh' : '⬇️ Pull to refresh'}
        </div>
      )}

      {/* New content notification */}
      {hasNewContent && !loading && (
        <div 
          className="new-content-notification" 
          onClick={async () => {
            await loadPosts(true);
            setHasNewContent(false);
          }}
        >
          🔄 New posts available - Click to refresh
        </div>
      )}

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
          <LoadingSpinner type="multi-ring" size="medium" text="Loading posts..." />
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
              <LoadingSpinner type="multi-ring" size="small" text="Loading more posts..." />
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
