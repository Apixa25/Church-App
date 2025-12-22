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
import { ProfileUpdateRequest } from '../types/Profile';

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

export const getUserComments = async (
  userId: string,
  page: number = 0,
  size: number = 20
): Promise<CommentsResponse> => {
  const response = await api.get(`/posts/user/${userId}/comments`, {
    params: { page, size }
  });
  // Backend returns Page<CommentResponse>, need to map to CommentsResponse
  return {
    content: response.data.content || [],
    totalElements: response.data.totalElements || 0,
    totalPages: response.data.totalPages || 0,
    size: response.data.size || size,
    number: response.data.number || page,
    first: response.data.first !== undefined ? response.data.first : page === 0,
    last: response.data.last !== undefined ? response.data.last : false
  };
};

export const getUserMediaPosts = async (
  userId: string,
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get(`/posts/user/${userId}/media`, {
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
      // Skip 'query' from filters since it's already passed as a separate parameter
      if (key !== 'query' && value !== undefined && value !== null) {
        // For postType, send the enum value directly
        if (key === 'postType') {
          params.append('postType', value.toString());
        } else {
          params.append(key, value.toString());
        }
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
  // Backend returns Page<CommentResponse>, need to map to CommentsResponse
  return {
    content: response.data.content || [],
    totalElements: response.data.totalElements || 0,
    totalPages: response.data.totalPages || 0,
    size: response.data.size || size,
    number: response.data.number || page,
    first: response.data.first !== undefined ? response.data.first : page === 0,
    last: response.data.last !== undefined ? response.data.last : false
  };
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

export const getBookmarkedPosts = async (
  page: number = 0,
  size: number = 20
): Promise<FeedResponse> => {
  const response = await api.get('/posts/bookmarks', {
    params: { page, size }
  });
  return response.data;
};

export const getPublicPost = async (postId: string): Promise<any> => {
  const response = await api.get(`/public/posts/${postId}`);
  return response.data;
};

export const getUserShareStats = async (
  userId: string
): Promise<{ sharesReceived: number }> => {
  const response = await api.get(`/posts/user/${userId}/share-stats`);
  return response.data;
};

// ========== MEDIA UPLOAD ==========

/**
 * Generate presigned URL for direct S3 upload (new approach - bypasses Nginx)
 */
export interface PresignedUploadRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
  folder: string;
}

export interface PresignedUploadResponse {
  presignedUrl: string;
  s3Key: string;
  fileUrl: string;
  expiresInSeconds: number;
}

export interface UploadCompletionRequest {
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
}

/**
 * Generate presigned URL for a single file upload
 */
export const generatePresignedUploadUrl = async (
  file: File,
  folder: string = 'posts'
): Promise<PresignedUploadResponse> => {
  const request: PresignedUploadRequest = {
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
    folder: folder
  };

  const response = await api.post<PresignedUploadResponse>(
    '/posts/generate-upload-url',
    request
  );

  return response.data;
};

/**
 * Upload file directly to S3 using presigned URL
 * 
 * CRITICAL: Only send headers that are included in the presigned URL signature.
 * S3 will reject the request with "forbidden" if headers don't match exactly.
 */
export const uploadFileToS3 = async (
  file: File,
  presignedUrl: string
): Promise<void> => {
  // CRITICAL: Only send Content-Type header (must match presigned URL signature)
  // Do NOT send any other headers - Safari/iOS will add headers automatically,
  // but we must only include what's in the presigned URL signature
  const contentType = file.type || 'application/octet-stream';
  
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType
    },
    // Don't include credentials - presigned URL handles authentication
    credentials: 'omit'
  });

  if (!response.ok) {
    // Get error details for debugging
    const errorText = await response.text().catch(() => 'No error details');
    console.error('S3 upload failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      contentType: contentType,
      fileName: file.name,
      fileSize: file.size
    });
    
    throw new Error(`Failed to upload file to S3: ${response.statusText} (${response.status})`);
  }
};

/**
 * Confirm upload completion to backend
 */
