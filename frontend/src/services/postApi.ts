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
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    size: size.toString(),
    ...filters
  });

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
