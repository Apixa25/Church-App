/**
 * React Query hooks for profile tab data
 * Provides caching and deduplication for profile-related API calls
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getUserPosts, getCommentsReceivedOnPosts, getUserMediaPosts } from '../services/postApi';
import { getUserComments } from '../services/postApi';
import { prayerInteractionAPI } from '../services/prayerApi';
import { Comment, Post } from '../types/Post';
import { PrayerInteraction } from '../types/Prayer';

// ========== Types ==========

export interface UnifiedCommentItem {
  id: string;
  type: 'post' | 'prayer';
  contentId: string;
  contentPreview: string;
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  content: string;
  createdAt: string;
  isAnonymous?: boolean;
  likesCount?: number;
}

export interface CommentGroup {
  contentId: string;
  contentType: 'post' | 'prayer';
  contentPreview: string;
  comments: UnifiedCommentItem[];
}

export interface CommentsReceivedData {
  groups: CommentGroup[];
  hasMore: boolean;
}

// ========== Query Keys ==========

export const profileQueryKeys = {
  userPosts: (userId: string) => ['userPosts', userId] as const,
  userMedia: (userId: string) => ['userMedia', userId] as const,
  userReplies: (userId: string) => ['userReplies', userId] as const,
  commentsReceived: (userId: string) => ['commentsReceived', userId] as const,
};

// ========== Helper Functions ==========

/**
 * Fetch and merge comments from posts and prayers into unified format
 */
const fetchCommentsReceived = async (userId: string, page: number = 0): Promise<CommentsReceivedData> => {
  // Fetch both post comments and prayer comments in parallel
  const [postCommentsResponse, prayerCommentsResponse] = await Promise.all([
    getCommentsReceivedOnPosts(userId, page, 20),
    prayerInteractionAPI.getCommentsReceivedByUser(userId, page, 20)
      .then(res => res.data)
      .catch(() => ({ content: [], totalPages: 0 }))
  ]);

  // Convert post comments to unified format
  const postCommentItems: UnifiedCommentItem[] = postCommentsResponse.content.map((comment: Comment) => ({
    id: comment.id,
    type: 'post' as const,
    contentId: comment.postId,
    contentPreview: comment.postContent || 'View post',
    userId: comment.userId,
    userName: comment.userName,
    userProfilePicUrl: comment.userProfilePicUrl,
    content: comment.content,
    createdAt: comment.createdAt,
    isAnonymous: comment.isAnonymous,
    likesCount: comment.likesCount
  }));

  // Convert prayer comments to unified format
  const prayerCommentItems: UnifiedCommentItem[] = (prayerCommentsResponse.content || []).map((interaction: PrayerInteraction) => ({
    id: interaction.id,
    type: 'prayer' as const,
    contentId: interaction.prayerRequestId,
    contentPreview: 'View prayer request',
    userId: interaction.userId,
    userName: interaction.userName,
    userProfilePicUrl: interaction.userProfilePicUrl,
    content: interaction.content || '',
    createdAt: Array.isArray(interaction.timestamp)
      ? new Date(interaction.timestamp[0], interaction.timestamp[1] - 1, interaction.timestamp[2],
          interaction.timestamp[3] || 0, interaction.timestamp[4] || 0).toISOString()
      : String(interaction.timestamp),
    isAnonymous: false
  }));

  // Combine all comments
  const allComments = [...postCommentItems, ...prayerCommentItems];

  // Group comments by content (post or prayer)
  const groupsMap = new Map<string, CommentGroup>();

  allComments.forEach(comment => {
    const key = `${comment.type}-${comment.contentId}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        contentId: comment.contentId,
        contentType: comment.type,
        contentPreview: comment.contentPreview,
        comments: []
      });
    }
    groupsMap.get(key)!.comments.push(comment);
  });

  // Sort comments within each group by date (newest first)
  groupsMap.forEach(group => {
    group.comments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  // Convert to array and sort groups by most recent comment
  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    const aLatest = new Date(a.comments[0]?.createdAt || 0).getTime();
    const bLatest = new Date(b.comments[0]?.createdAt || 0).getTime();
    return bLatest - aLatest;
  });

  // Check if there's more data
  const maxPages = Math.max(
    postCommentsResponse.totalPages || 0,
    prayerCommentsResponse.totalPages || 0
  );
  const hasMore = page + 1 < maxPages;

  return { groups, hasMore };
};

// ========== Hooks ==========

/**
 * Hook for user posts with infinite scroll pagination
 * Only fetches when enabled (e.g., when Posts tab is active)
 */
export const useUserPostsInfinite = (userId: string | undefined, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: profileQueryKeys.userPosts(userId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('userId required');
      return getUserPosts(userId, pageParam, 20);
    },
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.number + 1,
    initialPageParam: 0,
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for user media posts with infinite scroll pagination
 * Only fetches when enabled (e.g., when Media tab is active)
 */
export const useUserMediaInfinite = (userId: string | undefined, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: profileQueryKeys.userMedia(userId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('userId required');
      return getUserMediaPosts(userId, pageParam, 20);
    },
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.number + 1,
    initialPageParam: 0,
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for user's own replies/comments with pagination
 * Only fetches when enabled (e.g., when Replies tab is active)
 */
export const useUserRepliesInfinite = (userId: string | undefined, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: profileQueryKeys.userReplies(userId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('userId required');
      return getUserComments(userId, pageParam, 20);
    },
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.number + 1,
    initialPageParam: 0,
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for comments received on user's posts/prayers
 * Only fetches when enabled (e.g., when Comments tab is active)
 */
export const useCommentsReceivedInfinite = (userId: string | undefined, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: profileQueryKeys.commentsReceived(userId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('userId required');
      return fetchCommentsReceived(userId, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? undefined : undefined, // Will be handled manually
    initialPageParam: 0,
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Simple hook for comments received (single page, no infinite scroll)
 */
export const useCommentsReceived = (userId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: profileQueryKeys.commentsReceived(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('userId required');
      return fetchCommentsReceived(userId, 0);
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Simple hook for user replies (single page, no infinite scroll)
 */
export const useUserReplies = (userId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: profileQueryKeys.userReplies(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('userId required');
      return getUserComments(userId, 0, 20);
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Simple hook for user media posts (single page, no infinite scroll)
 */
export const useUserMedia = (userId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: profileQueryKeys.userMedia(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('userId required');
      return getUserMediaPosts(userId, 0, 20);
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};