export const confirmUpload = async (
  request: UploadCompletionRequest
): Promise<{ fileUrl: string; success: boolean }> => {
  const response = await api.post<{ fileUrl: string; success: boolean }>(
    '/posts/confirm-upload',
    request
  );

  return response.data;
};

/**
 * Upload multiple files using presigned URLs (new approach)
 */
export const uploadMediaDirect = async (
  files: File[],
  folder: string = 'posts'
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    try {
      // Step 1: Get presigned URL
      const presignedResponse = await generatePresignedUploadUrl(file, folder);

      // Step 2: Upload directly to S3
      await uploadFileToS3(file, presignedResponse.presignedUrl);

      // Step 3: Confirm upload completion
      const completionResponse = await confirmUpload({
        s3Key: presignedResponse.s3Key,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      });

      uploadedUrls.push(completionResponse.fileUrl);
    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error);
      throw error;
    }
  }

  return uploadedUrls;
};

/**
 * Legacy endpoint - upload media through backend (kept for backward compatibility)
 * @deprecated Use uploadMediaDirect instead
 */
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

export const getMyWarnings = async (): Promise<{ warnings: any[]; warningCount: number; totalWarningCount: number }> => {
  const response = await api.get('/profile/me/warnings');
  return response.data;
};

export const getUserProfile = async (userId: string): Promise<any> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUserProfile = async (userId: string, profileData: ProfileUpdateRequest): Promise<any> => {
  const response = await api.put('/profile/me', profileData);
  return response.data;
};

/**
 * Upload profile picture using presigned URL (industry-standard approach)
 * 
 * This bypasses Nginx entirely by uploading directly to S3.
 * Works on all devices including iPhone, no file size limits from Nginx!
 * 
 * Flow: Frontend → Backend (get presigned URL) → S3 (direct upload) → Backend (confirm)
 */
export const uploadProfilePicture = async (file: File): Promise<string> => {
  console.log('📸 Uploading profile picture using presigned URL (bypasses Nginx)');
  console.log(`   File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.type}`);
  
  try {
    // Step 1: Get presigned URL from backend (goes through Nginx but tiny request)
    console.log('🔑 Step 1: Getting presigned URL from backend...');
    const presignedResponse = await generatePresignedUploadUrl(file, 'profile-pictures');
    console.log('✅ Got presigned URL:', presignedResponse.s3Key);
    
    // Step 2: Upload directly to S3 (bypasses Nginx completely!)
    console.log('☁️ Step 2: Uploading directly to S3...');
    await uploadFileToS3(file, presignedResponse.presignedUrl);
    console.log('✅ File uploaded to S3 successfully');
    
    // Step 3: Confirm upload completion to backend
    console.log('✔️ Step 3: Confirming upload with backend...');
    const confirmResponse = await confirmUpload({
      s3Key: presignedResponse.s3Key,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size
    });
    
    console.log('🎉 Profile picture upload complete!', confirmResponse.fileUrl);
    return confirmResponse.fileUrl;
    
  } catch (error: any) {
    console.error('❌ Profile picture upload failed:', error);
    throw error;
  }
};

/**
 * Upload banner image using presigned URL (industry-standard approach)
 * 
 * This is how Instagram, X.com, and other major platforms handle uploads:
 * - Bypasses Nginx completely (no file size limits!)
 * - Works on all devices including iPhone
 * - Uploads directly to S3 for better performance
 * 
 * Flow: Frontend → Backend (get presigned URL) → S3 (direct upload) → Backend (confirm)
 */
