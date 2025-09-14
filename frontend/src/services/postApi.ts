import api from './api';
import {
  Post,
  Comment,
  CreatePostRequest,
  CreateReplyRequest,
  CreateQuoteRequest,
  CreateCommentRequest,
  SharePostRequest,
  FeedResponse,
  CommentsResponse,
  FeedType,
  PostStats,
  PostSearchFilters
} from '../types/Post';

// ========== POST CRUD OPERATIONS ==========

export const createPost = async (request: CreatePostRequest): Promise<Post> => {
  const response = await api.post('/posts', request);
  return response.data;
};

export const createReply = async (postId: string, request: CreateReplyRequest): Promise<Post> => {
  const response = await api.post(`/posts/reply/${postId}`, request);
  return response.data;
};

export const createQuote = async (postId: string, request: CreateQuoteRequest): Promise<Post> => {
  const response = await api.post(`/posts/quote/${postId}`, request);
  return response.data;
};

export const getPost = async (postId: string): Promise<Post> => {
  const response = await api.get(`/posts/${postId}`);
  return response.data;
};

export const getUserPosts = async (
  userId: string,
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get(`/posts/user/${userId}`, {
    params: { page, size }
  });
  return response.data;
};

export const deletePost = async (postId: string): Promise<void> => {
  await api.delete(`/posts/${postId}`);
};

// ========== FEED OPERATIONS ==========

export const getFeed = async (
  feedType: string = 'community',
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get('/posts/feed', {
    params: { feedType, page, size }
  });
  return response.data;
};

export const getTrendingFeed = async (
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get('/posts/feed/trending', {
    params: { page, size }
  });
  return response.data;
};

export const getPostsByCategory = async (
  category: string,
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get(`/posts/feed/category/${category}`, {
    params: { page, size }
  });
  return response.data;
};

export const getPostsByType = async (
  postType: string,
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get(`/posts/feed/type/${postType}`, {
    params: { page, size }
  });
  return response.data;
};

export const searchPosts = async (
  query: string,
  page: number = 0,
  size: number = 20,
  filters?: PostSearchFilters
): Promise<FeedResponse> => {
  const params = new URLSearchParams();
  params.append('query', query);
  params.append('page', page.toString());
  params.append('size', size.toString());
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  const response = await api.get('/posts/search', { params });
  return response.data;
};

export const getPostThread = async (postId: string): Promise<Post[]> => {
  const response = await api.get(`/posts/${postId}/thread`);
  return response.data;
};

// ========== INTERACTION OPERATIONS ==========

export const likePost = async (postId: string): Promise<void> => {
  await api.post(`/posts/${postId}/like`);
};

export const unlikePost = async (postId: string): Promise<void> => {
  await api.delete(`/posts/${postId}/like`);
};

export const addComment = async (
  postId: string,
  request: CreateCommentRequest
): Promise<Comment> => {
  const response = await api.post(`/posts/${postId}/comments`, request);
  return response.data;
};

export const getPostComments = async (
  postId: string,
  page: number = 0,
  size: number = 20
): Promise<CommentsResponse> => {
  const response = await api.get(`/posts/${postId}/comments`, {
    params: { page, size }
  });
  return response.data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await api.delete(`/posts/comments/${commentId}`);
};

export const sharePost = async (
  postId: string,
  request: SharePostRequest
): Promise<void> => {
  await api.post(`/posts/${postId}/share`, request);
};

export const bookmarkPost = async (postId: string): Promise<void> => {
  await api.post(`/posts/${postId}/bookmark`);
};

export const unbookmarkPost = async (postId: string): Promise<void> => {
  await api.delete(`/posts/${postId}/bookmark`);
};

// ========== MEDIA UPLOAD ==========

