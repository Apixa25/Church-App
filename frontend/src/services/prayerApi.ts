import axios from 'axios';
import {
  PrayerRequest,
  PrayerRequestCreateRequest,
  PrayerRequestUpdateRequest,
  PrayerListResponse,
  PrayerInteractionListResponse,
  PrayerStats,
  PrayerCategory,
  PrayerStatus,
  PrayerInteraction,
  PrayerInteractionCreateRequest,
  PrayerInteractionSummary
} from '../types/Prayer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Prayer Request API endpoints
export const prayerAPI = {
  // Create a new prayer request
  createPrayerRequest: (data: PrayerRequestCreateRequest) =>
    api.post<PrayerRequest>('/prayers', data),

  // Get a single prayer request by ID
  getPrayerRequest: (id: string) =>
    api.get<PrayerRequest>(`/prayers/${id}`),

  // Update a prayer request
  updatePrayerRequest: (id: string, data: PrayerRequestUpdateRequest) =>
    api.put<PrayerRequest>(`/prayers/${id}`, data),

  // Delete a prayer request
  deletePrayerRequest: (id: string) =>
    api.delete(`/prayers/${id}`),

  // Get all prayer requests (paginated)
  getAllPrayerRequests: (page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>('/prayers', {
      params: { page, size }
    }),

  // Get my prayer requests
  getMyPrayerRequests: () =>
    api.get<PrayerRequest[]>('/prayers/my-prayers'),

  // Get prayer requests by category
  getPrayerRequestsByCategory: (category: PrayerCategory, page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>(`/prayers/category/${category}`, {
      params: { page, size }
    }),

  // Get prayer requests by status
  getPrayerRequestsByStatus: (status: PrayerStatus, page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>(`/prayers/status/${status}`, {
      params: { page, size }
    }),

  // Search prayer requests
  searchPrayerRequests: (query: string, page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>('/prayers/search', {
      params: { query, page, size }
    }),

  // Get available categories
  getPrayerCategories: () =>
    api.get<PrayerCategory[]>('/prayers/categories'),

  // Get available statuses
  getPrayerStatuses: () =>
    api.get<PrayerStatus[]>('/prayers/statuses'),

  // Get prayer statistics
  getPrayerStats: () =>
    api.get<PrayerStats>('/prayers/stats'),
};

// Prayer Interaction API endpoints
export const prayerInteractionAPI = {
  // Create a new interaction (reaction or comment)
  createInteraction: (data: PrayerInteractionCreateRequest) =>
    api.post<PrayerInteraction | { message: string; action: string }>('/prayer-interactions', data),

  // Delete an interaction
  deleteInteraction: (id: string) =>
    api.delete(`/prayer-interactions/${id}`),

  // Get all interactions for a prayer request
  getInteractionsByPrayer: (prayerRequestId: string, page?: number, size?: number) => {
    const params = page !== undefined && size !== undefined ? { page, size } : {};
    return api.get<PrayerInteraction[] | PrayerListResponse>(`/prayer-interactions/prayer/${prayerRequestId}`, {
      params
    });
  },

  // Get only comments for a prayer request
  getCommentsByPrayer: (prayerRequestId: string, page?: number, size?: number) => {
    const params = page !== undefined && size !== undefined ? { page, size } : {};
    return api.get<PrayerInteraction[] | PrayerInteractionListResponse>(`/prayer-interactions/prayer/${prayerRequestId}/comments`, {
      params
    });
  },

  // Get only reactions for a prayer request
  getReactionsByPrayer: (prayerRequestId: string) =>
    api.get<PrayerInteraction[]>(`/prayer-interactions/prayer/${prayerRequestId}/reactions`),

  // Get interaction summary for a prayer request
  getInteractionSummary: (prayerRequestId: string) =>
    api.get<PrayerInteractionSummary>(`/prayer-interactions/prayer/${prayerRequestId}/summary`),

  // Get my interactions
  getMyInteractions: () =>
    api.get<PrayerInteraction[]>('/prayer-interactions/my-interactions'),

  // Check if user has interacted with a prayer in a specific way
  checkUserInteraction: (prayerRequestId: string, type: string) =>
    api.get<{ hasInteracted: boolean; type: string; prayerRequestId: string }>(`/prayer-interactions/check-interaction/${prayerRequestId}/${type}`),

  // Get available interaction types
  getInteractionTypes: () =>
    api.get<string[]>('/prayer-interactions/types'),

  // Get recent interactions (for dashboard)
  getRecentInteractions: (limit: number = 10) =>
    api.get<PrayerInteraction[]>('/prayer-interactions/recent', {
      params: { limit }
    }),
};

// Utility functions for API responses
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isApiResponse = <T>(response: any): response is { data: T } => {
  return response && typeof response === 'object' && 'data' in response;
};