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

import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and handle FormData
api.interceptors.request.use(
  async (config) => {
    // Get valid access token (will refresh if needed)
    const { tokenService } = await import('./tokenService');
    const token = await tokenService.getValidAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL: If body is FormData, delete Content-Type header
    // Browser must set it automatically with boundary for multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with automatic token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Prevent infinite retry loop

      try {
        // Attempt to refresh token
        const { tokenService } = await import('./tokenService');
        const refreshed = await tokenService.refreshTokenSilently();
        
        if (refreshed?.token) {
          // Update authorization header with new token
          originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
          
          // Retry the original request
          return api(originalRequest);
        } else {
          // Refresh failed - redirect to login
          throw error;
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Prayer Request API endpoints
export const prayerAPI = {
  // Create a new prayer request
  createPrayerRequest: (data: PrayerRequestCreateRequest) =>
    api.post<PrayerRequest>('/prayers', data),

  // Create a new prayer request with image
  createPrayerRequestWithImage: (data: PrayerRequestCreateRequest, imageFile?: File) => {
    // Validate file before creating FormData
    if (imageFile) {
      if (!(imageFile instanceof File)) {
        console.error('❌ imageFile is not a File object:', imageFile);
        throw new Error('Invalid image file object');
      }
      if (imageFile.size === 0) {
        console.error('❌ imageFile has zero size');
        throw new Error('Image file is empty');
      }
      console.log('📦 Creating FormData with image:', {
        fileName: imageFile.name,
        fileSize: (imageFile.size / 1024 / 1024).toFixed(2) + 'MB',
        fileType: imageFile.type,
        isFile: imageFile instanceof File,
        constructor: imageFile.constructor.name
      });
    }
    
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.isAnonymous !== undefined) {
      formData.append('isAnonymous', data.isAnonymous.toString());
    }
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.organizationId) {
      formData.append('organizationId', data.organizationId);
    }
    if (imageFile) {
      formData.append('image', imageFile);
      // Verify it was appended
      const hasImage = formData.has('image');
      console.log('✅ Image appended to FormData:', hasImage);
    }
    
    console.log('📤 Sending multipart request to /prayers/with-image');
    return api.post<PrayerRequest>('/prayers/with-image', formData, {
      // CRITICAL: Do NOT set Content-Type manually - browser must set it with boundary
      // The request interceptor will automatically delete Content-Type for FormData
      // The browser will automatically set: multipart/form-data; boundary=----WebKitFormBoundary...
      timeout: 90000 // 90 second timeout for file uploads (mobile networks can be slow)
    });
  },

  // Get a single prayer request by ID
  getPrayerRequest: (id: string) =>
    api.get<PrayerRequest>(`/prayers/${id}`),

  // Update a prayer request
  updatePrayerRequest: (id: string, data: PrayerRequestUpdateRequest) =>
    api.put<PrayerRequest>(`/prayers/${id}`, data),

  // Update a prayer request with image
  updatePrayerRequestWithImage: (id: string, data: PrayerRequestUpdateRequest, imageFile?: File) => {
    const formData = new FormData();
    if (data.title) {
      formData.append('title', data.title);
    }
    if (data.description !== undefined) {
      formData.append('description', data.description || '');
    }
    if (data.isAnonymous !== undefined) {
      formData.append('isAnonymous', data.isAnonymous.toString());
    }
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.status) {
      formData.append('status', data.status);
    }
    if (data.imageUrl !== undefined) {
      formData.append('imageUrl', data.imageUrl || '');
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return api.put<PrayerRequest>(`/prayers/${id}/with-image`, formData, {
      // CRITICAL: Do NOT set Content-Type manually - browser must set it with boundary
      // The request interceptor will automatically delete Content-Type for FormData
      // The browser will automatically set: multipart/form-data; boundary=----WebKitFormBoundary...
      timeout: 90000 // 90 second timeout for file uploads (mobile networks can be slow)
    });
  },

  // Delete a prayer request
  deletePrayerRequest: (id: string) =>
    api.delete(`/prayers/${id}`),

  // Get all prayer requests (paginated)
  getAllPrayerRequests: (page: number = 0, size: number = 20, organizationId?: string) =>
    api.get<PrayerListResponse>('/prayers', {
      params: { page, size, organizationId }
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

  // Get active prayers for prayer sheet
  getPrayerSheet: () =>
    api.get<PrayerRequest[]>('/prayers/sheet'),
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