export const uploadMedia = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append('files', file);
  });

  const response = await api.post('/posts/upload-media', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

// ========== STATISTICS ==========

export const getFeedStats = async (): Promise<PostStats> => {
  const response = await api.get('/posts/stats/feed');
  return response.data;
};

// ========== UTILITY FUNCTIONS ==========

export const formatFeedTypeForAPI = (feedType: FeedType): string => {
  switch (feedType) {
    case FeedType.CHRONOLOGICAL:
      return 'chronological';
    case FeedType.TRENDING:
      return 'trending';
    case FeedType.FOR_YOU:
      return 'for_you';
    default:
      return 'community';
  }
};

export const buildSearchQuery = (filters: PostSearchFilters): string => {
  const params: string[] = [];

  if (filters.query) {
    params.push(`query=${encodeURIComponent(filters.query)}`);
  }
  if (filters.postType) {
    params.push(`postType=${filters.postType}`);
  }
  if (filters.category) {
    params.push(`category=${encodeURIComponent(filters.category)}`);
  }
  if (filters.location) {
    params.push(`location=${encodeURIComponent(filters.location)}`);
  }
  if (filters.dateFrom) {
    params.push(`dateFrom=${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    params.push(`dateTo=${filters.dateTo}`);
  }
  if (filters.hasMedia !== undefined) {
    params.push(`hasMedia=${filters.hasMedia}`);
  }
  if (filters.isAnonymous !== undefined) {
    params.push(`isAnonymous=${filters.isAnonymous}`);
  }

  return params.join('&');
};

// Error handling helper
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Cache management helpers (for future optimization)
export const invalidatePostCache = (postId?: string): void => {
  if (postId) {
    // Invalidate specific post cache
    console.log(`Invalidating cache for post ${postId}`);
  } else {
    // Invalidate all posts cache
    console.log('Invalidating all posts cache');
  }
};

export const invalidateFeedCache = (): void => {
  console.log('Invalidating feed cache');
};

export const invalidateCommentsCache = (postId: string): void => {
  console.log(`Invalidating comments cache for post ${postId}`);
};

// ========== USER PROFILE OPERATIONS ==========

export const getUserProfile = async (userId: string): Promise<any> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUserProfile = async (userId: string, profileData: any): Promise<any> => {
  const response = await api.put('/profile/me', profileData);
  return response.data;
};

export const uploadProfilePicture = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/profile/me/upload-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.fileUrl;
};

export const followUser = async (userId: string): Promise<void> => {
  await api.post(`/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}/follow`);
};

// ========== ADMIN & MODERATION OPERATIONS ==========

export interface ReportedContent {
  id: string;
  contentType: 'POST' | 'COMMENT';
  contentId: string;
  reportedBy: string;
  reportedUserName?: string;
  reporterName?: string;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
  reportedAt?: string;
  reportType?: string;
  priority?: 'low' | 'medium' | 'high';
  contentPreview?: string;
  additionalInfo?: string;
}

export interface CommunityStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  reportsCount: number;
  activeReports?: number;
  moderatedToday?: number;
  bannedUsers?: number;
  totalReportsHandled?: number;
  reportsThisWeek?: number;
  contentRemoved?: number;
  removalRate?: number;
  warningsIssued?: number;
  warningsThisWeek?: number;
  banRate?: number;
}

export type ModerationActionType = 'approve' | 'remove' | 'hide' | 'warn' | 'ban' | 'unban';

export interface ModerationAction {
  id: string;
  moderatorId: string;
  action: ModerationActionType;
  targetId: string;
  reason: string;
  createdAt: string;
}

export const getReportedContent = async (): Promise<ReportedContent[]> => {
  const response = await api.get('/admin/reports');
  return response.data;
};

export const moderateContent = async (contentId: string, action: ModerationActionType, reason: string): Promise<void> => {
  await api.post(`/admin/moderate/${contentId}`, { action, reason });
};

export const getCommunityStats = async (): Promise<CommunityStats> => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const banUser = async (userId: string, reason: string): Promise<void> => {
  await api.post(`/admin/users/${userId}/ban`, { reason });
};

export const unbanUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}/ban`);
};

export const warnUser = async (userId: string, message: string): Promise<void> => {
  await api.post(`/admin/users/${userId}/warn`, { message });
};

export const getModerationLog = async (): Promise<ModerationAction[]> => {
  const response = await api.get('/admin/moderation-log');
  return response.data;
};

// ========== ANALYTICS OPERATIONS ==========

export interface AnalyticsData {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  activeUsers: number;
  totalMembers?: number;
  memberGrowth?: number;
  postGrowth?: number;
  totalInteractions?: number;
  interactionGrowth?: number;
  engagementRate?: number;
  engagementChange?: number;
  prayerRequests?: number;
  testimonies?: number;
  announcements?: number;
  answeredPrayers?: number;
  lastUpdated?: string;
  activityData: Array<{
    date: string;
    posts: number;
    comments: number;
    likes: number;
  }>;
  contentCategories: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  topContributors: Array<{
    userId: string;
    userName: string;
    name?: string; // Alias for userName
    profilePicUrl?: string;
    postsCount: number;
    commentsCount: number;
    likesReceived: number;
    interactions?: number;
    engagementScore?: number;
  }>;
  popularTopics: Array<{
    hashtag: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    postsCount?: number;
    interactions?: number;
  }>;
}

export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  const response = await api.get('/admin/analytics');
  return response.data;
};