export const uploadBannerImage = async (file: File): Promise<string> => {
  console.log('🖼️ Uploading banner image using presigned URL (bypasses Nginx)');
  console.log(`   File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.type}`);
  
  try {
    // Step 1: Get presigned URL from backend (goes through Nginx but tiny request)
    console.log('🔑 Step 1: Getting presigned URL from backend...');
    const presignedResponse = await generatePresignedUploadUrl(file, 'banners');
    console.log('✅ Got presigned URL:', presignedResponse.s3Key);
    
    // Step 2: Upload directly to S3 (bypasses Nginx completely!)
    console.log('☁️ Step 2: Uploading directly to S3...');
    await uploadFileToS3(file, presignedResponse.presignedUrl);
    console.log('✅ File uploaded to S3 successfully');
    
    // Step 3: Confirm upload completion to backend
    console.log('✔️ Step 3: Confirming upload with backend...');
    const confirmResponse = await confirmUpload({
      s3Key: presignedResponse.s3Key,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size
    });
    
    console.log('🎉 Banner image upload complete!', confirmResponse.fileUrl);
    return confirmResponse.fileUrl;
    
  } catch (error: any) {
    console.error('❌ Banner image upload failed:', error);
    throw error;
  }
};

export const followUser = async (userId: string): Promise<void> => {
  await api.post(`/profile/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
  await api.delete(`/profile/users/${userId}/follow`);
};

export const getFollowStatus = async (userId: string): Promise<{ isFollowing: boolean }> => {
  const response = await api.get(`/profile/users/${userId}/follow-status`);
  return response.data;
};

export const getFollowers = async (userId: string, page: number = 0, size: number = 20): Promise<any> => {
  const response = await api.get(`/profile/users/${userId}/followers`, {
    params: { page, size }
  });
  return response.data;
};

export const getFollowing = async (userId: string, page: number = 0, size: number = 20): Promise<any> => {
  const response = await api.get(`/profile/users/${userId}/following`, {
    params: { page, size }
  });
  return response.data;
};

// Block/Unblock functions
export const blockUser = async (userId: string): Promise<void> => {
  await api.post(`/profile/users/${userId}/block`);
};

export const unblockUser = async (userId: string): Promise<void> => {
  await api.delete(`/profile/users/${userId}/block`);
};

export const getBlockStatus = async (userId: string): Promise<{ isBlocked: boolean }> => {
  const response = await api.get(`/profile/users/${userId}/block-status`);
  return response.data;
};

export const getBlockedUsers = async (page: number = 0, size: number = 20): Promise<any> => {
  const response = await api.get(`/profile/me/blocked`, {
    params: { page, size }
  });
  return response.data;
};

// Report content function
export const reportContent = async (
  contentType: string,
  contentId: string,
  reason: string,
  description?: string
): Promise<void> => {
  await api.post(`/admin/moderation/content/${contentType}/${contentId}/report`, {
    reason,
    description: description || ''
  });
};

// ========== ANALYTICS FUNCTIONS ==========

// Profile Analytics
export const recordProfileView = async (userId: string): Promise<void> => {
  await api.post(`/profile/users/${userId}/view`);
};

export const getProfileViews = async (page: number = 0, size: number = 20): Promise<any> => {
  const response = await api.get(`/profile/me/views`, {
    params: { page, size }
  });
  return response.data;
};

export const getFollowerGrowth = async (days: number = 30): Promise<any> => {
  const response = await api.get(`/profile/me/follower-growth`, {
    params: { days }
  });
  return response.data;
};

// Post Analytics
export const recordPostView = async (postId: string): Promise<void> => {
  await api.post(`/posts/${postId}/view`);
};

/**
 * Record multiple post impressions in a single batch request.
 * Fire-and-forget - does not await response for optimal performance.
 * Used by ImpressionTracker for high-volume, low-latency view counting.
 */
export const recordImpressions = (postIds: string[]): void => {
  if (postIds.length === 0) return;
  // Fire and forget - don't await, don't handle errors
  // This is intentional for performance - impression tracking shouldn't block UI
  api.post('/posts/impressions', { postIds }).catch(() => {
    // Silently ignore errors - impression tracking is non-critical
  });
};

export const getPostAnalytics = async (postId: string): Promise<any> => {
  const response = await api.get(`/posts/${postId}/analytics`);
  return response.data;
};

// Comment Read Status
export const getNewCommentCount = async (postId: string): Promise<number> => {
  const response = await api.get(`/posts/${postId}/new-comments-count`);
  return response.data;
};

export const markCommentsAsRead = async (postId: string): Promise<void> => {
  await api.post(`/posts/${postId}/mark-comments-read`);
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