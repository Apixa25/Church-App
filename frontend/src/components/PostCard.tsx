import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Post, PostType, Comment, SharePostRequest } from '../types/Post';
import { likePost, unlikePost, addComment, bookmarkPost, unbookmarkPost, deletePost, recordPostView, blockUser, unblockUser, getBlockStatus, followUser, unfollowUser, getFollowStatus, reportContent, getNewCommentCount, markCommentsAsRead } from '../services/postApi';
import CommentThread from './CommentThread';
import { formatRelativeDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { useFeedFilter } from '../contexts/FeedFilterContext';
import ShareModal from './ShareModal';
import ReportModal from './ReportModal';
import PostStatsModal from './PostStatsModal';
import ClickableAvatar from './ClickableAvatar';
import MediaViewer from './MediaViewer';
import LoadingSpinner from './LoadingSpinner';
import SocialMediaEmbedCard from './SocialMediaEmbedCard';
import { isVideoIncompatibleWithIOS, getVideoErrorMessage } from '../utils/videoUtils';
import './PostCard.css';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
  onPostDelete?: (postId: string) => void;
  showComments?: boolean;
  maxComments?: number;
  compact?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdate,
  onPostDelete,
  showComments = false,
  maxComments = 3,
  compact = false
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setFilter } = useFeedFilter();
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarkedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [sharesCount, setSharesCount] = useState(post.sharesCount);
  const [viewsCount, setViewsCount] = useState(post.viewsCount || 0);
  const [newCommentsCount, setNewCommentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Video loading state - track which videos should be loaded
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const [visibleVideos, setVisibleVideos] = useState<Set<number>>(new Set());
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [videoErrors, setVideoErrors] = useState<Map<number, string>>(new Map());
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportPostModal, setShowReportPostModal] = useState(false);
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPostStatsModal, setShowPostStatsModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  
  // Track if we've done an optimistic update to prevent props from overwriting it
  const optimisticUpdateRef = useRef<{ type: 'like' | 'bookmark' | 'comment' | 'share'; timestamp: number } | null>(null);

  useEffect(() => {
    // Only sync from props if not currently loading (to avoid overriding optimistic updates)
    if (!isLoading) {
      // Check if we have a recent optimistic update that shouldn't be overwritten
      const hasRecentOptimisticUpdate = optimisticUpdateRef.current && 
        (Date.now() - optimisticUpdateRef.current.timestamp) < 2000; // 2 second window
      
      setIsLiked(post.isLikedByCurrentUser || false);
      setIsBookmarked(post.isBookmarkedByCurrentUser || false);
      
      // Only sync likesCount if:
      // 1. It's different from current state
      // 2. We don't have a recent optimistic like update
      // 3. OR the prop value is actually higher (meaning it's a real update from server, not stale data)
      if (post.likesCount !== likesCount) {
        const shouldSync = !hasRecentOptimisticUpdate || 
                          optimisticUpdateRef.current?.type !== 'like' ||
                          post.likesCount > likesCount; // Only sync if prop is higher (real update)
        
        if (shouldSync) {
          console.log('❤️ useEffect syncing likesCount from props:', {
            postId: post.id,
            propLikesCount: post.likesCount,
            stateLikesCount: likesCount,
            hasRecentOptimisticUpdate: hasRecentOptimisticUpdate && optimisticUpdateRef.current?.type === 'like'
          });
          setLikesCount(post.likesCount);
          // Clear optimistic update ref if we're syncing (means server caught up)
          if (optimisticUpdateRef.current?.type === 'like') {
            optimisticUpdateRef.current = null;
          }
        } else {
          console.log('❤️ useEffect SKIPPING sync (optimistic update in progress):', {
            postId: post.id,
            propLikesCount: post.likesCount,
            stateLikesCount: likesCount
          });
        }
      }
      
      setCommentsCount(post.commentsCount);
      setSharesCount(post.sharesCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    post.id,
    post.isLikedByCurrentUser,
    post.isBookmarkedByCurrentUser,
    post.likesCount,
    post.commentsCount,
    post.sharesCount,
    isLoading // Include isLoading to prevent sync during operations
  ]);

  // Record post view when post is displayed
  useEffect(() => {
    const recordView = async () => {
      try {
        await recordPostView(post.id);
        // Increment local view count optimistically
        setViewsCount(prev => prev + 1);
      } catch (err) {
        // Silently fail - don't show error for analytics
        console.debug('Error recording post view:', err);
      }
    };
    recordView();
  }, [post.id]);

  // Fetch new comment count when post is displayed
  useEffect(() => {
    const fetchNewCommentCount = async () => {
      if (!user) return; // Only show for logged-in users

      try {
        const count = await getNewCommentCount(post.id);
        setNewCommentsCount(count);
      } catch (err) {
        // Silently fail - don't show error for analytics
        console.debug('Error fetching new comment count:', err);
      }
    };
    fetchNewCommentCount();
  }, [post.id, user]);

  // Check block/follow status when post changes
  useEffect(() => {
    const checkStatus = async () => {
      if (user && post.userId && post.userId !== user.userId && post.userId !== user.id) {
        try {
          const [blockStatus, followStatus] = await Promise.all([
            getBlockStatus(post.userId),
            getFollowStatus(post.userId)
          ]);
          setIsBlocked(blockStatus.isBlocked);
          setIsFollowing(followStatus.isFollowing);
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }
    };
    checkStatus();
  }, [post.userId, user]);

  // Handle comment highlighting from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#comment-')) {
      const commentId = hash.replace('#comment-', '');

      // Open comment thread
      setShowCommentThread(true);

      // Wait for DOM to update, then scroll and highlight
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
          // Scroll to comment
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight class
          commentElement.classList.add('highlighted-comment');

          // Remove highlight after 3 seconds
          setTimeout(() => {
            commentElement.classList.remove('highlighted-comment');
          }, 3000);
        }
      }, 500); // Wait for comment thread to render
    }
  }, [location]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as Element).closest('.post-more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  // Check if current user can delete this post (owner, admin, or moderator)
  const canDelete = user && (
    user.userId === post.userId || 
    user.id === post.userId || 
    user.role === 'PLATFORM_ADMIN' || 
    user.role === 'MODERATOR'
  );

  const handleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const wasLiked = isLiked;
    // Store original values for potential revert
    const originalLikesCount = likesCount;
    // Calculate new count before state updates (to avoid stale closure)
    const newLikesCount = wasLiked ? likesCount - 1 : likesCount + 1;

    console.log('❤️ handleLike called:', {
      postId: post.id,
      wasLiked,
      originalLikesCount,
      newLikesCount
    });

    try {
      // Mark optimistic update
      optimisticUpdateRef.current = { type: 'like', timestamp: Date.now() };
      
      // Optimistic update
      setIsLiked(!wasLiked);
      setLikesCount(newLikesCount);

      if (wasLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }

      // Update parent component if callback provided
      // Use the calculated newLikesCount instead of stale closure value
      if (onPostUpdate) {
        const updatedPost = {
          ...post,
          likesCount: newLikesCount,
          isLikedByCurrentUser: !wasLiked
        };
        console.log('❤️ Calling onPostUpdate with:', {
          postId: updatedPost.id,
          likesCount: updatedPost.likesCount,
          isLikedByCurrentUser: updatedPost.isLikedByCurrentUser
        });
        onPostUpdate(updatedPost);
      }
      
      // Clear optimistic update ref after a delay to allow server response
      setTimeout(() => {
        if (optimisticUpdateRef.current?.type === 'like') {
          optimisticUpdateRef.current = null;
        }
      }, 3000); // 3 second window
    } catch (error) {
      // Revert optimistic update on error
      console.error('❤️ Error toggling like, reverting:', error);
      setIsLiked(wasLiked);
      setLikesCount(originalLikesCount); // Revert to original count
      optimisticUpdateRef.current = null; // Clear on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareSuccess = async (_request: SharePostRequest) => {
    setSharesCount(prev => {
      const next = prev + 1;
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          sharesCount: next
        });
      }
      return next;
    });
  };

  const handleBookmark = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const wasBookmarked = isBookmarked;

    try {
      // Optimistic update
      setIsBookmarked(!wasBookmarked);

      if (wasBookmarked) {
        await unbookmarkPost(post.id);
      } else {
        await bookmarkPost(post.id);
      }

      const updatedBookmarksCount = Math.max(
        0,
        (post.bookmarksCount || 0) + (wasBookmarked ? -1 : 1)
      );

      // Update parent component if callback provided
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          bookmarksCount: updatedBookmarksCount,
          isBookmarkedByCurrentUser: !wasBookmarked
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsBookmarked(wasBookmarked);
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    
    const confirmed = window.confirm(
      user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR'
        ? 'Are you sure you want to delete this post as an administrator?'
        : 'Are you sure you want to delete this post?'
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deletePost(post.id);
      
      // Notify parent component
      if (onPostDelete) {
        onPostDelete(post.id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!user || !post.userId || (post.userId === user.userId || post.userId === user.id) || blockLoading) return;

    const action = isBlocked ? 'unblock' : 'block';
    const confirmed = window.confirm(
      isBlocked
        ? `Are you sure you want to unblock ${post.userName}? You will see their posts again and they will see yours.`
        : `Are you sure you want to block ${post.userName}? You will no longer see their posts, comments, or profile, and they will no longer see yours.`
    );

    if (!confirmed) return;

    try {
      setBlockLoading(true);
      if (isBlocked) {
        await unblockUser(post.userId);
        setIsBlocked(false);
      } else {
        await blockUser(post.userId);
        setIsBlocked(true);
        if (isFollowing) {
          await unfollowUser(post.userId);
          setIsFollowing(false);
        }
      }
      setShowMoreMenu(false);
    } catch (err: any) {
      console.error(`Error ${action}ing user:`, err);
      alert(`Failed to ${action} user. Please try again.`);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !post.userId || (post.userId === user.userId || post.userId === user.id)) return;

    try {
      if (isFollowing) {
        await unfollowUser(post.userId);
        setIsFollowing(false);
      } else {
        await followUser(post.userId);
        setIsFollowing(true);
      }
      setShowMoreMenu(false);
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status. Please try again.');
    }
  };

  const handleReportPost = async (reason: string, description: string) => {
    await reportContent('POST', post.id, reason, description);
    alert('Thank you for your report. Our moderation team will review it.');
  };

  const handleReportUser = async (reason: string, description: string) => {
    await reportContent('USER', post.userId, reason, description);
    alert('Thank you for your report. Our moderation team will review it.');
  };

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowMoreMenu(false);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const newComment = await addComment(post.id, {
        content: commentText.trim(),
        anonymous: false
      });

      setComments(prev => [newComment, ...prev]);
      setCommentsCount(prev => prev + 1);
      setCommentText('');
      setShowCommentForm(false);

      // Update parent component
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          commentsCount: commentsCount + 1
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPostTypeIcon = (postType: PostType): string => {
    switch (postType) {
      case PostType.PRAYER:
        return '🙏';
      case PostType.TESTIMONY:
        return '✨';
      case PostType.ANNOUNCEMENT:
        return '📢';
      default:
        return '💬';
    }
  };

  const getPostTypeLabel = (postType: PostType): string => {
    switch (postType) {
      case PostType.PRAYER:
        return 'Prayer Request';
      case PostType.TESTIMONY:
        return 'Testimony';
      case PostType.ANNOUNCEMENT:
        return 'Announcement';
      default:
        return 'Post';
    }
  };

  // Use the centralized date formatting utility
  const formatDate = (dateString: string): string => {
    return formatRelativeDate(dateString);
  };

  const handleMediaClick = (index: number, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      if (e.type === 'click') {
        e.preventDefault();
      }
    }
    setMediaViewerIndex(index);
    setShowMediaViewer(true);
  };

  // Handle video click - load video if not already loaded, then auto-play
  const handleVideoClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Mark video as loaded (will trigger React to set the src attribute)
    setLoadedVideos(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
    
    // Wait for React to re-render with the new src, then play
    // This small delay allows the video element to receive its src attribute
    setTimeout(() => {
      const video = videoRefs.current.get(index);
      if (video) {
        // Play the video - single click should start playback
        video.play().catch(err => {
          console.log('Video autoplay prevented:', err);
        });
      }
    }, 50); // Small delay for React to update DOM
  }, []);

  // Lazy loading with Intersection Observer for videos
  // Note: We track visibility but don't auto-load - videos only load on user click
  useEffect(() => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-video-index') || '0');
            setVisibleVideos(prev => {
              const newSet = new Set(prev);
              newSet.add(index);
              return newSet;
            });
            // Unobserve once visible (we don't need to track it anymore)
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px', // Start tracking 100px before video enters viewport
        threshold: 0.01
      }
    );

    // Observe all video elements that exist
    const observeVideos = () => {
      videoRefs.current.forEach((video, index) => {
        if (video && !visibleVideos.has(index)) {
          observer.observe(video);
        }
      });
    };

    // Initial observation
    observeVideos();

    // Re-observe after a short delay to catch videos that render later
    const timeoutId = setTimeout(observeVideos, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [post.mediaUrls, visibleVideos]);

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return null;
    }

    const mediaCount = post.mediaUrls.length;

    // Single image - full width with natural aspect ratio
    if (mediaCount === 1) {
      const mediaType = post.mediaTypes?.[0] || 'image';
      const isImage = mediaType.startsWith('image');
      
      return (
        <div className="post-media">
          <div 
            className="media-item media-item-single"
            onClick={(e) => handleMediaClick(0, e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMediaClick(0, e);
              }
            }}
            aria-label={`View full ${isImage ? 'image' : 'video'}`}
          >
            {isImage ? (
              <img
                src={post.mediaUrls[0]}
                alt="Post media"
                className="media-image"
                loading="lazy"
                onError={(e) => {
                  // Only log errors, not every successful load
                  console.error('🖼️ PostCard: Image failed to load:', post.mediaUrls[0], 'for post:', post.id);
                }}
              />
            ) : (
              <div className="video-container-wrapper">
                {videoErrors.has(0) ? (
                  <div className="video-error-message">
                    <p>{videoErrors.get(0)}</p>
                    <small>Video is being processed for iPhone compatibility</small>
                  </div>
                ) : (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(0, el);
                    }}
                    src={loadedVideos.has(0) ? post.mediaUrls[0] : undefined}
                    controls={loadedVideos.has(0)}
                    className="media-video"
                    preload={loadedVideos.has(0) ? "auto" : (post.thumbnailUrls && post.thumbnailUrls[0] ? "none" : "metadata")}
                    poster={post.thumbnailUrls && post.thumbnailUrls[0] ? post.thumbnailUrls[0] : undefined}
                    data-video-index="0"
                    onClick={(e) => {
                    if (!loadedVideos.has(0)) {
                      // First click: load the video and start playing
                      handleVideoClick(0, e);
                    } else {
                      // Video already loaded - let native controls handle play/pause
                      // Don't open media viewer, just stop propagation
                      e.stopPropagation();
                    }
                  }}
                  onError={(e) => {
                    const video = e.currentTarget as HTMLVideoElement;
                    const error = video.error;
                    const mediaType = post.mediaTypes?.[0];
                    const url = post.mediaUrls[0];
                    
                    console.error('Video playback error:', {
                      index: 0,
                      url,
                      mediaType,
                      errorCode: error?.code,
                      errorMessage: error?.message
                    });
                    
                    // Check if it's a WebM format on iOS
                    if (isVideoIncompatibleWithIOS(mediaType, url)) {
                      const errorMsg = getVideoErrorMessage(mediaType, url);
                      setVideoErrors(prev => new Map(prev).set(0, errorMsg));
                    } else if (error) {
                      // Other video errors
                      if (error.code === 4) {
                        setVideoErrors(prev => new Map(prev).set(0, 'Video format not supported on this device'));
                      } else {
                        setVideoErrors(prev => new Map(prev).set(0, 'Unable to play video. Please try again later.'));
                      }
                    }
                  }}
                  playsInline
                  crossOrigin="anonymous"
                />
                )}
                {!loadedVideos.has(0) && (
                  <div 
                    className="video-play-overlay"
                    onClick={(e) => handleVideoClick(0, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleVideoClick(0, e as any);
                      }
                    }}
                    aria-label="Play video"
                  >
                    <div className="video-play-button">
                      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="32" r="32" fill="rgba(0, 0, 0, 0.6)"/>
                        <path d="M24 20L44 32L24 44V20Z" fill="white"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Multiple images - grid layout
    return (
      <div className="post-media post-media-grid">
        <div className={`media-grid media-grid-${Math.min(mediaCount, 4)}`}>
          {post.mediaUrls.slice(0, 4).map((url, index) => {
            const mediaType = post.mediaTypes?.[index] || 'image';
            const isImage = mediaType.startsWith('image');
            const isLastVisible = index === 3 && mediaCount > 4;
            const remainingCount = mediaCount - 4;

            return (
              <div 
                key={index} 
                className={`media-item media-item-grid ${isLastVisible ? 'media-item-overlay' : ''}`}
                onClick={(e) => handleMediaClick(index, e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMediaClick(index, e);
                  }
                }}
                aria-label={`View image ${index + 1} of ${mediaCount}`}
              >
                {isImage ? (
                  <img
                    src={url}
                    alt={`Post media ${index + 1}`}
                    className="media-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="video-container-wrapper video-grid-wrapper">
                    {videoErrors.has(index) ? (
                      <div className="video-error-message">
                        <p>{videoErrors.get(index)}</p>
                        <small>Video is being processed for iPhone compatibility</small>
                      </div>
                    ) : (
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current.set(index, el);
                        }}
                        src={loadedVideos.has(index) ? url : undefined}
                        controls={false}
                        className="media-video"
                        preload={loadedVideos.has(index) ? "auto" : (post.thumbnailUrls && post.thumbnailUrls[index] ? "none" : "metadata")}
                        poster={post.thumbnailUrls && post.thumbnailUrls[index] ? post.thumbnailUrls[index] : undefined}
                        data-video-index={index.toString()}
                        onClick={(e) => {
                          if (!loadedVideos.has(index)) {
                            handleVideoClick(index, e);
                          } else {
                            e.stopPropagation();
                            handleMediaClick(index, e);
                          }
                        }}
                        onError={(e) => {
                          const video = e.currentTarget as HTMLVideoElement;
                          const error = video.error;
                          const mediaType = post.mediaTypes?.[index];
                          
                          console.error('Video playback error:', {
                            index,
                            url,
                            mediaType,
                            errorCode: error?.code,
                            errorMessage: error?.message
                          });
                          
                          // Check if it's a WebM format on iOS
                          if (isVideoIncompatibleWithIOS(mediaType, url)) {
                            const errorMsg = getVideoErrorMessage(mediaType, url);
                            setVideoErrors(prev => new Map(prev).set(index, errorMsg));
                          } else if (error) {
                            // Other video errors
                            if (error.code === 4) {
                              setVideoErrors(prev => new Map(prev).set(index, 'Video format not supported on this device'));
                            } else {
                              setVideoErrors(prev => new Map(prev).set(index, 'Unable to play video. Please try again later.'));
                            }
                          }
                        }}
                        playsInline
                        crossOrigin="anonymous"
                      />
                    )}
                    {!loadedVideos.has(index) && (
                      <div 
                        className="video-play-overlay video-grid-overlay"
                        onClick={(e) => handleVideoClick(index, e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleVideoClick(index, e as any);
                          }
                        }}
                        aria-label="Play video"
                      >
                        <div className="video-play-button video-grid-play-button">
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="24" cy="24" r="24" fill="rgba(0, 0, 0, 0.6)"/>
                            <path d="M18 15L30 24L18 33V15Z" fill="white"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isLastVisible && (
                  <div className="media-overlay-count">
                    +{remainingCount} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`post-card ${compact ? 'compact' : ''}`}>
      {/* Post Header - X-style layout */}
      <div className="post-header">
        <ClickableAvatar
          userId={post.userId}
          profilePicUrl={post.userProfilePicUrl}
          userName={post.userName}
          size="medium"
          isAnonymous={post.isAnonymous}
        />
        <div className="author-info">
          {/* Line 1: Name + timestamp */}
          <div className="author-name-row">
            <span className="author-name">
              {post.isAnonymous ? 'Anonymous' : post.userName}
            </span>
            {post.postType !== PostType.GENERAL && (
              <span className="post-type-badge">
                {getPostTypeIcon(post.postType)}
              </span>
            )}
            <span className="timestamp">{formatDate(post.createdAt)}</span>
          </div>
          {/* Line 2: Org/Group (only if exists) */}
          {(post.group || post.organization || post.location) && (
            <div className="post-meta">
              {post.location && <span className="location">📍 {post.location}</span>}
              {(post.group || post.organization) && (
                <span 
                  className="post-context-name clickable"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      if (post.group) {
                        if (location.pathname !== '/dashboard') {
                          navigate('/dashboard');
                          await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        await setFilter('SELECTED_GROUPS', [post.group.id]);
                      } else if (post.organization) {
                        if (location.pathname !== '/dashboard') {
                          navigate('/dashboard');
                          await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        await setFilter('PRIMARY_ONLY', [], post.organization.id);
                      }
                    } catch (error) {
                      console.error('Error filtering feed:', error);
                    }
                  }}
                  title={post.group ? `Show posts from ${post.group.name}` : `Show posts from ${post.organization?.name}`}
                >
                  {post.group ? post.group.name : post.organization?.name}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="post-header-actions">
          {canDelete && (
            <button
              className="post-delete-button"
              onClick={handleDelete}
              disabled={isLoading}
              title={user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR' ? 'Delete post (Admin)' : 'Delete post'}
            >
              🗑️
            </button>
          )}
          <div className="post-more-menu-container">
            <button
              className="post-more-button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="More actions"
            >
              ⋯
            </button>
            {showMoreMenu && (
              <div className="post-more-menu">
                {user && post.userId && (post.userId !== user.userId && post.userId !== user.id) && (
                  <>
                    <button
                      className="menu-item"
                      onClick={handleFollowToggle}
                      disabled={blockLoading}
                    >
                      {isFollowing ? '✓ Unfollow' : '👥 Follow'} {post.userName}
                    </button>
                    <button
                      className="menu-item danger"
                      onClick={handleBlockToggle}
                      disabled={blockLoading}
                    >
                      {blockLoading ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px' }}>
                          <LoadingSpinner type="multi-ring" size="inline" />
                        </span>
                      ) : isBlocked ? (
                        '🚫 Unblock'
                      ) : (
                        '🚫 Block'
                      )} {post.userName}
                    </button>
                  </>
                )}
                {user && (post.userId === user.userId || post.userId === user.id) && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowPostStatsModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    📊 View Stats
                  </button>
                )}
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowReportPostModal(true);
                    setShowMoreMenu(false);
                  }}
                >
                  🚨 Report Post
                </button>
                {user && post.userId && (post.userId !== user.userId && post.userId !== user.id) && (
                  <button
                    className="menu-item danger"
                    onClick={() => {
                      setShowReportUserModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    🚨 Report User
                  </button>
                )}
                <button
                  className="menu-item"
                  onClick={handleCopyLink}
                >
                  {copied ? '✓ Link Copied!' : '🔗 Copy Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="post-content">
        <p className="post-text">{post.content}</p>
        {post.category && (
          <span className="post-category">#{post.category}</span>
        )}
      </div>

      {/* Post Media */}
      {renderMedia()}
      
      {/* Social Media Embed */}
      {post.externalUrl && post.externalEmbedHtml && (
        <div className="post-external-embed">
          <SocialMediaEmbedCard
            embedHtml={post.externalEmbedHtml}
            externalUrl={post.externalUrl}
            platform={post.externalPlatform || 'UNKNOWN'}
          />
        </div>
      )}
      
      {/* Fallback: Show link if embed HTML is not available */}
      {post.externalUrl && !post.externalEmbedHtml && (
        <div className="post-external-link-fallback">
          <a
            href={post.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link-button"
          >
            🔗 View on {post.externalPlatform || 'External Site'} →
          </a>
        </div>
      )}

      {/* Post Actions */}
      <div className="post-actions">
        <button
          className={`action-button like-button ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={isLoading}
          aria-label={isLiked ? 'Unlike post' : 'Like post'}
        >
          ❤️ {likesCount > 0 && likesCount}
        </button>

        <button
          className="action-button comment-button"
          onClick={async () => {
            const newState = !showCommentThread;
            setShowCommentThread(newState);

            // Mark comments as read when opening the thread
            if (newState && newCommentsCount > 0) {
              try {
                await markCommentsAsRead(post.id);
                setNewCommentsCount(0);
              } catch (err) {
                console.debug('Error marking comments as read:', err);
              }
            }
          }}
          aria-label="View comments"
        >
          💬 {commentsCount > 0 && commentsCount}
          {newCommentsCount > 0 && (
            <span className="new-comments-badge">+{newCommentsCount}</span>
          )}
        </button>

        <button
          className={`action-button bookmark-button ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmark}
          disabled={isLoading}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
        >
          🔖
        </button>

        <button
          className="action-button share-button"
          onClick={() => setIsShareModalOpen(true)}
          aria-label="Share post"
        >
          🔄 {sharesCount > 0 && sharesCount}
        </button>
      </div>

      {/* View Count */}
      {viewsCount > 0 && (
        <div className="post-views">
          <span className="views-count">
            👁️ {viewsCount >= 1000
              ? `${(viewsCount / 1000).toFixed(1)}k`
              : viewsCount
            } {viewsCount === 1 ? 'view' : 'views'}
          </span>
        </div>
      )}

      {/* Comment Thread */}
      {showCommentThread && (
        <div className="comment-thread-container">
          <CommentThread
            postId={post.id}
            currentUserId={user?.id}
            currentUserEmail={user?.email}
            initialComments={comments}
            onCommentCountChange={(count) => {
              setCommentsCount(count);
              // Update parent component if callback provided
              if (onPostUpdate) {
                onPostUpdate({
                  ...post,
                  commentsCount: count
                });
              }
            }}
          />
        </div>
      )}

      <ShareModal
        post={post}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShare={handleShareSuccess}
      />

      {/* Report Modals */}
      <ReportModal
        isOpen={showReportPostModal}
        onClose={() => setShowReportPostModal(false)}
        onSubmit={handleReportPost}
        contentType="POST"
        contentName={post.content ? (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content) : 'Post'}
      />

      <ReportModal
        isOpen={showReportUserModal}
        onClose={() => setShowReportUserModal(false)}
        onSubmit={handleReportUser}
        contentType="USER"
        contentName={post.userName}
      />

      <PostStatsModal
        postId={post.id}
        isOpen={showPostStatsModal}
        onClose={() => setShowPostStatsModal(false)}
      />

      {/* Media Viewer */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <MediaViewer
          mediaUrls={post.mediaUrls}
          mediaTypes={post.mediaTypes || []}
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          initialIndex={mediaViewerIndex}
        />
      )}
    </div>
  );
};

// 🎯 OPTIMIZATION: Memoize PostCard to prevent unnecessary re-renders
// Only re-render when post data actually changes
const MemoizedPostCard = memo(PostCard, (prevProps, nextProps) => {
  // Return true if props are EQUAL (skip re-render)
  // Return false if props are DIFFERENT (re-render)
  
  const prevPost = prevProps.post;
  const nextPost = nextProps.post;
  
  // Check critical fields that affect display
  if (prevPost.id !== nextPost.id) return false;
  if (prevPost.likesCount !== nextPost.likesCount) return false;
  if (prevPost.commentsCount !== nextPost.commentsCount) return false;
  if (prevPost.sharesCount !== nextPost.sharesCount) return false;
  if (prevPost.isLikedByCurrentUser !== nextPost.isLikedByCurrentUser) return false;
  if (prevPost.isBookmarkedByCurrentUser !== nextPost.isBookmarkedByCurrentUser) return false;
  if (prevPost.content !== nextPost.content) return false;
  if (prevPost.updatedAt !== nextPost.updatedAt) return false;
  
  // Check callback references only if they exist
  if (prevProps.onPostUpdate !== nextProps.onPostUpdate) return false;
  if (prevProps.onPostDelete !== nextProps.onPostDelete) return false;
  
  // All checked props are equal - skip re-render
  return true;
});

export default MemoizedPostCard;
